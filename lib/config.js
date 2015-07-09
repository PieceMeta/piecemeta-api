'use strict';

module.exports.get = null;

module.exports.load = function (callback) {
    loadDataFile(function (err, data) {
        module.exports.get = data;
        callback(err);
    });
};

function loadDataFile(callback) {
    var fs = require('fs'),
        path = require('path');
    fs.readFile(path.join(__dirname, '..', 'config.json'), function (err, data) {
        callback(err && err.code !== 'ENOENT' ? err : null, data ? JSON.parse(data) : null);
    });
}
