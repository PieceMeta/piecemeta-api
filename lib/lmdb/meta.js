'use strict';

var lmdb = require('node-lmdb'),
    lmdbUtil = require('./util'),
    lmdbModel = require('./model'),
    Promise = require('bluebird'),
    msgpack = require('msgpack'),
    assert = require('assert-plus'),
    search = require('../search'),
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

module.exports.queryMetaData = function* (dbi, resource, query) {
    assert.object(dbi, 'Dbi');
    assert.string(resource, 'resource');

    if (Object.keys(query).length === 0) {
        query = { '*' : ['*'] };
    }

    var data = [], txn = _env.beginTxn({readOnly: true}),
        cursor = new lmdb.Cursor(txn, dbi),
        results = yield search.index(resource).query(query);

    return Promise.map(results, function (hit) {
            var uuid = hit.document.uuid;
            cursor.goToKey(uuid);
            cursor.getCurrentBinary((key, buffer) => {
                data.push(msgpack.unpack(buffer));
            });
        }, {concurrency: 1})
        .then(function () {
            cursor.close();
            txn.commit();
            return data;
        });
};

module.exports.getMetaData = function (dbi, resource, uuid) {
    assert.object(dbi, 'Dbi');
    assert.string(uuid, 'UUID');

    return Promise.resolve()
        .then(function () {
            var model = lmdbModel(_schemas[resource], {});
            return model.fetch(uuid);
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.createMetaData = function (dbi, schemaKey, payload, override) {
    assert.object(dbi, 'Dbi');
    assert.string(schemaKey, 'schemaKey');
    assert.object(payload, 'payload');

    return Promise.resolve()
        .then(function () {

            if (!_schemas.hasOwnProperty(schemaKey)) {
                throw new Error('LMDB Meta schema not registered for key: ' + schemaKey);
            }

            // TODO: re-enable this for new model structure
            /*
            if (!override || !payload.uuid) {
                payload.uuid = uuid.v4();
            }
            */

            return lmdbModel(payload, schemaKey, {});
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

            if (!_schemas.hasOwnProperty(schemaKey)) {
                throw new Error('LMDB Meta schema not registered for key: ' + schemaKey);
            }

            var model = lmdbModel({}, schemaKey, {});

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