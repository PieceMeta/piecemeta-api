'use strict';

var assert = require('assert-plus'),
    Promise = require('bluebird'),
    lmdbSys = require('../lib/lmdb/sys'),
    lmdbMeta = require('../lib/lmdb/meta'),
    lmdbHandler = require('../lib/lmdb/response');

module.exports = function (config) {
    assert.object(config, 'Resource config');

    return (req, res, next) => {
        return Promise.coroutine(function *() {
            let result = yield module.exports.performCrud(req, config);
            return module.exports.sendResOrNotFound(res, result, next);
        })()
        .catch(function (err) {
            module.exports.errorResponse(res, err, next);
        });
    };
};

module.exports.performCrud = function (req, config) {
    assert.object(req, 'Request');
    assert.object(config, 'Resource config');

    var query = {}, result, dbi;

    if (config.action === 'find') {
        query = require('../lib/util/query-mapping')(query, req, config);
    }
    if (config.action === 'post') {
        req.body.user_uuid = req.user.uuid;
    }

    return Promise.coroutine(function *() {

        dbi = yield lmdbSys.openDb(config.resource);

        switch (config.action) {
            case 'find':
                result = yield lmdbMeta.queryMetaData(dbi, config.resource, query);
                break;
            case 'get':
                result = yield lmdbMeta.getMetaData(dbi, req.params.uuid);
                break;
            case 'post':
                result = yield lmdbMeta.createMetaData(dbi, config.resource, req.body);
                break;
            case 'put':
                result = yield lmdbMeta.updateMetaData(dbi, config.resource, req.params.uuid, req.body);
                break;
            case 'del':
                result = yield lmdbMeta.delMetaData(dbi, req.params.uuid);
        }

        yield lmdbSys.closeDb(dbi);

        return result;
    })()
    .catch(function (err) {
        if (dbi) {
            lmdbSys.closeDb(dbi);
        }
        throw err;
    });
};

module.exports.sendResOrNotFound = function (res, result, next) {
    if (result) {
        res.send(200, result);
    } else {
        var restify = require('restify');
        res.send(new restify.NotFoundError());
    }
    next();
};

module.exports.errorResponse = function (res, err, next) {
    res.send(lmdbHandler.handleError(err));
    next();
};