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
    lmdbMeta.setEnv(lmdbEnv);
    lmdbMeta.registerSchema('Package', require('../models/package'));
    lmdbMeta.registerSchema('Channel', require('../models/channel'));
    lmdbMeta.registerSchema('Stream', require('../models/stream'));
    lmdbMeta.registerSchema('AccessToken', require('../models/access-token'));
    lmdbMeta.registerSchema('ApiKey', require('../models/api-key'));
    lmdbMeta.registerSchema('User', require('../models/user'));

    yield Promise.map(['Package', 'Channel', 'Stream', 'AccessToken', 'ApiKey', 'User'], function (resource) {
        return Promise.coroutine(function* () {
            var dbi = yield lmdbSys.openDb(resource),
                txn = _env.beginTxn({readOnly: true}),
                cursor = new lmdb.Cursor(txn, dbi),
                results = [];

            for (var entry = cursor.goToFirst(); entry; entry = cursor.goToNext()) {
                cursor.getCurrentBinary((key, buffer) => {
                    results.push(msgpack.unpack(buffer));
                });
            }

            cursor.close();
            txn.commit();

            yield Promise.map(results, function (result) {
                return search.index(resource)
                    .add(result, lmdbMeta.getSchema(resource));
            }, {concurrency: 1});

            yield lmdbSys.closeDb(dbi);

            console.log(
                'Index size for resource %s: %d',
                resource,
                yield search.index(resource).stat().totalDocs
            );

        })()
        .catch(function (err) {
            console.log('Index add error for resource %s: %s', resource, err.message);
        });
    }, {concurrency: 1});

    process.exit(0);

})();