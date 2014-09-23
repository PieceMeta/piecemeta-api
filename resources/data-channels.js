(function () {
    'use strict';

    module.exports.list = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify');

        mongoose.model('DataChannelModel')
            .find({ data_package_id: req.params.data_package_id })
            .select('id data_package_id parent_data_channel_id title created_at updated_at')
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

        mongoose.model('DataChannelModel')
            .findById(req.params.id)
            .select('id data_package_id parent_data_channel_id title created_at updated_at')
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
            dataChannel = req.params;

        if (!req.user || !req.user.confirmed) {
            res.send(new restify.NotAuthorizedError());
            return next();
        }
        if (typeof req.params !== 'object') {
            res.send(new restify.InvalidArgumentError());
            return next();
        }

        mongoose.model('DataChannelModel')
            .create(dataChannel, function (err, data) {
                if (err) {
                    console.log(err);
                    res.send(new restify.InternalError());
                    return next();
                }
                res.send(200, data);
                next();
            });
    };

    module.exports.put = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify'),
            dataChannel = req.params;

        delete dataChannel.id;

        if (!req.user || !req.user.confirmed) {
            res.send(new restify.NotAuthorizedError());
            return next();
        }
        if (typeof req.params !== 'object') {
            res.send(new restify.InvalidArgumentError());
            return next();
        }

        mongoose.model('DataChannelModel')
            .update({ id: req.params.id }, dataChannel, function (err, data) {
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

        mongoose.model('DataChannelModel')
            .findByIdAndRemove(req.params.id, function (err, channel) {
                if (err) {
                    console.log(err);
                    res.send(new restify.InternalError());
                    return next();
                }
                if (!channel) {
                    res.send(new restify.ResourceNotFoundError());
                } else {
                    res.send(200, '');
                }
                next();
            });
    };
}());