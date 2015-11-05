'use strict';

var Promise = require('bluebird'),
    restify = require('restify'),
    search = require('../../lib/search');

module.exports = function () {
    return function (req, res, next) {
        return Promise.coroutine(function* () {
            if (req.authorization && req.authorization.scheme === 'bearer' && req.authorization.credentials) {
                let access_token = yield search.index('AccessToken').query({token: req.authorization.credentials});
                if (!access_token) {
                    throw new restify.InvalidCredentialsError();
                }
                let api_key = yield search.index('ApiKey').query({key: access_token.api_key});
                if (!api_key) {
                    throw new restify.InvalidCredentialsError();
                }
                req.api_key = api_key;
                let user = yield search.index('User').query({uuid: api_key.user_uuid});
                req.user = user;
            }
            next();
        })();
    };
};
