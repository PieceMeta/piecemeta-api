(function () {
    'use strict';

    module.exports.list = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify');

        mongoose.model('DataSequenceModel')
            .find({}, function (err, data) {
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
        var mongoose = require('mongoose'),
            restify = require('restify');

        mongoose.model('DataSequenceModel')
            .findById(req.params.id, function (err, data) {
                if (err) {
                    if (err.name && err.name === 'CastError') {
                        res.send(new restify.ResourceNotFoundError());
                    } else {
                        console.log(err);
                        res.send(new restify.InternalError());
                    }
                    return next();
                }
                if (data) {
                    res.send(200, data);
                } else {
                    res.send(new restify.ResourceNotFoundError());
                }
                next();
            });
    };

    module.exports.post = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify'),
            dataSequence = req.params;

        if (!req.user || !req.user.confirmed) {
            res.send(new restify.NotAuthorizedError());
            return next();
        }
        if (typeof req.params !== 'object') {
            res.send(new restify.InvalidArgumentError());
            return next();
        }
        dataSequence.contributor_id = req.user._id.toString();
        mongoose.model('DataSequenceModel')
            .create(req.params, function (err, data) {
                if (err) {
                    console.log(err);
                    res.send(new InternalError());
                    return next();
                }
                res.send(200, data);
                next();
            });
    };
}());