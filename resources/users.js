module.exports.list = function (req, res, next) {
    'use strict';
    var mongoose = require('mongoose'),
        restify = require('restify');
    mongoose.model('UserModel').find({})
        .select('id name email last_login')
        .exec(function (err, data) {
            if (err) {
                console.log(err);
                res.send(new restify.InternalError());
                return next();
            }
            res.send(200, data);
            next();
        });
};

module.exports.get = function (req, res, next) {
    'use strict';
    var mongoose = require('mongoose'),
        restify = require('restify'),
        user_id = req.params.id;

    if (user_id !== 'me' && req.user.id !== user_id) {
        res.send(new restify.NotAuthorizedError());
        return next();
    }
    if (user_id === 'me') {
        user_id = req.user.id;
    }

    mongoose.model('UserModel').findById(user_id)
        .select('id name email last_login')
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
    'use strict';
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
                return next(err);
            }
            var mailer = require('../lib/mailer');
            mailer.sendMail({
                recipient: user.email,
                subject: 'Please confirm your registration at PieceMeta.com',
                template: 'confirm_email',
                lang: 'en',
                substitutions: [
                    { key: '!CONFIRM_URL!', value: 'http://www.piecemeta.com/#/confirm/' + user.single_access_token }
                ]
            }, function (err, response) {
                if (err) {
                    console.log('confirmation mail error', err, response);
                }
                res.send(200, user);
                next(err);
            });
        });
};
