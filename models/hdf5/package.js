'use strict';

var Promise = require('bluebird'),
    fileManager = require('../../lib/hdf5/file-manager'),
    packageIndex = require('../../lib/util/package-index'),
    hdf5File = require('../../lib/hdf5/access-file'),
    workerQueue = require('../../lib/worker-queue'),
    path = require('path'),
    fs = require('fs-extra'),
    hdf5 = require('hdf5').hdf5,
    Access = require('hdf5/lib/globals').Access;

var PackageSchema = {
    uuid: { required: true, internal: true },
    user_uuid: { required: true, internal: true },
    title: { required: true },
    description: { }
};

Error.stackTraceLimit = 25;
Promise.longStackTraces();
Promise.promisifyAll(fs);
Promise.promisifyAll(hdf5File);
Promise.promisifyAll(packageIndex);

module.exports = function (config) {
    return {
        find: function (query, callback) {
            var filterAsync = Promise.promisify(fileManager(config.hdf5.storage_path).filter);
            var hdf5Access = require('../../lib/hdf5/access-metadata');
            filterAsync(query)
                .map(function (entry) {
                    var filePath = path.join(config.hdf5.storage_path, entry),
                        file = new hdf5.File(filePath, Access.ACC_RDWR);
                    var metaGroup = file.openGroup('__piecemeta');
                    var data = hdf5Access.fetchGroup(metaGroup);
                    delete data.hdf5;
                    return data;
                })
                .then(function (data) {
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
            filterAsync({uuid: uuid})
                .then(function (results) {
                    if (!results || results.length > 1) {
                        return callback(null, null);
                    }
                    var filePath = path.join(config.hdf5.storage_path, results[0]),
                        file = new hdf5.File(filePath, Access.ACC_RDWR);
                    var metaGroup = file.openGroup('__piecemeta');
                    var data = hdf5Access.fetchGroup(metaGroup);
                    file.close();
                    delete data.hdf5;
                    callback(null, data);
                })
                .catch(function (err) {
                    console.error(err.stack);
                    callback(err, null);
                });
        },
        create: function (data, callback) {
            var uuid = require('../../lib/util/uuid').v4(),
                filePath = path.join(config.hdf5.storage_path, uuid + '.h5');
            Promise.resolve()
                .then(function () {
                    data.uuid = uuid;
                    var file = new hdf5.File(filePath, Access.ACC_EXCL);
                    var metaGroup = file.createGroup('__piecemeta');
                    for (var key in data) {
                        if (typeof data[key] === 'string' && PackageSchema.hasOwnProperty(key) && !PackageSchema[key].internal) {
                            metaGroup[key] = data[key];
                        }
                    }
                    metaGroup.uuid = data.uuid;
                    metaGroup.contributor_uuid = data.contributor_uuid;
                    metaGroup.flush();
                    metaGroup.close();
                    file.close();
                    return fs.statAsync(filePath);
                })
                .then(function (fileStats) {
                    return packageIndex.addToIndexAsync(uuid, data, fileStats);
                })
                .then(function () {
                    callback(null, data);
                })
                .catch(function (err) {
                    console.log(err.stack);
                    callback(err, null);
                });
        },
        update: function (uuid, data, callback) {
            var filePath = path.join(config.hdf5.storage_path, uuid + '.h5');
            Promise.resolve()
                .then(function () {
                    var file = new hdf5.File(filePath, Access.ACC_RDWR);
                    var metaGroup = file.openGroup('__piecemeta');
                    for (var key in data) {
                        if (typeof data[key] === 'string' && PackageSchema.hasOwnProperty(key) && !PackageSchema[key].internal) {
                            metaGroup[key] = data[key];
                        }
                    }
                    metaGroup.flush();
                    metaGroup.close();
                    file.close();
                    return fs.statAsync(filePath);
                })
                .then(function (fileStats) {
                    return packageIndex.addToIndexAsync(uuid, data, fileStats);
                })
                .then(function () {
                    callback(null, data);
                })
                .catch(function (err) {
                    console.log(err.stack);
                    callback(err, null);
                });
        },
        remove: function (uuid, callback) {
            var filePath = path.join(config.hdf5.storage_path, uuid + '.h5');
            fs.removeAsync(filePath)
                .then(function () {
                    return packageIndex.removeFromIndexAsync(uuid);
                })
                .then(function () {
                    workerQueue.updatePackageIndex(config);
                    callback(null);
                })
                .catch(function (err) {
                    callback(err);
                });
        }
    };
};
