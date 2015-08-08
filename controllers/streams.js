'use strict';

var mongoose = require('mongoose'),
    Promise = require('bluebird'),
    lmdbClient = require('../lib/lmdb-client'),
    lmdbResponse = require('../lib/util/lmdb-response'),
    mongoHandler = require('../lib/util/mongoose-response');

Promise.longStackTraces();
Promise.promisifyAll(mongoose.model('Stream'));

module.exports = function (config) {
    return {
        find: function (req, res, next) {
            var query = {};
            query = require('../lib/util/query-mapping')(query, req, config);
            var q = mongoose.model(config.resource).find(query);
            if (req.contentType() === 'text/csv') {
                q = q.select('title group frames');
            } else if (typeof config.select === 'string') {
                q = q.select(config.select);
            }
            q.exec(function (err, data) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    if (data) {
                        if (req.contentType() === 'text/csv') {
                            var labels = [];
                            var maxlen = 0;
                            for (var i in data) {
                                if (data.hasOwnProperty(i) && typeof data[i] === 'object') {
                                    var label = (data[i].group ? data[i].group + '.' : '') + data[i].title;
                                    if (req.query.skip && req.query.skip <= data[i].frames.length && parseInt(req.query.skip) > 1) {
                                        var frames = [];
                                        for (var q = 0; q < data[i].frames.length; q += parseInt(req.query.skip)) {
                                            frames.push(data[i].frames[q]);
                                        }
                                        data[i].frames = frames;
                                    }
                                    if (data[i].frames.length > maxlen) {
                                        maxlen = data[i].frames.length;
                                    }
                                    labels.push(label);
                                }
                            }
                            var values = [];
                            for (var n = 0; n < maxlen; n += 1) {
                                var row = [];
                                for (i in data) {
                                    if (data.hasOwnProperty(i) && typeof data[i] === 'object') {
                                        if (typeof data[i].frames[n] !== 'undefined') {
                                            row.push(data[i].frames[n]);
                                        } else {
                                            row.push('');
                                        }
                                    }
                                }
                                values.push(row);
                            }
                            data = [labels].concat(values);
                        }
                        res.send(200, data);
                    } else {
                        var restify = require('restify');
                        res.send(new restify.NotFoundError());
                    }
                }
                next();
            });
        },
        get: function (req, res, next) {
            var q = mongoose.model('Stream').findOne({uuid: req.params.uuid});
            if (typeof config.select === 'string') {
                q = q.select(config.select);
            }
            // TODO: why the fuck can't i use a promise here?! weird exception in node.js
            q.exec(function (err, data) {
                Promise.resolve()
                    .then(function () {
                        if (err) throw err;
                    })
                    .then(function () {
                        if (data) {
                            return data;
                        } else {
                            var restify = require('restify');
                            throw new restify.NotFoundError();
                        }
                    })
                    .then(function (data) {
                        var pkgDbi;
                        return lmdbClient.openDb(data.package_uuid)
                            .then(function (dbi) {
                                pkgDbi = dbi;
                                var conf = {
                                    from: parseInt(req.query.from),
                                    to: parseInt(req.query.to),
                                    skip: parseInt(req.query.skip)
                                };
                                return lmdbClient.getStreamData(dbi, data.uuid, conf);
                            })
                            .then(function (result) {
                                var resultLength = result.length;
                                data = data.toObject();
                                data.frames = [];

                                for (var i = 0; i < resultLength; i += 1) {
                                    var valCount = data.labels.length,
                                        val = [];

                                    for (var v = 0; v < valCount; v += 1) {
                                        val.push(result[i].readFloatLE(v * 4));
                                    }

                                    data.frames.push(val);
                                }

                                return lmdbClient.closeDb(pkgDbi);
                            })
                            .then(function () {
                                return data;
                            })
                            .catch(function (err) {
                                console.log(err.stack);
                                throw err;
                            });
                    })
                    .then(function (data) {
                        res.send(200, data);
                        next();
                    })
                    .catch(function (err) {
                        console.log(err.stack);
                        res.send(mongoHandler.handleError(err));
                        next();
                    });
            });
        },
        post: function (req, res, next) {
            var object = req.body,
                frames = object.frames,
                pkgDbi;

            object.user_uuid = req.user.uuid;
            delete object.frames;

            mongoose.model('Stream')
                .createAsync(object)
                .then(function (data) {
                    return lmdbClient.openDb(data.package_uuid)
                        .then(function (dbi) {
                            pkgDbi = dbi;

                            var frameCount = frames.length,
                                valCount = data.labels.length,
                                frameSize, buffer, valueLength, writeFunc;

                            switch (data.format) {
                                case 'double':
                                    valueLength = 8;
                                    break;
                                case 'float':
                                    valueLength = 4;
                                    break;
                                default:
                                    throw new Error('Unknown format: ' + data.format);
                            }

                            frameSize = valCount * valueLength;
                            buffer = new Buffer(frameCount * frameSize);

                            switch (data.format) {
                                case 'double':
                                    writeFunc = function (val, offset) {
                                        buffer.writeDoubleLE(val, offset);
                                    };
                                    break;
                                case 'float':
                                    writeFunc = function (val, offset) {
                                        buffer.writeFloatLE(val, offset);
                                    };
                                    break;
                            }

                            for (var i = 0; i < frameCount; i += 1) {
                                for (var v = 0; v < valCount; v += 1) {
                                    writeFunc(frames[i][v], frameSize * i + v * valueLength);
                                }
                            }

                            return lmdbClient.putStreamData(
                                pkgDbi,
                                data.uuid,
                                buffer,
                                {
                                    from: 0,
                                    valueLength: valueLength,
                                    valueCount: valCount
                                }
                            );
                        })
                        .then(function () {
                            return lmdbClient.closeDb(pkgDbi);
                        })
                        .then(function () {
                            return data;
                        })
                        .catch(function (err) {
                            console.log(err.stack);
                            throw err;
                        });
                })
                .then(function (data) {
                    res.send(201, data);
                    next();
                })
                .catch(function (err) {
                    console.log(err.stack);
                    res.send(mongoHandler.handleError(err));
                    next();
                });
        }
    };
};
