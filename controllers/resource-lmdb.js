'use strict';

var assert = require('assert-plus'),
    Promise = require('bluebird'),
    lmdb = require('../lib/lmdb');

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

    var query = {}, result;

    if (config.action === 'find') {
        query = require('../lib/util/query-mapping')(query, req, config);
    }
    if (config.action === 'post') {
        req.body.user_uuid = req.user.uuid;
    }

    return Promise.coroutine(function *() {

        switch (config.action) {
            case 'find':
                result = yield lmdb.client.meta.query(config.resource, query);
                break;
            case 'get':
                result = yield lmdb.client.meta.fetch(config.resource, req.params.uuid);
                break;
            case 'post':
                result = yield lmdb.client.meta.create(config.resource, req.body);
                break;
            case 'put':
                result = yield lmdb.client.meta.update(config.resource, req.params.uuid, req.body);
                break;
            case 'del':
                result = yield lmdb.client.meta.del(config.resource, req.params.uuid);
        }

        return result;
    })()
    .catch(function (err) {
        throw err;
    });
};

module.exports.sendResOrNotFound = function (res, result, next) {
    if (result) {
        if (!(result instanceof Object) && result.hasOwnProperty('toObject')) {
            result = result.toObject();
        }
        res.send(200, result);
    } else {
        var restify = require('restify');
        res.send(new restify.NotFoundError());
    }
    next();
};

module.exports.errorResponse = function (res, err, next) {
    res.send(500, err);
    next();
};