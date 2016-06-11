'use strict';

var PiecemetaLmdb = require('piecemeta-lmdb').default,
    Promise = require('bluebird'),
    client = new PiecemetaLmdb();

module.exports.open = Promise.coroutine(function *(lmdbPath, indexPath, size, dbs) {
    yield client.open(lmdbPath, indexPath, size, dbs);
    module.exports.client = client;
});

module.exports.client = null;