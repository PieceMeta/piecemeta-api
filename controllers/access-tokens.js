'use strict';

var restify = require('restify'),
    Promise = require('bluebird'),
    lmdbResource = require('./resource-lmdb'),
    userModel = require('../models/user'),
    apiKeyModel = require('../models/api-key'),
    accessTokenModel = require('../models/access-token'),
    search = require('../lib/search');

module.exports.post = function (req, res, next) {
    return Promise.coroutine(function* () {
        var cred = {};

        // API key and secret

        if (req.params.key && req.params.secret) {
            cred.api_key = yield search.index('ApiKey').query({
                key: req.params.key,
                secret: req.params.secret
            });
        }

        // Email & password

        if (req.params.email) {
            let user = yield search.index('User').query({email: req.params.email}),
                valid = userModel.isValidPassword(req.params.password, user);
            if (valid) {
                cred.user = user;
            }
        }

        // Single access token

        if (req.params.single_access_token) {
            // TODO: confirm user
            cred.user = yield search.index('User').query({
                single_access_token: req.params.single_access_token,
                confirmed: false
            });
        }

        // We have a user but no key yet

        if (!cred.api_key && cred.user) {
            let key = yield search.index('ApiKey').query({user_uuid: cred.user.uuid});
            if (!key) {
                let fakeReq = {user: cred.user, body: apiKeyModel.generateApiCredentials({})};
                cred.api_key = yield lmdbResource.performCrud(fakeReq, {resource: 'ApiKey', action: 'post'});
            } else {
                cred.api_key = key;
            }
        }

        // Throw error if no key is found or could not be created (no user)

        if (!cred.api_key) {
            throw new restify.InvalidCredentialsError();
        }

        // Get the access token(s) for the current key

        let tokens = yield search.index('AccessToken').query({api_key: cred.api_key.key});
        tokens.sort((a, b) => {
            return b.issued - a.issued;
        });
        cred.access_token = tokens.length > 0 ? tokens[0] : null;

        // Respond with new or current access token (create if invalid)
        // TODO: check if key is active before creating token

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
