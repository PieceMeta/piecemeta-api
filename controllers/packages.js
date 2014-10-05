(function () {
    'use strict';

    var selectAttributes = 'id title description user_id created updated';

    module.exports.list = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify');

        mongoose.model('PackageModel')
            .find({})
            .select(selectAttributes)
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
        var mongoose = require('mongoose'),
            restify = require('restify');

        mongoose.model('PackageModel')
            .findById(req.params.id)
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
            packageObject = req.params;

        if (!req.user || !req.user.confirmed) {
            res.send(new restify.NotAuthorizedError());
            return next();
        }
        if (typeof req.params !== 'object') {
            res.send(new restify.InvalidArgumentError());
            return next();
        }

        packageObject.user_id = req.user.id;

        mongoose.model('PackageModel')
            .create(packageObject, function (err, data) {
                if (err) {
                    console.log(err);
                    res.send(new restify.InternalError());
                    return next();
                }
                res.send(201, data);
                next();
            });
    };

}());