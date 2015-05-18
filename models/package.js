(function () {
    'use strict';

    var async = require('async'),
        Promise = require('bluebird');

    var metaData = {

        uuid: {type: String, unique: true},
        namespace: {type: String, required: true},
        user_uuid: {type: String, index: true, required: true},
        title: {type: String, required: true},
        description: {type: String},

        created: Date,
        updated: Date

    };

    var Access = require('hdf5/lib/globals').Access;

    module.exports = function (config) {
        return {
            find: function (uuid, callback) {
                var fs = require('fs'),
                    path = require('path'),
                    hdf5 = require('hdf5').hdf5;
                fs.existsAsync(path.join(config.storage_path, uuid + '.hdf'))
                    .then(function (exists) {
                        if (!exists) {
                            throw new Error('Storage dir not found');
                        }
                    })
                    .then(function () {
                        return new hdf5.File(path.join(config.get.hdf5.storage_path, uuid + '.hdf'), Access.ACC_RDONLY);
                    })
                    .then(function (file) {
                        return file.getMemberNamesByCreationOrder();
                    })
                    .then(function (result) {
                        callback(null, result);
                    })
                    .catch(function (err) {
                        callback(err, null);
                    });
            },
            create: function (uuid, callback) {

            },
            update: function (uuid, callback) {

            },
            remove: function (uuid, callback) {

            }
        };
    };
}());