(function () {
    'use strict';

    var mongoose = require('mongoose'),
        restify = require('restify'),
        mongoHandler = require('../lib/mongoose-response');

    module.exports.list = function (req, res, next) {
        mongoose.model('StreamModel')
            .find({ channel_id: req.params.channel_id })
            .select('id channel_id title group frames fps created updated')
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
        mongoose.model('StreamModel')
            .findById(req.params.id)
            .select('id channel_id title group frames fps created updated')
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
        var streamObject = req.params;
        streamObject.user_id = req.user.id;
        mongoose.model('StreamModel')
            .create(streamObject, function (err, data) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(201, data);
                }
                next();
            });
    };

    module.exports.put = function (req, res, next) {

    };

    module.exports.del = function (req, res, next) {

    };

}());