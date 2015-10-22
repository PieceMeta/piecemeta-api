'use strict';

var Promise = require('bluebird'),
    lmdbResource = require('./resource-lmdb'),
    lmdbSys = require('../lib/lmdb/sys'),
    lmdbStream = require('../lib/lmdb/stream'),
    lmdbMeta = require('../lib/lmdb/meta'),
    search = require('../lib/search');

Promise.longStackTraces();

module.exports = function (config) {
    return {
        find: function (req, res, next) {
            lmdbResource.performCrud(req, config)
                .then(function (data) {
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
                    }
                    return lmdbResource.sendResOrNotFound(res, data, next);
                })
                .catch(function (err) {
                    return lmdbResource.errorResponse(res, err, next);
                });
        },
        get: function (req, res, next) {
            search.index('Stream').query({uuid: [req.params.uuid]})
                .then(function (data) {
                    if (data && data.hits.length > 0) {
                        return search.index('Channel').query({uuid: [data.hits[0].document.channel_uuid]})
                    }
                })
                .then(function (data) {
                    if (data && data.hits.length > 0) {
                        var _metaDbi, _pkgDbi, _meta;
                        return lmdbSys.openDb('Stream')
                            .then(function (dbi) {
                                _metaDbi = dbi;
                                return lmdbMeta.getMetaData(_metaDbi, req.params.uuid);
                            })
                            .then(function (meta) {
                                _meta = meta;
                                return lmdbSys.closeDb(_metaDbi);
                            })
                            .then(function () {
                                return lmdbSys.openDb(data.hits[0].document.package_uuid);
                            })
                            .then(function (dbi) {
                                _pkgDbi = dbi;
                                var conf = {
                                    from: parseInt(req.query.from),
                                    to: parseInt(req.query.to),
                                    skip: parseInt(req.query.skip)
                                };
                                _meta.config = conf;
                                return lmdbStream.getStreamData(_pkgDbi, req.params.uuid, conf);
                            })
                            .then(function (result) {
                                var resultLength = result.length;
                                _meta.frames = [];

                                for (var i = 0; i < resultLength; i += 1) {
                                    var valCount = _meta.labels.length,
                                        val = [];

                                    for (var v = 0; v < valCount; v += 1) {
                                        val.push(result[i].readFloatLE(v * 4));
                                    }

                                    _meta.frames.push(val);
                                }

                                return lmdbSys.closeDb(_pkgDbi);
                            })
                            .then(function () {
                                return _meta;
                            })
                            .catch(function (err) {
                                console.log(err.stack);
                                throw err;
                            });
                    }
                })
                .then(function (data) {
                    return lmdbResource.sendResOrNotFound(res, data, next);
                })
                .catch(function (err) {
                    lmdbResource.errorResponse(res, err, next);
                });
        },
        post: function (req, res, next) {
            var object = req.body,
                frames = object.frames,
                pkgDbi;

            object.user_uuid = req.user.uuid;
            delete object.frames;

            req.body = object;

            lmdbResource.performCrud(req, config)
                .then(function (data) {
                    return lmdbSys.openDb(data.package_uuid)
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

                            return lmdbStream.putStreamData(
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
                            return lmdbSys.closeDb(pkgDbi);
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
                    return lmdbResource.sendResOrNotFound(res, data, next);
                })
                .catch(function (err) {
                    return lmdbResource.errorResponse(res, err, next);
                });
        }
    };
};
