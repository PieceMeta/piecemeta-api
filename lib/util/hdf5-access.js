(function () {
    'use strict';

    var hdf5 = require('hdf5').hdf5;

    var H5OType = require('hdf5/lib/globals').H5OType;
    var HLType = require('hdf5/lib/globals').HLType;

    var Promise = require('bluebird');
    var co = require('co');

    module.exports.getTree = function (file, callback) {
        var members = file.getMemberNamesByCreationOrder();
        Promise.map(members, function (member) {
            var childType = file.getChildType(member);
            var resultObject = {};
            switch (childType) {
                case H5OType.H5O_TYPE_GROUP:
                    var subgroup = file.openGroup(member);
                    resultObject.hdf5_id = subgroup.id;
                    resultObject.type = 'group';
                    resultObject.title = member;
                    var branch = module.exports.loadRecursiveGroup(subgroup);
                    resultObject.children = branch;
                    subgroup.close();
                    break;
                case H5OType.H5O_TYPE_DATASET:
                    var datasetType = file.getDatasetType(member);
                    resultObject.title = member;
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
                    resultObject.title = member;
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
                    var groupObject = {};
                    var child = group.openGroup(members[i]);
                    child.refresh();
                    var a_attrs = [];
                    for (var property in child) {
                        if (child.hasOwnProperty(property) && property !== "id") {
                            a_attrs.push(child[property]);
                        }
                    }
                    a_attrs = a_attrs.substring(0, a_attrs.length - 2);
                    groupObject.title = members[i];
                    groupObject.type = 'group';
                    if (child.getNumObjs() > 0) {
                        groupObject.children = module.exports.loadRecursiveGroup(child);
                        groupObject.data = a_attrs;
                    }
                    child.close();
                    groupResult.push(groupObject);
                    break;
                case H5OType.H5O_TYPE_DATASET:
                    var datasetObject = {
                        title: members[i]
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
                    groupResult.push(members[i]);
                    console.dir(childType + " child default for " + members[i]);
                    break;
            }
        }
        return groupResult;
    };

})();