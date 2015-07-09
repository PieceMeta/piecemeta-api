
'use strict';

var fs = require('fs-extra'),
    path = require('path'),
    Promise = require('bluebird');

Promise.promisifyAll(fs);

module.exports = function (dbPath) {
    return {
        init: function (callback) {
            return Promise.promisify(fs.ensureDir)(path.resolve(dbPath))
                .then(function () {
                    if (typeof callback === 'function') {
                        callback(null);
                    } else {
                        return;
                    }
                })
                .catch(function (err) {
                    if (typeof callback === 'function') {
                        callback(err);
                    } else {
                        throw err;
                    }
                });
        },
        filter: function (query, callback) {
            return readDir(path.resolve(dbPath), '.h5')
                .then(function (entries) {
                    var results = [];
                    for (var i = 0; i < entries.length; i += 1) {
                        var found = typeof query !== 'object' || Object.keys(query).length === 0;
                        var filename = path.basename(path.join(dbPath, entries[i]));
                        var uuid = path.basename(path.join(dbPath, entries[i]), '.h5');
                        if (!found) {
                            for (var key in query) {
                                if (typeof query[key] === 'string' && !found) {
                                    if (uuid === query[key]) {
                                        found = true;
                                    }
                                }
                            }
                        }
                        if (found) {
                            results.push(filename);
                        }
                        found = false;
                    }
                    if (typeof callback === 'function') {
                        callback(null, results);
                    } else {
                        return results;
                    }
                }).
                catch(function (err) {
                    if (typeof callback === 'function') {
                        callback(err, null);
                    } else {
                        throw err;
                    }
                });
        }
    };
};

function readDir(dirName, ext) {
    return fs.readdirAsync(dirName).map(function (fileName) {
        var filePath = path.join(dirName, fileName);
        return fs.statAsync(filePath).then(function (stat) {
            if (stat.isDirectory()) {
                return readDir(filePath, ext);
            } else {
                if (ext && path.extname(filePath) !== ext) {
                    return;
                } else {
                    return filePath;
                }
            }
        });
    }).reduce(function (a, b) {
        if (typeof b !== 'undefined') {
            return a.concat(b);
        } else {
            return a;
        }
    }, []);
}
