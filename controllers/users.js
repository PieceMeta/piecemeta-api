'use strict';

var mongoose = require('mongoose'),
    restify = require('restify'),
    mongoHandler = require('../lib/util/mongoose-response');

module.exports.get = function (req, res, next) {
    var user_uuid = req.params.uuid,
        selectAttributes = 'uuid name';

    if (!req.user && user_uuid === 'me') {
        res.send(new restify.NotAuthorizedError());
        return next();
    } else if (req.user && user_uuid === 'me') {
        user_uuid = req.user.uuid;
        selectAttributes = 'uuid name email';
    }

    mongoose.model('User').findOne({ uuid: user_uuid })
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
    mongoose.model('User')
        .create(req.params, function (err, user) {
            if (err) {
                var mongoErr = mongoHandler.handleError(err);
                res.send(mongoErr);
                next();
            } else {
                /*
                TODO: make confirmation optional
                var mailer = require('../lib/mailer/mailer');
                mailer.sendConfirmationRequest(user, function (err, response) {
                    if (err) {
                        console.log('confirmation mail error', err, response);
                    }
                    res.send(201, user);
                    next(err);
                });
                 */
                user.confirmUser(function (err) {
                    if (err) {
                        var mongoErr = mongoHandler.handleError(err);
                        res.send(mongoErr);
                        next();
                    } else {
                        res.send(201, user);
                        next(err);
                    }
                });
            }
        });
};

module.exports.put = function (req, res, next) {
    var user_uuid = req.params.uuid;

    if (!req.user || (user_uuid !== 'me' && req.user.uuid !== user_uuid)) {
        res.send(new restify.NotAuthorizedError());
        return next();
    }

    if (user_uuid === 'me') {
        user_uuid = req.user.uuid;
    }

    mongoose.model('User')
        .findOneAndUpdate({ uuid: user_uuid }, req.params, function (err, user) {
            if (err) {
                res.send(mongoHandler.handleError(err));
            } else {
                res.send(200, user);
            }
            next();
        });
};

module.exports.del = function (req, res, next) {
    mongoose.model('User')
        .findOneAndRemove({ uuid: req.params.uuid }, function (err, data) {
            if (err) {
                res.send(mongoHandler.handleError(err));
            } else {
                res.send(200, data);
            }
            next();
        });
};
