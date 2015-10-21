#!/usr/bin/env node

'use strict';

var Promise = require('bluebird'),
    lmdbSys = require('../lib/lmdb/sys'),
    lmdbMeta = require('../lib/lmdb/meta'),
    lmdbStream = require('../lib/lmdb/stream'),
    search = require('../lib/search'),
    mongoose = require('mongoose'),
    config = require('../lib/config');

Promise.promisify(config.load)()
    .then(function setupSearch() {
        return search.setBasepath('../index');
    })
    .then(function () {
        return lmdbSys.openEnv(config.get.lmdb.path, config.get.lmdb.mapsize * 1024 * 1024, config.get.lmdb.maxdbs);
    })
    .then(function (env) {
        if (config.get) {
            var dburl = 'mongodb://' +
                config.get.mongodb.host + ':' +
                config.get.mongodb.port + '/' +
                config.get.mongodb.dbname;
            mongoose.connect(dburl);
            mongoose.model('User', require('../models/user').User);
            mongoose.model('ApiKey', require('../models/api-key').ApiKey);
            mongoose.model('AccessToken', require('../models/access-token').AccessToken);
            mongoose.model('Channel', require('../models/channel').Channel);
            mongoose.model('Package', require('../models/package').Package);
            mongoose.model('Stream', require('../models/stream').Stream);
            console.log('Connected to MongoDB at', dburl);

            lmdbMeta.setEnv(env);
            lmdbStream.setEnv(env);
            lmdbMeta.registerSchema('Package', require('../models/lmdb/package').Package);
            lmdbMeta.registerSchema('Channel', require('../models/lmdb/channel').Channel);
            lmdbMeta.registerSchema('Stream', require('../models/lmdb/stream').Stream);
            lmdbMeta.registerSchema('AccessToken', require('../models/lmdb/access-token').AccessToken);
            lmdbMeta.registerSchema('ApiKey', require('../models/lmdb/api-key').ApiKey);
            lmdbMeta.registerSchema('User', require('../models/lmdb/user').User);

        } else {
            throw new Error('Server has not been configured yet. Please run bin/setup.');
        }
    })
    .then(function () {
        return ['Package', 'Channel', 'AccessToken', 'ApiKey', 'User'];
    })
    .map(function (resource) {
        console.log('Adding resource %s', resource);
        return mongoose.model(resource).find({})
            .then(function (results) {
                return Promise.map(results, function (pkg) {
                    var _dbi, _payload = pkg.toObject();
                    return lmdbSys.openDb(resource)
                        .then(function (dbi) {
                            _dbi = dbi;
                            return lmdbMeta.createMetaData(_dbi, resource, _payload);
                        })
                        .then(function () {
                            return lmdbSys.closeDb(_dbi);
                        })
                        .catch(function (err) {
                            console.log('Error inserting %s for UUID %s', resource, _payload.uuid, err.stack);
                        });
                }, {concurrency: 1});
            });
    }, {concurrency: 1})
    .then(function () {
        return mongoose.model('Channel').find({});
    })
    .map(function (channel) {
        var streamGroups = {}, noGroup = [], _dbi, _streams;
        return mongoose.model('Stream').find({channel_uuid: channel.uuid})
            .then(function (streams) {
                _streams = streams;
                return;
            })
            .then(function () {
                return lmdbSys.openDb(channel.package_uuid)
                    .then(function (dbi) {
                        _dbi = dbi;
                        return _streams;
                    });
            })
            .map(function (stream) {
                console.log('Adding stream metadata for %s', stream.uuid);
                if (stream.group) {
                    if (streamGroups.hasOwnProperty(stream.group)) {
                        streamGroups[stream.group].push(stream.toObject());
                    } else {
                        streamGroups[stream.group] = [stream.toObject()];
                    }
                } else {
                    noGroup.push(stream.toObject());
                }
                var metaObj = stream.toObject();
                metaObj.frameCount = metaObj.frames.length;
                delete metaObj.frames;
                metaObj.format = 'float';
                return lmdbMeta.createMetaData(_dbi, 'Stream', metaObj);
            }, {concurrency: 1})
            .then(function () {
                var groupKeys = Object.keys(streamGroups);
                return Promise.map(groupKeys, function (groupKey) {
                    console.log('Adding stream group data for key %s', groupKey);
                    var group = streamGroups[groupKey],
                        labels = [], frames = [];
                    for (var g = 0; g < group.length; g += 1) {
                        labels.push(group[g].title);
                    }
                    for (var f = 0; f < group[0].frames.length; f += 1) {
                        var frame = [];
                        for (var fv = 0; fv < labels.length; fv += 1) {
                            frame.push(group[fv].frames[f]);
                        }
                        frames.push(frame);
                    }

                    var frameCount = frames.length,
                        valCount = labels.length,
                        format = 'float',
                        frameSize, buffer, valueLength, writeFunc;

                    switch (format) {
                        case 'double':
                            valueLength = 8;
                            break;
                        case 'float':
                            valueLength = 4;
                            break;
                        default:
                            throw new Error('Unknown format: ' + format);
                    }

                    frameSize = valCount * valueLength;
                    buffer = new Buffer(frameCount * frameSize);

                    switch (format) {
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
                        _dbi,
                        group[0].uuid,
                        buffer,
                        {
                            from: 0,
                            valueLength: valueLength,
                            valueCount: valCount
                        }
                    );

                }, {concurrency: 1});
            })
            .then(function () {
                return lmdbSys.closeDb(_dbi);
            })
            .catch(function (err) {
                console.log('Error inserting stream for UUID %s', channel.uuid, err.stack);
            });
    }, {concurrency: 1})
    .then(function () {
        console.log('done.');
        process.exit(0);
    });