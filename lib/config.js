'use strict';

var Promise = require('bluebird');

module.exports.get = null;

module.exports.load = function () {
    var fs = require('fs'),
        path = require('path'),
        filePath = path.join(__dirname, '..', 'config.json');
    return Promise.promisify(fs.readFile)(filePath)
        .then(function (data) {
            module.exports.get = JSON.parse(data);
        })
        .catch(function (err) {
            console.error(`Unable to load config file at ${filePath}, error: ${err.message}`);
        });
};
