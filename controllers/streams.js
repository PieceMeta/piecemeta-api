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
            return Promise.coroutine(function* () {
                var data = yield lmdbResource.performCrud(req, config);
                if (data) {
                    if (req.contentType() === 'text/csv') {
                        var labels = [];
                        var maxlen = 0;
                        for (let i of data) {
                            if (data.hasOwnProperty(i) && typeof data[i] === 'object') {
                                var label = (data[i].group ? data[i].group + '.' : '') + data[i].title;
                                if (req.query.skip && req.query.skip <= data[i].frames.length && parseInt(req.query.skip) > 1) {
                                    var frames = [];
                                    for (let q = 0; q < data[i].frames.length; q += parseInt(req.query.skip)) {
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
                        for (let n = 0; n < maxlen; n += 1) {
                            let row = [];
                            for (let i of data) {
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
            })()
            .catch(function (err) {
                return lmdbResource.errorResponse(res, err, next);
            });
        },
        get: function (req, res, next) {
            return Promise.coroutine(function* () {
                var meta, channels,
                    streams = yield search.index('Stream').query({uuid: [req.params.uuid]});

                if (streams && streams.hits.length > 0) {
                    channels = yield search.index('Channel')
                        .query({uuid: [streams.hits[0].document.channel_uuid]});
                }

                if (channels && channels.hits.length > 0) {
                    let metaDbi = yield lmdbSys.openDb('Stream');
                    meta = yield lmdbMeta.getMetaData(metaDbi, req.params.uuid);
                    yield lmdbSys.closeDb(metaDbi);
                }

                if (typeof meta === 'object') {
                    meta.config = {
                        from: parseInt(req.query.from),
                        to: parseInt(req.query.to),
                        skip: parseInt(req.query.skip)
                    };

                    let pkgDbi = yield lmdbSys.openDb(channels.hits[0].document.package_uuid),
                        data = yield lmdbStream.getStreamData(pkgDbi, req.params.uuid, meta.config),
                        resultLength = data.length;

                    yield lmdbSys.closeDb(pkgDbi);

                    meta.frames = [];

                    for (let i = 0; i < resultLength; i += 1) {
                        var valCount = meta.labels.length,
                            val = [];

                        for (let v = 0; v < valCount; v += 1) {
                            val.push(data[i].readFloatLE(v * 4));
                        }

                        meta.frames.push(val);
                    }
                }

                return lmdbResource.sendResOrNotFound(res, meta, next);
            })()
            .catch(function (err) {
                return lmdbResource.errorResponse(res, err, next);
            });
        },
        post: function (req, res, next) {
            var frames = req.body.frames;
            req.body.user_uuid = req.user.uuid;
            delete req.body.frames;

            return Promise.coroutine(function* () {
                var dbi, data = yield lmdbResource.performCrud(req, config),
                    frameCount = frames.length,
                    valCount = data.labels.length,
                    frameSize, buffer, valueLength, writeFunc;

                dbi = yield lmdbSys.openDb(data.package_uuid);

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
                        writeFunc = (val, offset) => {
                            buffer.writeDoubleLE(val, offset);
                        };
                        break;
                    case 'float':
                        writeFunc = (val, offset) => {
                            buffer.writeFloatLE(val, offset);
                        };
                        break;
                }

                for (var i = 0; i < frameCount; i += 1) {
                    for (var v = 0; v < valCount; v += 1) {
                        writeFunc(frames[i][v], frameSize * i + v * valueLength);
                    }
                }

                yield lmdbStream.putStreamData(
                    dbi,
                    data.uuid,
                    buffer,
                    {
                        from: 0,
                        valueLength: valueLength,
                        valueCount: valCount
                    }
                );

                yield lmdbSys.closeDb(dbi);

                return lmdbResource.sendResOrNotFound(res, data, next);

            })()
            .catch(function (err) {
                return lmdbResource.errorResponse(res, err, next);
            });
        }
    };
};
