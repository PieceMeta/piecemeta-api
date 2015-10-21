'use strict';

var lmdb = require('node-lmdb'),
    lmdbUtil = require('./util'),
    Promise = require('bluebird'),
    assert = require('assert-plus'),
    _debug = typeof v8debug === 'object',
    _env;

if (_debug) Promise.longStackTraces();

module.exports.setEnv = function (env) {
    _env = env;
};

module.exports.getStreamData = function (dbi, uuid, config) {
    assert.object(dbi, 'Dbi');
    assert.string(uuid, 'UUID');

    if (Object.getPrototypeOf(config) !== Object.prototype) {
        config = {};
    }
    config.from = config.from || 0;
    config.to = config.to || 1000;
    config.skip = config.skip || 1;

    return Promise.resolve()
        .then(function () {
            var txn = _env.beginTxn({readOnly: true}),
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
                    cursor.close();
                    txn.commit();
                    return results;
                });
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.putStreamData = function (dbi, uuid, frameBuffer, config) {
    assert.object(dbi, 'Dbi');
    assert.string(uuid, 'UUID');
    assert.object(config, 'config');

    var from = config.from,
        frameSize = config.valueLength * config.valueCount,
        frameCount = frameBuffer.length / frameSize;

    return Promise.resolve()
        .then(function () {
            var txn = _env.beginTxn();

            for (var i = 0; i < from + frameCount; i += 1) {
                var key = lmdbUtil.getKey(uuid, lmdbUtil.PM_LMDB_SEP_FRAMES, i);
                txn.putBinary(dbi, key, frameBuffer.slice(i * frameSize, (i + 1) * frameSize));
            }

            txn.commit();
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.delStreamData = function (dbi, uuid) {
    assert.object(dbi, 'Dbi');
    assert.string(uuid, 'UUID');

    return Promise.resolve()
        .then(function () {
            var txn = _env.beginTxn(),
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
