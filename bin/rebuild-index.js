#!/usr/bin/env node

'use strict';

var Promise = require('bluebird'),
    lmdb = require('node-lmdb'),
    lmdbSys = require('../lib/lmdb/sys'),
    lmdbMeta = require('../lib/lmdb/meta'),
    msgpack = require('msgpack'),
    search = require('../lib/search'),
    config = require('../lib/config'),
    _env;

Promise.promisify(config.load)()
    .then(function setupSearch() {
        return search.setBasepath('../index');
    })
    .then(function () {
        return lmdbSys.openEnv(config.get.lmdb.path, config.get.lmdb.mapsize * 1024 * 1024, config.get.lmdb.maxdbs);
    })
    .then(function (env) {
        lmdbMeta.setEnv(env);
        _env = env;
        lmdbMeta.registerSchema('Package', require('../models/package').Package);
        lmdbMeta.registerSchema('Channel', require('../models/channel').Channel);
        lmdbMeta.registerSchema('Stream', require('../models/stream').Stream);
        lmdbMeta.registerSchema('AccessToken', require('../models/access-token').AccessToken);
        lmdbMeta.registerSchema('ApiKey', require('../models/api-key').ApiKey);
        lmdbMeta.registerSchema('User', require('../models/user').User);
    })
    .then(function () {
        var _dbi, resources = ['Package', 'Channel', 'Stream', 'AccessToken', 'ApiKey', 'User'];
        return Promise.map(resources, function (resource) {
            return search.index(resource).clear()
                .then(function () {
                    return lmdbSys.openDb(resource);
                })
                .then(function (dbi) {
                    var txn = _env.beginTxn({readOnly: true}),
                        cursor = new lmdb.Cursor(txn, dbi),
                        results = [];

                    _dbi = dbi;

                    for (var entry = cursor.goToFirst(); entry; entry = cursor.goToNext()) {
                        cursor.getCurrentBinary(unpackResult);
                    }

                    function unpackResult(key, buffer) {
                        results.push(msgpack.unpack(buffer));
                    }

                    cursor.close();
                    txn.commit();

                    return results;
                })
                .map(function (result) {
                    return search.index(resource).add(result, lmdbMeta.getSchema(resource));
                }, {concurrency: 1})
                .then(function () {
                    return lmdbSys.closeDb(_dbi);
                })
                .then(function () {
                    return search.index(resource).stat();
                })
                .then(function (stat) {
                    console.log('Index size for resource %s: %d', resource, stat.totalDocs);
                })
                .catch(function (err) {
                    console.log('Index add error for resource %s: %s', resource, err.message);
                });
        }, {concurrency: 1});
    })
    .then(function () {
        console.log('done.');
        process.exit(0);
    });