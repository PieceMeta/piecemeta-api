'use strict';

var assert = require('assert-plus'),
    lmdbSys = require('../lib/lmdb/sys'),
    lmdbMeta = require('../lib/lmdb/meta'),
    lmdbHandler = require('../lib/lmdb/response');

module.exports = function (config) {
    assert.object(config, 'Resource config');

    return function (req, res, next) {
        module.exports.performCrud(req, config)
            .then(function (result) {
                module.exports.sendResOrNotFound(res, result, next);
            })
            .catch(function (err) {
                module.exports.errorResponse(res, err, next);
            });
    };
};

module.exports.performCrud = function (req, config) {
    assert.object(req, 'Request');
    assert.object(config, 'Resource config');

    var query = {}, object, result, dbi;
    if (config.action === 'find') {
        query = require('../lib/util/query-mapping')(query, req, config);
    }
    if (config.action === 'post') {
        object = req.body;
        object.user_uuid = req.user.uuid;
    }
    return lmdbSys.openDb(config.resource)
        .then(function (dbiRes) {
            dbi = dbiRes;
            switch (config.action) {
                case 'find':
                    return lmdbMeta.queryMetaData(dbi, config.resource, query);
                case 'get':
                    return lmdbMeta.getMetaData(dbi, req.params.uuid);
                case 'put':
                    return lmdbMeta.updateMetaData(dbi, config.resource, req.params.uuid, req.body);
                case 'del':
                    return lmdbMeta.delMetaData(dbi, req.params.uuid);
            }
        })
        .then(function (data) {
            result = data;
            return lmdbSys.closeDb(dbi);
        })
        .then(function () {
            return result;
        })
        .catch(function (err) {
            return lmdbSys.closeDb(dbi)
                .then(function () {
                    throw err;
                });
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