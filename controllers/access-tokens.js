'use strict';

var restify = require('restify'),
    Promise = require('bluebird'),
    lmdb = require('../lib/lmdb'),
    lmdbResource = require('./resource-lmdb'),
    userModel = require('piecemeta-lmdb/dist/model/user'),
    apiKeyModel = require('piecemeta-lmdb/dist/model/api-key'),
    accessTokenModel = require('piecemeta-lmdb/dist/model/access-token');

module.exports.post = function (req, res, next) {
    return Promise.coroutine(function* () {
        var cred = {};

        // API key and secret

        if (req.params.key && req.params.secret) {
            cred.api_key = yield lmdb.client.meta.query('ApiKey', {
                key: req.params.key,
                secret: req.params.secret
            });
        }

        // Email & password

        if (req.params.email) {
            let user = yield lmdb.client.meta.query('User', {email: req.params.email}),
                valid = userModel.isValidPassword(req.params.password, user);
            if (valid) {
                cred.user = user;
            }
        }

        // Single access token

        if (req.params.single_access_token) {
            // TODO: confirm user
            cred.user = yield lmdb.client.meta.query('User', {
                single_access_token: req.params.single_access_token,
                confirmed: false
            });
        }

        // We have a user but no key yet

        if (!cred.api_key && cred.user) {
            let key = yield lmdb.client.meta.query('ApiKey', {user_uuid: cred.user.uuid});
            if (!key) {
                let fakeReq = {user: cred.user, body: apiKeyModel.generateApiCredentials({})};
                cred.api_key = yield lmdbResource.performCrud(fakeReq, {resource: 'ApiKey', action: 'post'});
            } else {
                cred.api_key = key;
            }
        }

        // Throw error if key is inactive, no key is found or could not be created (no user)

        if (!cred.api_key || !cred.api_key.active) {
            throw new restify.InvalidCredentialsError();
        }

        // Get the access token(s) for the current key and grab the most recent

        let tokens = yield lmdb.client.meta.query('AccessToken', {api_key: cred.api_key.key});
        tokens.sort((a, b) => {
            return b.issued - a.issued;
        });
        cred.access_token = tokens.length > 0 ? tokens[0] : null;

        // Respond with new or current access token (create if invalid)

        if (cred.access_token && accessTokenModel.isValid(cred.access_token)) {
            return lmdbResource.sendResOrNotFound(res, cred.access_token, next);
        } else {
            var fakeReq = {user: cred.user, body: {
                token: accessTokenModel.generateAccessToken(),
                api_key: cred.api_key.key,
                issued: Date.now()
            }};
            let access_token = yield lmdbResource.performCrud(fakeReq, {resource: 'AccessToken', action: 'post'});
            return lmdbResource.sendResOrNotFound(res, access_token, next);
        }
    })()
    .catch(function (err) {
        console.debug('Auth error', err.message, err.stack);
        return lmdbResource.errorResponse(res, new restify.InvalidCredentialsError());
    });
};
