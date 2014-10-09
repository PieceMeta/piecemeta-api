(function () {
    'use strict';

    var mongoose = require('mongoose'),
        restify = require('restify'),
        mongoHandler = require('../lib/mongoose-response');

    module.exports.list = function (req, res, next) {
        mongoose.model('ChannelModel')
            .find({ package_id: req.params.id })
            .select('id user_id package_id parent_channel_id title created updated')
            .exec(function (err, data) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(200, data);
                }
                next();
            });
    };

    module.exports.get = function (req, res, next) {
        mongoose.model('ChannelModel')
            .findById(req.params.id)
            .select('id user_id package_id parent_channel_id title created updated')
            .exec(function (err, data) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(200, data);
                }
                next();
            });
    };

    module.exports.post = function (req, res, next) {
        var channelObject = req.params;
        channelObject.user_id = req.user.id;
        mongoose.model('ChannelModel')
            .create(channelObject, function (err, data) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(201, data);
                }
                next();
            });
    };

    module.exports.put = function (req, res, next) {
        var channelObject = req.params;
        mongoose.model('ChannelModel')
            .findByIdAndUpdate(req.params.id, channelObject, function (err, data) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(200, data);
                }
                next();
            });
    };

    module.exports.del = function (req, res, next) {
        mongoose.model('ChannelModel')
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