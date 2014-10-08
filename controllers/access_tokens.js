(function () {
    'use strict';

    var mongoose = require('mongoose'),
        restify = require('restify'),
        mongoHandler = require('../lib/mongoose-response');

    module.exports.post = function (req, res, next) {
        var async = require('async');
        async.waterfall([
            function (cb) {
                if (req.params.key && req.params.secret) {
                    mongoose.model('ApiKeyModel').findOne({ key: req.params.key, secret: req.params.secret }, function (err, api_key) {
                        if (err) {
                            cb(mongoHandler.handleError(err), null, null);
                        } else {
                            cb(null, api_key, null);
                        }
                    });
                } else {
                    mongoose.model('UserModel').findOne({ email: req.params.email }, function (err, user) {
                        if (err) {
                            cb(mongoHandler.handleError(err), null, null);
                        } else if (user) {
                            user.isValidPassword(req.params.password, function (pwError, isValid) {
                                if (pwError) {
                                    cb(pwError, null, user);
                                } else {
                                    if (isValid) {
                                        cb(null, null, user);
                                    } else {
                                        cb(new restify.InvalidCredentialsError(), null, null);
                                    }
                                }
                            });
                        } else {
                            cb(new restify.InvalidCredentialsError(), null, null);
                        }
                    });
                }
            },
            function (api_key, user, cb) {
                if (api_key) {
                    cb(null, api_key);
                } else {
                    mongoose.model('ApiKeyModel').find({ user_id: user.id }).sort('-issued').exec(function (err, api_key) {
                        if (err) {
                            cb(mongoHandler.handleError(err), null);
                        } else {
                            cb(null, api_key[0]);
                        }
                    });
                }
            },
            function (api_key, cb) {
                if (!api_key) {
                    cb(new restify.InvalidCredentialsError(), null, null);
                } else {
                    mongoose.model('AccessTokenModel').find({ api_key: api_key.key }).sort('-issued').exec(function (err, access_token) {
                        if (err) {
                            cb(mongoHandler.handleError(err), null, null);
                        } else {
                            cb(null, api_key, access_token);
                        }
                    });
                }
            },
            function (api_key, access_token, cb) {
                if (access_token && access_token.isValid) {
                    cb(null, access_token);
                } else {
                    mongoose.model('AccessTokenModel').create({ api_key: api_key.key }, function (err, access_token) {
                        if (err) {
                            cb(mongoHandler.handleError(err), null);
                        } else {
                            cb(null, access_token);
                        }
                    });
                }
            }
        ], function (err, access_token) {
            if (err) {
                res.send(err);
                return next();
            }
            if (access_token) {
                res.send(201, access_token);
            } else {
                res.send(new restify.InvalidCredentialsError());
            }
            next();
        });
    };

}());