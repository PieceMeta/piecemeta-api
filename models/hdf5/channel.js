'use strict';

var Promise = require('bluebird'),
    fileManager = require('../../lib/hdf5/file-manager'),
    workerQueue = require('../../lib/worker-queue'),
    packageIndex = require('../../lib/util/package-index'),
    path = require('path'),
    fs = require('fs'),
    hdf5 = require('hdf5').hdf5,
    Access = require('hdf5/lib/globals').Access;

var ChannelSchema = {
    uuid: { required: true, internal: true },
    package_uuid: { required: true, internal: true },
    user_uuid: { required: true, internal: true },
    title: { required: true },
    description: { },
    parent_channel_uuid: { required: true, internal: true }
};

Error.stackTraceLimit = 25;
Promise.longStackTraces();
Promise.promisifyAll(packageIndex);
Promise.promisifyAll(fs);

module.exports = function (config) {
    return {
        find: function (query, callback) {
            var filterAsync = Promise.promisify(fileManager(config.hdf5.storage_path).filter);
            var hdf5Access = require('../../lib/hdf5/access-metadata');
            var getGroupsAsync = Promise.promisify(hdf5Access.getGroups);
            filterAsync(query)
                .map(function (entry) {
                    var filePath = path.join(config.hdf5.storage_path, entry),
                        file = new hdf5.File(filePath, Access.ACC_RDWR);
                    return getGroupsAsync(file)
                        .then(function (groups) {
                            file.close();
                            var result = [];
                            for (var i = 0; i < groups.length; i += 1) {
                                if (groups[i].hasOwnProperty('hdf5')) {
                                    if (groups[i].hdf5.label !== '__piecemeta') {
                                        delete groups[i].hdf5;
                                        result.push(groups[i]);
                                    }
                                }
                            }
                            return result;
                        });
                })
                .then(function (data) {
                    if (data.length === 1) {
                        data = data[0];
                    }
                    callback(null, data);
                })
                .catch(function (err) {
                    console.error(err.stack);
                    callback(err, null);
                });
        },
        get: function (uuid, callback) {
            var filterAsync = Promise.promisify(fileManager(config.hdf5.storage_path).filter);
            var hdf5Access = require('../../lib/hdf5/access-metadata');
            var package_uuid;
            packageIndex.queryIndexAsync(uuid)
                .then(function (details) {
                    if (!details) {
                        return null;
                    }
                    package_uuid = details.metadata.package_uuid;
                    return filterAsync({uuid: package_uuid});
                })
                .then(function (results) {
                    if (!results || results.length > 1) {
                        return callback(null, null);
                    }
                    var filePath = path.join(config.hdf5.storage_path, results[0]),
                        file = new hdf5.File(filePath, Access.ACC_RDWR);
                    var group = hdf5Access.fetchGroup(file.openGroup(uuid));
                    file.close();
                    delete group.hdf5;
                    callback(null, group);
                })
                .catch(function (err) {
                    console.error(err.stack);
                    callback(err, null);
                });
        },
        create: function (data, callback) {
            Promise.resolve()
                .then(function () {
                    var filePath = path.join(config.hdf5.storage_path, data.package_uuid + '.h5'),
                        file = new hdf5.File(filePath, Access.ACC_RDWR);
                    data.uuid = require('../../lib/util/uuid').v4();
                    var group = file.createGroup(data.uuid);
                    for (var key in data) {
                        if (typeof data[key] === 'string' && ChannelSchema.hasOwnProperty(key) && !ChannelSchema[key].internal) {
                            group[key] = data[key];
                        }
                    }
                    group.uuid = data.uuid;
                    group.package_uuid = data.package_uuid;
                    group.contributor_uuid = data.contributor_uuid;
                    group.flush();
                    group.close();
                    file.close();
                    return fs.statAsync(filePath);
                })
                .then(function (fileStats) {
                    console.log('create channel', data);
                    return packageIndex.addToIndexAsync(data.uuid, data, fileStats);
                })
                .then(function () {
                    workerQueue.updatePackageIndex(config);
                    callback(null, data);
                })
                .catch(function (err) {
                    console.error(err.stack);
                    callback(err, null);
                });
        },
        update: function (uuid, data, callback) {
            var package_uuid;
            packageIndex.queryIndexAsync(uuid)
                .then(function (details) {
                    package_uuid = details.metadata.package_uuid;
                    return;
                })
                .then(function () {
                    var filePath = path.join(config.hdf5.storage_path, package_uuid + '.h5'),
                        file = new hdf5.File(filePath, Access.ACC_RDWR);
                    var group = file.openGroup(uuid);
                    for (var key in data) {
                        if (typeof data[key] === 'string' && ChannelSchema.hasOwnProperty(key) && !ChannelSchema[key].internal) {
                            group[key] = data[key];
                        }
                    }
                    group.flush();
                    group.close();
                    file.close();
                    return fs.statAsync(filePath);
                })
                .then(function (fileStats) {
                    return packageIndex.addToIndexAsync(uuid, data, fileStats);
                })
                .then(function () {
                    workerQueue.updatePackageIndex(config);
                    callback(null, data);
                })
                .catch(function (err) {
                    console.error(err.stack);
                    callback(err, null);
                });
        },
        remove: function (uuid, callback) {
            var package_uuid;
            packageIndex.queryIndexAsync(uuid)
                .then(function (details) {
                    package_uuid = details.metadata.package_uuid;
                    return;
                })
                .then(function () {
                    var filePath = path.join(config.hdf5.storage_path, package_uuid + '.h5'),
                        file = new hdf5.File(filePath, Access.ACC_RDWR);
                    var group = file.openGroup(uuid);
                    group.delete(uuid);
                    group.close();
                    file.close();
                    return packageIndex.queryIndexAsync(uuid);
                })
                .catch(function (err) {
                    console.error(err.stack);
                    callback(err, null);
                });
        }
    };
};
