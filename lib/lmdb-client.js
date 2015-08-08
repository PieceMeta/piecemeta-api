'use strict';

var lmdb = require('node-lmdb'),
    lmdbUtil = require('./util/lmdb-util'),
    Promise = require('bluebird'),
    path = require('path'),
    msgpack = require('msgpack'),
    fs = require('fs-extra'),
    mkdirp = Promise.promisify(fs.mkdirp),
    assert = require('assert-plus'),
    t = require('exectimer'),
    Tick = t.Tick,
    env = new lmdb.Env(),
    debug = typeof v8debug === 'object',
    schemas = {};

if (debug) Promise.longStackTraces();

module.exports.openEnv = function (datapath, mapSize, maxDbs) {
    return mkdirp(datapath)
        .then(function () {
            env.open({
                path: path.resolve(datapath),
                mapSize: mapSize,
                maxDbs: maxDbs
            });
            console.log('Opened LMDB Env at', datapath);
            console.log('LMDB Env mapsize (bytes)', mapSize);
            console.log('LMDB Env max DBs', maxDbs);
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.closeEnv = function () {
    return Promise.resolve()
        .then(function () {
            env.close();
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.openDb = function (dbName) {
    return Promise.resolve()
        .then(function () {
            var dbi = env.openDbi({
                name: dbName,
                create: true
            });
            return dbi;
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.closeDb = function (dbi) {
    return Promise.resolve()
        .then(function () {
            dbi.close();
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.dropDb = function (dbi, justFreePages) {
    return Promise.resolve()
        .then(function () {
            dbi.drop({justFreePages: justFreePages});
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.statDb = function (dbi) {
    return Promise.resolve()
        .then(function () {
            var txn = env.beginTxn({readOnly: true}),
                stat = new Object(txn.stat(dbi));

            txn.commit();
            return stat;
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.registerSchema = function (key, schema) {
    schemas[key] = schema;
};

module.exports.getMetaData = function (dbi, uuid) {
    var tickTitle = 'getMetaData',
        tick = new Tick(tickTitle);

    tick.start();
    return Promise.resolve()
        .then(function () {
            var txn = env.beginTxn({readOnly: true}),
                cursor = new lmdb.Cursor(txn, dbi),
                buffer, result;

            cursor.goToKey(lmdbUtil.getKey(uuid));
            buffer = cursor.getCurrentBinary();
            result = msgpack.unpack(buffer);

            txn.commit();

            tick.stop();
            lmdbUtil.evaluateTicks(tickTitle, t.timers[tickTitle]);
            return result;
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.putMetaData = function (dbi, uuid, schemaKey, payload) {
    var tickTitle = 'putMetaData',
        tick = new Tick(tickTitle);

    tick.start();
    return Promise.resolve()
        .then(function () {
            assert.object(dbi, 'dbi');
            assert.string(uuid, 'uuid');
            assert.string(schemaKey, 'schemaKey');
            assert.object(payload, 'payload');

            if (schemas.hasOwnProperty(schemaKey)) {
                throw new Error('LMDB Meta schema not registered for key', schemaKey);
            }

            var schema = schemas[schemaKey],
                properties = Object.keys(payload);

            for (var i = 0; i < properties.length; i += 1) {
                if (payload[properties[i]] instanceof Function ||
                    schema[properties[i]].hasOwnProperty('protected')
                ) {
                    delete payload[properties[i]];
                }
            }

            var txn = env.beginTxn(),
                buffer = msgpack.pack(payload);

            txn.putBinary(dbi, lmdbUtil.getKey(uuid), buffer);
            txn.commit();

            tick.stop();
            lmdbUtil.evaluateTicks(tickTitle, t.timers[tickTitle]);
            return payload;
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.delMetaData = function (dbi, uuid) {
    return Promise.resolve()
        .then(function () {
            var txn = env.beginTxn();
            txn.del(dbi, lmdbUtil.getKey(uuid));
            txn.commit();
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.getStreamData = function (dbi, uuid, config) {
    if (Object.getPrototypeOf(config) !== Object.prototype) {
        config = {};
    }
    config.from = config.from || 0;
    config.to = config.to || 1000;
    config.skip = config.skip || 1;

    return Promise.resolve()
        .then(function () {
            var txn = env.beginTxn({readOnly: true}),
                cursor = new lmdb.Cursor(txn, dbi),
                getBinaryAsync = Promise.promisify(function getBinaryWrap(callback) {
                    cursor.getCurrentBinary(function (key, val) {
                        callback(null, val);
                    });
                }),
                counter = 0,
                results = [],
                loopstart = lmdbUtil.getKey(uuid, lmdbUtil.PM_LMDB_SEP_FRAMES, config.from),
                loopend = lmdbUtil.getKey(uuid, lmdbUtil.PM_LMDB_SEP_FRAMES, config.to);

            if (!cursor.goToKey(loopstart)) {
                throw new Error('Start frame not found for key ' + loopstart);
            }

            function loop(key) {
                if (key && key !== loopend) {
                    return getBinaryAsync().then(function (buffer) {

                        results.push(new Buffer(buffer));
                        counter += 1;

                        return cursor.goToKey(
                            lmdbUtil.getKey(
                                uuid,
                                lmdbUtil.PM_LMDB_SEP_FRAMES,
                                config.from + counter * config.skip
                            )
                        );
                    }).then(loop);
                }
                return Promise.resolve(key);
            }

            return loop(cursor.goToKey(loopstart))
                .then(function () {
                    txn.commit();
                    return results;
                });
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.putStreamData = function (dbi, uuid, frameBuffer, config) {
    assert.object(dbi, 'dbi');
    assert.string(uuid, 'uuid');
    assert.object(config, 'config');

    var from = config.from,
        frameSize = config.valueLength * config.valueCount,
        frameCount = frameBuffer.length / frameSize;

    return Promise.resolve()
        .then(function () {
            var txn = env.beginTxn();

            for (var i = 0; i < from + frameCount; i += 1) {
                var key = lmdbUtil.getKey(uuid, lmdbUtil.PM_LMDB_SEP_FRAMES, i);
                txn.putBinary(dbi, key, frameBuffer.slice(i * frameSize, (i + 1) * frameSize));
            }

            txn.commit();
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.delStreamData = function (dbi, uuid) {
    return Promise.resolve()
        .then(function () {
            var txn = env.beginTxn(),
                cursor = new lmdb.Cursor(txn, dbi),
                counter = 0,
                loopstart = lmdbUtil.getKey(uuid, lmdbUtil.PM_LMDB_SEP_FRAMES, counter);

            txn.del(dbi, lmdbUtil.getKey(uuid));

            for (var key = cursor.goToKey(loopstart); key;
                 key = cursor.goToKey(
                     lmdbUtil.getKey(
                         uuid,
                         lmdbUtil.PM_LMDB_SEP_FRAMES,
                         counter
                     )
                 )) {

                txn.del(dbi, key);
                counter += 1;
            }

            txn.commit();
        })
        .catch(lmdbUtil.errorHandler);
};
