(function () {
    'use strict';

    module.exports.get = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify'),
            user_id = req.params.id;

        var selectAttributes = 'id name';

        if (req.user && (user_id === 'me' || req.user.id === user_id)) {
            user_id = req.user.id;
            selectAttributes = 'id name email';
        }

        mongoose.model('UserModel').findById(user_id)
            .select(selectAttributes)
            .exec(function (err, data) {
                if (err) {
                    if (err.name && err.name === 'CastError') {
                        res.send(new restify.ResourceNotFoundError());
                    } else {
                        console.log(err);
                        res.send(new restify.InternalError());
                    }
                    return next();
                }
                res.send(200, data);
                next();
            });
    };

    module.exports.post = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify');

        if (req.user) {
            res.send(new restify.NotAuthorizedError());
            return next();
        }
        if (typeof req.params !== 'object') {
            res.send(new restify.InvalidArgumentError());
            return next();
        }

        mongoose.model('UserModel')
            .create(req.params, function (err, user) {
                if (err) {
                    console.log(err);
                    if (err.name === 'ValidationError') {
                        res.send(new restify.InvalidArgumentError(JSON.stringify(err.errors)));
                    } else {
                        res.send(new restify.InternalError());
                    }
                    return next();
                }
                var mailer = require('../lib/mailer');
                mailer.sendConfirmationRequest(user, function (err, response) {
                    // TODO: add a persisted queue to be able to retry failed mails
                    if (err) {
                        console.log('confirmation mail error', err, response);
                    }
                    res.send(201, user);
                    next(err);
                });
            });
    };

    module.exports.put = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify'),
            user_id = req.params.id;

        if (typeof req.params !== 'object') {
            res.send(new restify.InvalidArgumentError());
            return next();
        }

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
                    console.log(err);
                    if (err.name === 'ValidationError') {
                        res.send(new restify.InvalidArgumentError(JSON.stringify(err.errors)));
                    } else {
                        res.send(new restify.InternalError());
                    }
                    return next();
                }
                res.send(200, user);
                next(err);
            });
    };

}());