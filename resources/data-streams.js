(function () {
    'use strict';

    module.exports.list = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify');

        mongoose.model('DataStreamModel')
            .find({ data_channel_id: req.params.data_channel_id })
            .select('id data_channel_id title group data_frames value_offset frame_count frame_duration frame_rate created_at updated_at')
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

        mongoose.model('DataStreamModel')
            .findById(req.params.id)
            .select('id data_channel_id title group data_frames value_offset frame_count frame_duration frame_rate created_at updated_at')
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
            dataStream = req.params;

        if (!req.user || !req.user.confirmed) {
            res.send(new restify.NotAuthorizedError());
            return next();
        }
        if (typeof req.params !== 'object') {
            res.send(new restify.InvalidArgumentError());
            return next();
        }

        mongoose.model('DataStreamModel')
            .create(dataStream, function (err, data) {
                if (err) {
                    console.log(err);
                    res.send(new restify.InternalError());
                    return next();
                }
                res.send(200, data);
                next();
            });
    };
}());