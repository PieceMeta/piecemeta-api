'use strict';

var Promise = require('bluebird'),
    restify = require('restify'),
    lmdb = require('../lmdb');

module.exports = function () {
    return function (req, res, next) {
        return Promise.coroutine(function* () {
            if (req.authorization && req.authorization.scheme === 'bearer' && req.authorization.credentials) {
                let access_token = yield lmdb.client.meta.query('AccessToken', {token: req.authorization.credentials});
                if (!access_token) {
                    //throw new restify.InvalidCredentialsError();
                    return;
                }
                let api_key = yield lmdb.client.meta.query('ApiKey', {key: access_token.api_key});
                if (!api_key) {
                    //throw new restify.InvalidCredentialsError();
                    return;
                }
                req.api_key = api_key;
                let user = yield lmdb.client.meta.query('User', {uuid: api_key.user_uuid});
                req.user = user;
            }
            next();
        })();
    };
};
