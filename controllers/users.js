(function () {
    'use strict';

    var mongoose = require('mongoose'),
        restify = require('restify'),
        mongoHandler = require('../lib/mongoose-response');

    module.exports.get = function (req, res, next) {
        var user_id = req.params.id,
            selectAttributes = 'id name';

        if (!req.user && user_id === 'me') {
            res.send(new restify.NotAuthorizedError());
            return next();
        } else if (req.user && user_id === 'me') {
            user_id = req.user.id;
            selectAttributes = 'id name email';
        }

        mongoose.model('UserModel').findById(user_id)
            .select(selectAttributes)
            .exec(function (err, user) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(200, user);
                }
                next();
            });
    };

    module.exports.post = function (req, res, next) {
        mongoose.model('UserModel')
            .create(req.params, function (err, user) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                    next();
                } else {
                    var mailer = require('../lib/mailer');
                    mailer.sendConfirmationRequest(user, function (err, response) {
                        // TODO: add a persisted queue to be able to retry failed mails
                        if (err) {
                            console.log('confirmation mail error', err, response);
                        }
                        res.send(201, user);
                        next(err);
                    });
                }
            });
    };

    module.exports.put = function (req, res, next) {
        var user_id = req.params.id;

        if (!req.user || (user_id !== 'me' && req.user.id !== user_id)) {
            res.send(new restify.NotAuthorizedError());
            return next();
        }

        if (user_id === 'me') {
            user_id = req.user.id;
        }

        mongoose.model('UserModel')
            .findByIdAndUpdate(user_id, req.params, function (err, user) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(200, user);
                }
                next();
            });
    };

    module.exports.del = function (req, res, next) {
        mongoose.model('UserModel')
            .findByIdAndRemove(req.params.id, function (err, data) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(200, data);
                }
                next();
            });
    };

}());