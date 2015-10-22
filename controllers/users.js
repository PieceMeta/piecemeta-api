'use strict';

var restify = require('restify'),
    lmdbResource = require('./resource-lmdb');

module.exports.get = function (req, res, next) {
    if (!req.user && req.params.uuid === 'me') {
        res.send(new restify.NotAuthorizedError());
        return next();
    } else if (req.user && req.params.uuid === 'me') {
        req.params.uuid = req.user.uuid;
    }

    lmdbResource({resource: 'User', action: 'get'})(req, res, next);
};

module.exports.post = function (req, res, next) {
    lmdbResource({resource: 'User', action: 'post'})(req, res, next);
};

module.exports.put = function (req, res, next) {
    if (!req.user || (req.params.uuid !== 'me' && req.user.uuid !== req.params.uuid)) {
        res.send(new restify.NotAuthorizedError());
        return next();
    }
    if (req.params.uuid === 'me') {
        req.params.uuid = req.user.uuid;
    }

    lmdbResource({resource: 'User', action: 'put'})(req, res, next);
};

