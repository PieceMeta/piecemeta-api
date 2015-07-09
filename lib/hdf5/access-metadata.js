'use strict';

var Promise = require('bluebird'),
    H5OType = require('hdf5/lib/globals').H5OType,
    HLType = require('hdf5/lib/globals').HLType;

module.exports.getTree = function (file, callback) {
    var members = file.getMemberNamesByCreationOrder();
    Promise.map(members, function (member) {
        var childType = file.getChildType(member);
        var resultObject = {};
        switch (childType) {
            case H5OType.H5O_TYPE_GROUP:
                resultObject = module.exports.fetchGroup(file.openGroup(member));
                resultObject.hdf5.label = member;
                break;
            case H5OType.H5O_TYPE_DATASET:
                var datasetType = file.getDatasetType(member);
                resultObject.hdf5 = {
                    label: member
                };
                switch (datasetType) {
                    case HLType.HL_TYPE_LITE:
                        resultObject.type = 'dataset';
                        break;
                    case HLType.HL_TYPE_IMAGE:
                        resultObject.type = 'image';
                        break;
                    case HLType.HL_TYPE_TABLE:
                        resultObject.type = 'table';
                        break;
                    case HLType.HL_TYPE_PACKET_TABLE:
                        resultObject.type = 'packets';
                        break;
                    case HLType.HL_TYPE_TEXT:
                        resultObject.type = 'text';
                        break;
                    default:
                        resultObject.type = 'dataset';
                        break;
                }
                break;
            default:
                resultObject.hdf5 = {
                    label: member
                };
                break;
        }
        return resultObject;
    }).then(function (results) {
        callback(null, results);
    }).catch(function (e) {
        console.log(e.stack);
        callback(new Error(e.message), null);
    });
};

module.exports.getGroups = function (parent, callback) {
    module.exports.getAllForGroupByType(parent, H5OType.H5O_TYPE_GROUP, callback);
};

module.exports.getTables = function (parent, callback) {
    module.exports.getAllForGroupByType(parent, H5OType.H5O_TYPE_DATASET, callback);
};

module.exports.getAllForGroupByType = function (parent, type, callback) {
    var members = parent.getMemberNamesByCreationOrder();
    Promise.map(members, function (member) {
        var childType = parent.getChildType(member);
        var resultObject = {};
        switch (childType) {
            case type:
                resultObject = module.exports.fetchGroup(parent.openGroup(member));
                resultObject.hdf5.label = member;
                break;
        }
        return resultObject;
    }).then(function (results) {
        callback(null, results);
    }).catch(function (e) {
        console.log(e.stack);
        callback(new Error(e.message), null);
    });
};

module.exports.loadRecursiveGroup = function (group) {
    var groupResult = [];
    var members = group.getMemberNamesByCreationOrder();
    for (var i = 0; i < members.length; i++) {
        var childType = group.getChildType(members[i]);
        switch (childType) {
            case H5OType.H5O_TYPE_GROUP:
                var groupObject = module.exports.fetchGroup(group.openGroup(members[i]));
                groupObject.hdf5.label = members[i];
                groupResult.push(groupObject);
                break;
            case H5OType.H5O_TYPE_DATASET:
                var datasetObject = {
                    hdf5: {
                        label: members[i]
                    }
                };
                var datasetType = group.getDatasetType(members[i]);
                switch (datasetType) {
                    case HLType.HL_TYPE_LITE:
                        datasetObject.type = 'dataset';
                        break;
                    case HLType.HL_TYPE_IMAGE:
                        datasetObject.type = 'image';
                        break;
                    case HLType.HL_TYPE_TABLE:
                        datasetObject.type = 'table';
                        break;
                    case HLType.HL_TYPE_PACKET_TABLE:
                        datasetObject.type = 'packets';
                        break;
                    case HLType.HL_TYPE_TEXT:
                        datasetObject.type = 'text';
                        break;
                    default:
                        datasetObject.type = 'dataset';
                        break;
                }
                groupResult.push(datasetObject);
                break;
            default:
                groupResult.push({
                    hdf5: {
                        label: members[i]
                    }
                });
                console.log(childType + " child default for " + members[i]);
                break;
        }
    }
    return groupResult;
};

module.exports.fetchGroup = function (group) {
    var groupObject = {};
    group.refresh();
    for (var property in group) {
        if (group.hasOwnProperty(property) && property !== "id") {
            groupObject[property] = group[property];
        }
    }
    if (!groupObject.hasOwnProperty('hdf5')) {
        groupObject.hdf5 = {};
    }
    groupObject.hdf5.id = group.id;
    groupObject.hdf5.type = 'group';
    if (group.getNumObjs() > 0) {
        groupObject.children = module.exports.loadRecursiveGroup(group);
    }
    group.close();
    return groupObject;
};
