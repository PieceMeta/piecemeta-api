#!/usr/bin/env node

'use strict';

var Promise = require('bluebird'),
    mongoose = require('mongoose'),
    lmdbSys = require('../../lib/lmdb/sys'),
    lmdbMeta = require('../../lib/lmdb/meta'),
    lmdbStream = require('../../lib/lmdb/stream'),
    search = require('../../lib/search'),
    config = require('../../lib/config');

Promise.coroutine(function* () {
    var lmdbEnv;

    yield config.load();

    if (typeof config.get !== 'object') {
        throw new Error('Server has not been configured yet. Please run bin/setup.');
    }

    yield search.setBasepath('./index');

    lmdbEnv = yield lmdbSys.openEnv(
        config.get.lmdb.path,
        config.get.lmdb.mapsize * 1024 * 1024,
        config.get.lmdb.maxdbs
    );
    lmdbStream.setEnv(lmdbEnv);
    lmdbMeta.setEnv(lmdbEnv);
    lmdbMeta.registerSchema('Package', require('../../models/package'));
    lmdbMeta.registerSchema('Channel', require('../../models/channel'));
    lmdbMeta.registerSchema('Stream', require('../../models/stream'));
    lmdbMeta.registerSchema('AccessToken', require('../../models/access-token'));
    lmdbMeta.registerSchema('ApiKey', require('../../models/api-key'));
    lmdbMeta.registerSchema('User', require('../../models/user'));

    var dburl = 'mongodb://' +
        config.get.mongodb.host + ':' +
        config.get.mongodb.port + '/' +
        config.get.mongodb.dbname;
    mongoose.connect(dburl);
    mongoose.model('User', require('./models/user').User);
    mongoose.model('ApiKey', require('./models/api-key').ApiKey);
    mongoose.model('AccessToken', require('./models/access-token').AccessToken);
    mongoose.model('Channel', require('./models/channel').Channel);
    mongoose.model('Package', require('./models/package').Package);
    mongoose.model('Stream', require('./models/stream').Stream);
    console.log('Connected to MongoDB at', dburl);

    yield Promise.map(['Package', 'Channel', 'AccessToken', 'ApiKey', 'User'], function (resource) {
        console.log('Adding resource %s', resource);
        return mongoose.model(resource).find({})
            .then(function (results) {
                return Promise.map(results, function (data) {
                    return storeMeta(resource, data.toObject());
                }, {concurrency: 1});
            });
    }, {concurrency: 1});

    var channels = yield mongoose.model('Channel').find({});

    yield Promise.map(channels, function* (channel) {
        var streamGroups = {}, noGroup = [], dbi,
            streams = yield mongoose.model('Stream').find({channel_uuid: channel.uuid});

        dbi = yield lmdbSys.openDb(channel.package_uuid);

        yield Promise.map(streams, function (stream) {
            if (stream.group) {
                if (streamGroups.hasOwnProperty(stream.group)) {
                    streamGroups[stream.group].push(stream.toObject());
                } else {
                    streamGroups[stream.group] = [stream.toObject()];
                }
            } else {
                noGroup.push(stream.toObject());
            }
        }, {concurrency: 1});

        var groupKeys = Object.keys(streamGroups);

        yield Promise.map(groupKeys, function (groupKey) {
            return storeStreamData(dbi, streamGroups[groupKey])
                .then(function (meta) {
                    return storeMeta('Stream', meta);
                });
        }, {concurrency: 1});

        yield Promise.map(noGroup, function (stream) {
            return storeStreamData(dbi, [stream])
                .then(function (meta) {
                    return storeMeta('Stream', meta);
                });
        }, {concurrency: 1});

        return lmdbSys.closeDb(dbi);

    }, {concurrency: 1});

    process.exit(0);

})();

function storeStreamData(dbi, group) {
    return Promise.coroutine(function* () {
        var labels = [], frames = [], meta = group[0], maxlength = 0;
        for (var g = 0; g < group.length; g += 1) {
            if (group[g].frames && group[g].frames.length > maxlength) {
                maxlength = group[g].frames.length;
            } else {
                group[g].frames = [];
            }
            labels.push(group[g].title);
        }
        meta.labels = labels;
        meta.format = 'float';
        console.log('Adding stream data for UUID %s', meta.uuid);
        for (var f = 0; f < maxlength; f += 1) {
            var frame = [];
            for (var fv = 0; fv < labels.length; fv += 1) {
                frame.push(group[fv].frames[f] || null);
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

        // TODO: what to do with the possible null values?

        switch (format) {
            case 'double':
                writeFunc = (val, offset) => {
                    if (val) buffer.writeDoubleLE(val, offset);
                };
                break;
            case 'float':
                writeFunc = (val, offset) => {
                    if (val) buffer.writeFloatLE(val, offset);
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
                group[0].uuid,
                buffer,
                {
                    from: 0,
                    valueLength: valueLength,
                    valueCount: valCount
                }
            );

        return meta;

    })()
    .catch(function (err) {
        console.log('Error inserting stream for UUID %s', group[0].uuid, err.stack);
    });
}

function storeMeta(resource, payload) {
    console.log('Adding metadata for resource %s with UUID %s', resource, payload.uuid);

    if (resource === 'Stream') {
        delete payload.frames;
    }

    return Promise.coroutine(function *() {
        var dbi = yield lmdbSys.openDb(resource);
        yield lmdbMeta.createMetaData(dbi, resource, payload, true);
        yield lmdbSys.closeDb(dbi);
    })()
    .catch(function (err) {
        console.log('Error inserting %s for UUID %s', resource, payload.uuid, err.stack);
    });
}