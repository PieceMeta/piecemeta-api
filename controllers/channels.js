(function () {
    'use strict';

    module.exports.list = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify');

        mongoose.model('ChannelModel')
            .find({ package_id: req.params.package_id })
            .select('id package_id parent_channel_id title created updated')
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

        mongoose.model('ChannelModel')
            .findById(req.params.id)
            .select('id package_id parent_channel_id title created updated')
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
            channelObject = req.params;

        if (!req.user || !req.user.confirmed) {
            res.send(new restify.NotAuthorizedError());
            return next();
        }
        if (typeof req.params !== 'object') {
            res.send(new restify.InvalidArgumentError());
            return next();
        }

        channelObject.user_id = req.user.id;

        mongoose.model('ChannelModel')
            .create(dataChannel, function (err, data) {
                if (err) {
                    console.log(err);
                    res.send(new restify.InternalError());
                    return next();
                }
                res.send(201, data);
                next();
            });
    };

    module.exports.put = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify'),
            channelObject = req.params;

        delete channelObject.id;
        delete channelObject.user_id;

        if (!req.user || !req.user.confirmed) {
            res.send(new restify.NotAuthorizedError());
            return next();
        }
        if (typeof req.params !== 'object') {
            res.send(new restify.InvalidArgumentError());
            return next();
        }

        mongoose.model('ChannelModel')
            .update({ id: req.params.id }, channelObject, function (err, data) {
                if (err) {
                    console.log(err);
                    res.send(new restify.InternalError());
                    return next();
                }
                res.send(200, data);
                next();
            });
    };

    module.exports.remove = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify');

        if (!req.user || !req.user.confirmed) {
            res.send(new restify.NotAuthorizedError());
            return next();
        }
        if (typeof req.params !== 'object') {
            res.send(new restify.InvalidArgumentError());
            return next();
        }

        mongoose.model('ChannelModel')
            .findByIdAndRemove(req.params.id, function (err, channel) {
                if (err) {
                    console.log(err);
                    res.send(new restify.InternalError());
                    return next();
                }
                if (!channel) {
                    res.send(new restify.ResourceNotFoundError());
                } else {
                    res.send(200, channel);
                }
                next();
            });
    };

}());