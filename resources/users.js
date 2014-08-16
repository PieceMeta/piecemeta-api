module.exports.list = function (req, res, next) {
    'use strict';
    var mongoose = require('mongoose'),
        restify = require('restify');
    mongoose.model('UserModel').find({}, function (err, data) {
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
    var user_id = req.params.id;
    if (!req.user || !req.user.confirmed) {
        res.send(new restify.NotAuthorizedError());
        return next();
    }
    if (user_id !== 'me' && req.user._id.toString() !== user_id) {
        res.send(new restify.NotAuthorizedError());
        return next();
    }
    if (user_id === 'me') {
        user_id = req.user._id.toString();
    }
    var mongoose = require('mongoose'),
        restify = require('restify');
    mongoose.model('UserModel').findById(user_id, function (err, data) {
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
    mongoose.model('UserModel').create(req.params, function (err, data) {
        if (err) {
            console.log(err);
            if (err.name === 'ValidationError') {
                res.send(new restify.InvalidArgumentError(JSON.stringify(err.errors)));
            } else {
                res.send(new restify.InternalError());
            }
            return next();
        }
        res.send(200, data);
        next();
    });
};
