(function () {
    'use strict';
    module.exports = function () {
        return function (req, res, next) {
            if (req.authorization && req.authorization.scheme === 'bearer') {
                var mongoose = require('mongoose'),
                    async = require('async');

                async.waterfall([
                    function (cb) {
                        mongoose.model('AccessTokenModel').findOne({ token: req.authorization.credentials }, cb);
                    },
                    function (access_token, cb) {
                        if (!access_token) {
                            cb(new Error('Invalid token'), null);
                        } else {
                            mongoose.model('ApiKeyModel').findOne({ key: access_token.api_key }, cb);
                        }
                    },
                    function (api_key, cb) {
                        if (!api_key) {
                            cb(new Error('Invalid token'), null);
                        } else {
                            mongoose.model('UserModel').findById(api_key.user_id, cb);
                        }
                    }
                ], function (err, user) {
                    if (!err) {
                        req.user = user.toObject();
                    }
                    next();
                });
            } else {
                next();
            }
        };
    };
})();