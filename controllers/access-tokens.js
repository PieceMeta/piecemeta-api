'use strict';

var restify = require('restify'),
    Promise = require('bluebird'),
    lmdbResource = require('./resource-lmdb'),
    userModel = require('../models/user'),
    apiKeyModel = require('../models/api-key'),
    accessTokenModel = require('../models/access-token'),
    search = require('../lib/search');

module.exports.post = function (req, res, next) {
    Promise.resolve()
        .then(function () {
            var cred = {};
            if (req.params.key && req.params.secret) {
                return search.index('ApiKey').query({
                        key: req.params.key,
                        secret: req.params.secret
                    })
                    .then(function (key) {
                        cred.api_key = key;
                        return cred;
                    });
            } else if (req.params.email) {
                return search.index('User').query({email: req.params.email})
                    .then(function (user) {
                        return userModel.isValidPassword(req.params.password, user)
                            .then(function (valid) {
                                if (valid) {
                                    cred.user = user;
                                }
                                return cred;
                            });
                    });
            } else if (req.params.single_access_token) {
                return search.index('User').query({
                        single_access_token: req.params.single_access_token,
                        confirmed: false
                    })
                    .then(function (user) {
                        // TODO: confirm user
                        cred.user = user;
                        return cred;
                    });
            } else {
                throw new restify.InvalidCredentialsError();
            }
        })
        .then(function (cred) {
            if (cred.api_key) {
                return cred;
            } else if (cred.user) {
                return search.index('ApiKey').query({user_uuid: cred.user.uuid})
                    .then(function (key) {
                        if (!key) {
                            var req = {user: cred.user, body: apiKeyModel.generateApiCredentials({})};
                            return lmdbResource.performCrud(req, {resource: 'ApiKey', action: 'post'})
                                .then(function (api_key) {
                                    cred.api_key = api_key;
                                    return cred;
                                });
                        } else {
                            cred.api_key = key;
                            return cred;
                        }
                    });
            } else {
                throw new restify.InvalidCredentialsError();
            }
        })
        .then(function (cred) {
            if (!cred.api_key) {
                throw new restify.InvalidCredentialsError();
            } else {
                return search.index('AccessToken').query({api_key: api_key.key})
                    .then(function (token) {
                        // TODO: sort by issued (most recent first)
                        cred.access_token = token;
                        return cred;
                    });
            }
        })
        .then(function (cred) {
            if (cred.access_token && accessTokenModel.isValid(cred.access_token)) {
                return lmdbResource.sendResOrNotFound(res, cred.access_token, next);
            } else {
                var req = {user: cred.user, body: {
                    token: accessTokenModel.generateAccessToken(),
                    api_key: cred.api_key.key,
                    issued: Date.now()
                }};
                return lmdbResource.performCrud(req, {resource: 'AccessToken', action: 'post'})
                    .then(function (access_token) {
                        return lmdbResource.sendResOrNotFound(res, access_token, next);
                    });
            }
        })
        .catch(function (err) {
            console.log('Auth error', err);
            return lmdbResource.errorResponse(res, new restify.InvalidCredentialsError());
        });
};
