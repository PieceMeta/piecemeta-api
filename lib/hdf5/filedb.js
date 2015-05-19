(function () {
    'use strict';

    var fs = require('fs-extra'),
        path = require('path'),
        Promise = require('bluebird');

    Promise.promisifyAll(fs);

    module.exports = function (dbPath) {
        return {
            init: function (callback) {
                fs.ensureDir(path.resolve(dbPath), function (err) {
                    callback(err);
                });
            },
            filter: function (query, callback) {
                readDir(path.resolve(dbPath), '.h5')
                    .then(function (entries) {
                        var results = [];
                        for (var i = 0; i < entries.length; i += 1) {
                            var found = typeof query !== 'object' || !query.length || query.length === 0;
                            if (!found) {
                                for (var key in query) {
                                    if (typeof query[key] === 'string' && !found) {
                                        if (entries[i].indexOf(query[key]) > -1) {
                                            found = true;
                                        }
                                    }
                                }
                            }
                            if (found) {
                                results.push(entries[i].replace(path.resolve(dbPath), ''));
                            }
                        }
                        callback(null, results);
                    }).
                    catch(function (err) {
                        callback(err, null);
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

})();