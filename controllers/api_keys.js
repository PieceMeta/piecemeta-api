(function () {
    'use strict';

    var mongoose = require('mongoose'),
        restify = require('restify'),
        mongoHandler = require('../lib/mongoose-response');

    module.exports.list = function (req, res, next) {
        mongoose.model('ApiKeyModel')
            .find({ user_id: req.user.id }, function (err, data) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(200, data);
                }
                next();
            });
    };

    module.exports.del = function (req, res, next) {

    };

}());