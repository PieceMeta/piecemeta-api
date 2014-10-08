(function () {
    'use strict';

    var mongoose = require('mongoose'),
        restify = require('restify'),
        mongoHandler = require('../lib/mongoose-response'),
        selectAttributes = 'id title description user_id created updated';

    module.exports.list = function (req, res, next) {
        mongoose.model('PackageModel')
            .find({})
            .select(selectAttributes)
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
        mongoose.model('PackageModel')
            .findById(req.params.id)
            .select(selectAttributes)
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
        var packageObject = req.params;
        packageObject.user_id = req.user.id;

        mongoose.model('PackageModel')
            .create(packageObject, function (err, data) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(200, data);
                }
                next();
            });
    };

    module.exports.put = function (req, res, next) {

    };

    module.exports.del = function (req, res, next) {

    };

}());