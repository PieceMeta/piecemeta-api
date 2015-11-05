'use strict';

var lmdb = require('node-lmdb'),
    lmdbUtil = require('./util'),
    Promise = require('bluebird'),
    path = require('path'),
    fs = require('fs-extra'),
    mkdirp = Promise.promisify(fs.mkdirp),
    _env = new lmdb.Env(),
    _debug = typeof v8debug === 'object';

if (_debug) Promise.longStackTraces();

module.exports.openEnv = function (datapath, mapSize, maxDbs) {
    return mkdirp(datapath)
        .then(function () {
            _env.open({
                path: path.resolve(datapath),
                mapSize: mapSize,
                maxDbs: maxDbs,
                maxReaders: 126
            });
            console.log(`LMDB env: ${datapath}`);
            console.log(`LMDB env: map size ${mapSize / 1024 / 1024} MB`);
            console.log(`LMDB env: ${maxDbs} DBs`);
            return _env;
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.closeEnv = function () {
    return Promise.resolve()
        .then(function () {
            _env.close();
        })
        .catch(lmdbUtil.errorHandler);
};

module.exports.getEnv = function () {
    return _env;
};

module.exports.openDb = function (dbName) {
    return Promise.resolve()
        .then(function () {
            var dbi = _env.openDbi({
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
            var txn = _env.beginTxn({ readOnly: true }),
                stat = new Object(txn.stat(dbi));

            txn.commit();
            return stat;
        })
        .catch(lmdbUtil.errorHandler);
};