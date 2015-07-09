'use strict';

var Promise = require('bluebird'),
    fs = require('fs'),
    workerQueue = require('../../lib/worker-queue'),
    packageIndex = require('../../lib/util/package-index'),
    hdf5Access = require('../../lib/hdf5/access-metadata'),
    path = require('path'),
    hdf5 = require('hdf5').hdf5,
    h5tb = require('hdf5').h5tb,
    Access = require('hdf5/lib/globals').Access;

var StreamSchema = {
    uuid: {required: true, internal: true},
    user_uuid: { required: true, internal: true },
    channel_uuid: {required: true, internal: true},
    dimensions: {required: true, internal: true },
    title: { required: true },
    description: {},
    fps: { required: true }
};

Error.stackTraceLimit = 25;
Promise.longStackTraces();
Promise.promisifyAll(fs);
Promise.promisifyAll(packageIndex);
Promise.promisifyAll(hdf5Access);

module.exports = function (config) {
    return {
        find: function (query, callback) {
            packageIndex.queryIndexAsync(query.channel_uuid)
                .then(function (details) {
                    if (!details) {
                        return [];
                    }
                    var filePath = path.join(config.hdf5.storage_path, details.metadata.package_uuid + '.h5'),
                        file = new hdf5.File(filePath, Access.ACC_RDWR);
                    var group = file.openGroup(query.channel_uuid);
                    hdf5Access.getTablesAsync(group);
                })
                .then(function (tables) {
                    callback(null, tables);
                })
                .catch(function (err) {
                    console.error(err.stack);
                    callback(err, null);
                });
        },
        get: function (uuid, callback) {
            packageIndex.queryIndexAsync(uuid)
                .then(function (details) {
                    if (!details) {
                        return null;
                    }
                    var filePath = path.join(config.hdf5.storage_path, details.metadata.package_uuid + '.h5'),
                        file = new hdf5.File(filePath, Access.ACC_RDWR);
                    var group = hdf5Access.fetchGroup(file.openGroup(uuid));
                    file.close();
                    delete group.hdf5;
                    return group;
                })
                .then(function (table) {
                    callback(null, table);
                })
                .catch(function (err) {
                    console.error(err.stack);
                    callback(err, null);
                });
        },
        create: function (data, callback) {
            packageIndex.queryIndexAsync(data.channel_uuid)
                .then(function (details) {
                    var filePath = path.join(config.hdf5.storage_path, details.metadata.package_uuid + '.h5'),
                        file = new hdf5.File(filePath, Access.ACC_RDWR);
                    data.uuid = require('../../lib/util/uuid').v4();
                    var group = file.openGroup(data.channel_uuid);
                    for (var key in data) {
                        if (typeof data[key] === 'string' && StreamSchema.hasOwnProperty(key) && !StreamSchema[key].internal) {
                            group[key] = data[key];
                        }
                    }
                    var dataset = new Array(1);
                    var table = new Array(data.dimensions.length);
                    for (var n = 0; n < data.dimensions.length; n += 1) {
                        var framecount = data.dimensions[n].frames.length;
                        var dataArray = new Float64Array(framecount);
                        dataArray.name = data.dimensions[n].title;
                        for (var f = 0; f < framecount; f += 1) {
                            dataArray[f] = data.dimensions[n].frames[f];
                        }
                        table[n] = dataArray;
                    }
                    dataset[0] = table;
                    h5tb.makeTable(group.id, data.uuid, dataset);
                    group.flush();
                    group.close();
                    file.close();
                    return fs.statAsync(filePath);
                })
                .then(function (fileStats) {
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
        update: function (uuid, callback) {
            callback(null, {});
        },
        remove: function (uuid, callback) {
            packageIndex.removeFromIndex(uuid, callback);
        }
    };
};