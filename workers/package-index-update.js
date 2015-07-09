'use strict';

module.exports = function (config, callback) {

    var Promise = require('bluebird'),
        fs = require('fs'),
        mongoose = require('mongoose'),
        path = require('path'),
        packageIndex = require('../lib/util/package-index'),
        hdf5 = require('hdf5').hdf5,
        Access = require('hdf5/lib/globals').Access,
        hdf5Access = require('../lib/hdf5/access-metadata');

    var dburl = 'mongodb://' +
        config.mongodb.host + ':' +
        config.mongodb.port + '/' +
        config.mongodb.dbname;

    mongoose.connect(dburl);
    mongoose.model('PackageIndex', require('../models/mongoose/package-index').PackageIndex);

    Error.stackTraceLimit = 25;
    Promise.longStackTraces();

    Promise.promisifyAll(fs);
    Promise.promisifyAll(packageIndex);
    Promise.promisifyAll(hdf5Access);

    fs.readdirAsync(config.hdf5.storage_path)
        .map(function (entry) {
            var filePath = path.join(config.hdf5.storage_path, entry),
                package_uuid = path.basename(filePath, '.h5'),
                indexEntry, fileStats, file;
            return packageIndex.queryIndexAsync(package_uuid)
                .then(function (index) {
                    indexEntry = index;
                    return fs.statAsync(filePath);
                })
                .then(function (stats) {
                    fileStats = stats;
                    if (!indexEntry || indexEntry.updated !== stats.mtime.getTime()) {
                        return true;
                    }
                    return false;
                })
                .then(function (needsUpdate) {
                    if (needsUpdate) {
                        console.log('updating index for package uuid', package_uuid);
                        file = new hdf5.File(filePath, Access.ACC_RDONLY);
                        var metaGroup = file.openGroup('__piecemeta');
                        var data = hdf5Access.fetchGroup(metaGroup);
                        delete data.hdf5;
                        return packageIndex.addToIndexAsync(package_uuid, data, fileStats);
                    } else {
                        return false;
                    }
                })
                .then(function (needsUpdate) {
                    if (needsUpdate) {
                        return hdf5Access.getGroupsAsync(file)
                            .map(function (group) {
                                if (group.hdf5.label === '__piecemeta') {
                                    return;
                                }
                                delete group.hdf5;
                                group.package_uuid = package_uuid;
                                return packageIndex.addToIndexAsync(group.uuid, group, fileStats);
                            })
                            .then(function () {
                                file.close();
                            });
                    } else {
                        if (file) {
                            file.close();
                        }
                    }
                })
                .catch(function (err) {
                    console.log('package indexer error', err.stack);
                    return err;
                });
        })
        .then(function () {
            callback(null);
        })
        .catch(function (err) {
            callback(err);
        });
};
