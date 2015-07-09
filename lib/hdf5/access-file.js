'use strict';

var hdf5 = require('hdf5').hdf5,
    path = require('path'),
    Promise = require('bluebird');

var currentFiles = {};

module.exports.createHandle = function (filePath, type, config, callback) {
    var fullpath = path.resolve(filePath),
        basename = path.basename(filePath, '.h5');
    if (currentFiles.hasOwnProperty(basename)) {
        if (currentFiles[basename].type === type) {
            currentFiles[basename].count += 1;
            callback(null, currentFiles[basename].handle);
        } else {
            console.log('requested different access type', fullpath, basename, type, currentFiles[basename]);
            callback(new Error('hdf5 file: unable to obtain handle'), null);
        }
    } else {
        Promise.resolve()
            .then(function () {
                return new hdf5.File(fullpath, type);
            })
            .then(function (file) {
                currentFiles[basename] = {
                    count: 1,
                    handle: file,
                    type: type
                };
                callback(null, file);
            })
            .catch(function (err) {
                callback(err, null);
            });
    }
};

module.exports.closeHandle = function (filePath) {
    var basename = path.basename(filePath, '.h5');
    if (currentFiles[basename]) {
        currentFiles[basename].count -= 1;
        if (currentFiles[basename].count < 1) {
            delete currentFiles[basename];
        }
        return null;
    } else {
        return new Error('tried to close non existing handle for ' + basename);
    }
};
