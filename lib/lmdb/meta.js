'use strict';

var lmdb = require('node-lmdb'),
    lmdbUtil = require('./util'),
    Promise = require('bluebird'),
    msgpack = require('msgpack'),
    assert = require('assert-plus'),
    search = require('../search'),
    uuid = require('../util/uuid'),
    _debug = typeof v8debug === 'object',
    _schemas = {}, _env;

if (_debug) Promise.longStackTraces();

module.exports.setEnv = function (env) {
    _env = env;
};

module.exports.registerSchema = function (key, schema) {
    _schemas[key] = schema;
};

module.exports.getSchema = function (key) {
    return _schemas[key];
};

module.exports.queryMetaData = function (dbi, query) {
    assert.object(dbi, 'Dbi');
    assert.object(query, 'query');

    var results = [],
        queryKeys = Object.keys(query);

    return Promise.resolve()
        .then(function () {
            var txn = _env.beginTxn({readOnly: true}),
                cursor = new lmdb.Cursor(txn, dbi),
                found = queryKeys.length === 0;

            for (var entry = cursor.goToFirst(); entry; entry = cursor.goToNext()) {
                cursor.getCurrentBinary(unpackResult);
            }

            function unpackResult(key, buffer) {
                var result = msgpack.unpack(buffer);

                for (var i = 0; i < queryKeys.length; i += 1) {
                    if (result[queryKeys[i]] && result[queryKeys[i]] === query[queryKeys[i]]) {
                        found = true;
                    }
                }

                if (found) {
                    results.push(result);
                }
            }

            cursor.close();
            txn.commit();

            return results;
        });
};

module.exports.getMetaData = function (dbi, uuid) {
    assert.object(dbi, 'Dbi');
    assert.string(uuid, 'UUID');

    return Promise.resolve()
        .then(function () {
            var txn = _env.beginTxn({readOnly: true}),
                cursor = new lmdb.Cursor(txn, dbi),
                result;

            cursor.goToKey(uuid);
            cursor.getCurrentBinary(unpackResult);

            function unpackResult(key, buffer) {
                result = msgpack.unpack(buffer);
            }

            cursor.close();
            txn.commit();

            return result;
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.createMetaData = function (dbi, schemaKey, payload) {
    assert.object(dbi, 'Dbi');
    assert.string(schemaKey, 'schemaKey');
    assert.object(payload, 'payload');

    return Promise.resolve()
        .then(function () {
            assert.object(dbi, 'dbi');
            assert.string(schemaKey, 'schemaKey');
            assert.object(payload, 'payload');

            if (!_schemas.hasOwnProperty(schemaKey)) {
                throw new Error('LMDB Meta schema not registered for key: ' + schemaKey);
            }

            var schema = _schemas[schemaKey],
                primaryKey = 'uuid',
                properties = Object.keys(payload);

            payload.uuid = uuid.v4();

            for (var i = 0; i < properties.length; i += 1) {
                if (schema[properties[i]] && !(payload[properties[i]] instanceof Function)) {
                    if (schema[properties[i]].hasOwnProperty('protected')) {
                        delete payload[properties[i]];
                    }
                    if (schema[properties[i]].hasOwnProperty('primary')) {
                        primaryKey = properties[i];
                    }
                }
            }

            if (!payload.hasOwnProperty(primaryKey)) {
                throw new Error('LMDB Meta expected primary key not found: ' + primaryKey);
            }

            var txn = _env.beginTxn(),
                buffer = msgpack.pack(payload);

            txn.putBinary(dbi, primaryKey, buffer);
            txn.commit();

            return search.index(schemaKey).add(payload, schema);
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.updateMetaData = function (dbi, schemaKey, uuid, payload) {
    assert.object(dbi, 'Dbi');
    assert.string(schemaKey, 'schemaKey');
    assert.string(uuid, 'UUID');
    assert.object(payload, 'payload');

    return Promise.resolve()
        .then(function () {
            assert.object(dbi, 'dbi');
            assert.string(schemaKey, 'schemaKey');
            assert.object(payload, 'payload');

            if (!_schemas.hasOwnProperty(schemaKey)) {
                throw new Error('LMDB Meta schema not registered for key: ' + schemaKey);
            }

            var schema = _schemas[schemaKey],
                primaryKey = 'uuid',
                properties = Object.keys(payload),
                txn = _env.beginTxn(),
                cursor = new lmdb.Cursor(txn, dbi),
                result;

            cursor.goToKey(uuid);
            cursor.getCurrentBinary(unpackResult);

            function unpackResult(key, buffer) {
                result = msgpack.unpack(buffer);
            }

            cursor.close();

            for (var i = 0; i < properties.length; i += 1) {
                if (schema[properties[i]] && !(payload[properties[i]] instanceof Function)) {
                    if (schema[properties[i]].hasOwnProperty('protected')) {
                        delete payload[properties[i]];
                    }
                    if (schema[properties[i]].hasOwnProperty('primary')) {
                        primaryKey = properties[i];
                    }
                    result[properties[i]] = payload[properties[i]];
                }
            }

            if (!payload.hasOwnProperty(primaryKey)) {
                throw new Error('LMDB Meta expected primary key not found: ' + primaryKey);
            }

            var buffer = msgpack.pack(payload);

            txn.putBinary(dbi, primaryKey, buffer);
            txn.commit();

            return search.index(schemaKey).add(result, schema);
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.delMetaData = function (dbi, uuid) {
    assert.object(dbi, 'Dbi');
    assert.string(uuid, 'UUID');

    return Promise.resolve()
        .then(function () {
            var txn = _env.beginTxn();
            txn.del(dbi, uuid);
            txn.commit();
        })
        .catch(lmdbUtil.errorHandler);
};