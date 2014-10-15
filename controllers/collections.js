(function () {
    'use strict';

    var mongoose = require('mongoose'),
        restify = require('restify'),
        mongoHandler = require('../lib/mongoose-response'),
        selectAttributes = 'id user_id title description created updated';

    module.exports.list = function (req, res, next) {
        mongoose.model('CollectionModel')
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
        mongoose.model('CollectionModel')
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
        var collectionObject = req.params;
        collectionObject.user_id = req.user.id;

        mongoose.model('CollectionModel')
            .create(collectionObject, function (err, data) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(200, data);
                }
                next();
            });
    };

    module.exports.put = function (req, res, next) {
        var collectionObject = req.params;
        mongoose.model('CollectionModel')
            .findByIdAndUpdate(req.params.id, collectionObject, function (err, data) {
                if (err) {
                    res.send(mongoHandler.handleError(err));
                } else {
                    res.send(200, data);
                }
                next();
            });
    };

    module.exports.del = function (req, res, next) {
        mongoose.model('CollectionModel')
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