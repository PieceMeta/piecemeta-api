(function () {
    'use strict';
    module.exports = function () {
        return function (req, res, next) {
            if (req.authorization && req.authorization.scheme === 'bearer' && req.authorization.credentials) {
                var mongoose = require('mongoose'),
                    async = require('async');
                async.waterfall([
                    function (cb) {
                        mongoose.model('AccessToken').findOne({ token: req.authorization.credentials }, cb);
                    },
                    function (access_token, cb) {
                        if (!access_token) {
                            cb(new Error('Invalid token'), null);
                        } else {
                            mongoose.model('ApiKey').findOne({ key: access_token.api_key }, cb);
                        }
                    },
                    function (api_key, cb) {
                        if (!api_key) {
                            cb(new Error('Invalid key'), null);
                        } else {
                            req.api_key = api_key;
                            mongoose.model('User').findOne({ uuid: api_key.user_uuid }, cb);
                        }
                    }
                ], function (err, user) {
                    if (!err) {
                        if (user) {
                            req.user = user.toObject();
                        }
                    } else {
                        console.log('token auth error', err);
                    }
                    next();
                });
            } else {
                next();
            }
        };
    };
})();