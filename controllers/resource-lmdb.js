'use strict';

var lmdb = require('../lib/lmdb-client'),
    uuid = require('../lib/util/uuid'),
    lmdbHandler = require('../lib/util/lmdb-response');

module.exports = function (config) {
    return {
        find: function (req, res, next) {
            var query = {};
            query = require('../lib/util/query-mapping')(query, req, config);
            return lmdb.openDb(config.resource)
                .then(function (dbi) {
                    return lmdb.queryMetaData(dbi, query);
                })
                .then(function (data) {
                    if (data) {
                        res.send(200, data);
                    } else {
                        var restify = require('restify');
                        res.send(new restify.NotFoundError());
                    }
                    next();
                })
                .catch(function (err) {
                    res.send(lmdbHandler.handleError(err));
                    next();
                });
        },
        get: function (req, res, next) {
            return lmdb.openDb(config.resource)
                .then(function (dbi) {
                    return lmdb.getMetaData(dbi, req.params.uuid);
                })
                .then(function (data) {
                    if (data) {
                        res.send(200, data);
                    } else {
                        var restify = require('restify');
                        res.send(new restify.NotFoundError());
                    }
                    next();
                })
                .catch(function (err) {
                    res.send(lmdbHandler.handleError(err));
                    next();
                });
        },
        post: function (req, res, next) {
            var object = req.body;
            object.user_uuid = req.user.uuid;
            return lmdb.openDb(config.resource)
                .then(function (dbi) {
                    object.uuid = uuid.v4();
                    return lmdb.putMetaData(dbi, config.resource, object);
                })
                .then(function (data) {
                    res.send(200, data);
                    next();
                })
                .catch(function (err) {
                    res.send(lmdbHandler.handleError(err));
                    next();
                });
        },
        put: function (req, res, next) {
            return lmdb.openDb(config.resource)
                .then(function (dbi) {
                    return lmdb.putMetaData(dbi, config.resource, req.body);
                })
                .then(function (data) {
                    if (data) {
                        res.send(200, data);
                    } else {
                        var restify = require('restify');
                        res.send(new restify.NotFoundError());
                    }
                    next();
                })
                .catch(function (err) {
                    res.send(lmdbHandler.handleError(err));
                    next();
                });
        },
        del: function (req, res, next) {
            return lmdb.openDb(config.resource)
                .then(function (dbi) {
                    return lmdb.delMetaData(dbi, req.params.uuid);
                })
                .then(function (data) {
                    if (data) {
                        res.send(200, data);
                    } else {
                        var restify = require('restify');
                        res.send(new restify.NotFoundError());
                    }
                    next();
                })
                .catch(function (err) {
                    res.send(lmdbHandler.handleError(err));
                    next();
                });
        }
    };
};
