#!/usr/bin/env node

'use strict';

var Promise = require('bluebird'),
    lmdbClient = require('../lib/lmdb-client'),
    mongoose = require('mongoose'),
    config = require('../lib/config');

Promise.promisify(config.load)()
    .then(function () {
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

            lmdbClient.openEnv(config.get.lmdb.path, config.get.lmdb.mapsize * 1024 * 1024, config.get.lmdb.maxdbs);
            lmdbClient.registerSchema('Package', require('../models/lmdb/package').Package);
            lmdbClient.registerSchema('Channel', require('../models/lmdb/channel').Channel);
            lmdbClient.registerSchema('Stream', require('../models/lmdb/stream').Stream);
            lmdbClient.registerSchema('AccessToken', require('../models/lmdb/access-token').AccessToken);
            lmdbClient.registerSchema('ApiKey', require('../models/lmdb/api-key').ApiKey);
            lmdbClient.registerSchema('User', require('../models/lmdb/user').User);

        } else {
            throw new Error('Server has not been configured yet. Please run bin/setup.');
        }
    })
    /*
    .then(function () {
        return ['Package', 'Channel', 'AccessToken', 'ApiKey', 'User'];
    })
    .map(function (resource) {
        return mongoose.model(resource).find({})
            .then(function (results) {
                return Promise.map(results, function (pkg) {
                    var handle, payload = pkg.toObject();
                    return lmdbClient.openDb(resource)
                        .then(function (dbi) {
                            handle = dbi;
                            return lmdbClient.putMetaData(handle, resource, payload);
                        })
                        .then(function (obj) {
                            return lmdbClient.closeDb(handle);
                        })
                        .catch(function (err) {
                            console.log('error inserting %s for UUID %s', resource, payload.uuid, err.stack);
                        });
                }, {concurrency: 1});
            });
    }, {concurrency: 1})
    */
    .then(function () {
        return mongoose.model('Channel').find({});
    })
    .map(function (channel) {
        var streamGroups = {}, noGroup = [], handle;
        return mongoose.model('Stream').find({channel_uuid: channel.uuid})
            .then(function (streams) {
                return streams;
            })
            .map(function (stream) {
                if (stream.group) {
                    if (streamGroups.hasOwnProperty(stream.group)) {
                        streamGroups[stream.group].push(stream.toObject());
                    } else {
                        streamGroups[stream.group] = [stream.toObject()];
                    }
                } else {
                    noGroup.push(stream.toObject());
                }
            }, {concurrency: 1})
            .then(function () {
                return lmdbClient.openDb(channel.package_uuid);
            })
            .then(function (dbi) {
                handle = dbi;
                var groupKeys = Object.keys(streamGroups);
                return Promise.map(groupKeys, function (groupKey) {
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

                    return lmdbClient.putStreamData(
                        handle,
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
            .then(function (obj) {
                return lmdbClient.closeDb(handle);
            })
            .catch(function (err) {
                console.log('error inserting stream for UUID %s', channel.uuid, err.stack);
            });
    }, {concurrency: 1})
    .then(function () {
        console.log('done.');
        process.exit(0);
    });