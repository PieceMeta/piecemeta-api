(function () {
    'use strict';

    var mongoose = require('mongoose'),
        mongoHandler = require('../lib/util/mongoose-response');

    module.exports = function (config) {
        return {
            find: function (req, res, next) {
                var query = {};
                if (typeof config.query === 'object') {
                    if (typeof config.query.id_mapping === 'string') {
                        query[config.query.id_mapping] = req.params.id;
                    }
                    if (typeof config.query.user_mapping === 'string') {
                        query[config.query.user_mapping] = req.user.id;
                    }
                }
                mongoose.model(config.resource).find(query)
                    .exec(function (err, data) {
                        if (err) {
                            res.send(mongoHandler.handleError(err));
                        } else {
                            res.send(200, data);
                        }
                        next();
                    });
            },
            get: function (req, res, next) {
                mongoose.model(config.resource).findById(req.params.id)
                    .exec(function (err, data) {
                        if (err) {
                            res.send(mongoHandler.handleError(err));
                        } else {
                            res.send(200, data);
                        }
                        next();
                    });
            },
            post: function (req, res, next) {
                var object = req.body;
                object.user_id = req.user.id;
                mongoose.model(config.resource)
                    .create(req.body, function (err, data) {
                        if (err) {
                            res.send(mongoHandler.handleError(err));
                        } else {
                            res.send(201, data);
                        }
                        next();
                    });
            },
            put: function (req, res, next) {
                mongoose.model(config.resource)
                    .findByIdAndUpdate(req.params.id, req.body, function (err, data) {
                        if (err) {
                            res.send(mongoHandler.handleError(err));
                        } else {
                            res.send(200, data);
                        }
                        next();
                    });
            },
            del: function (req, res, next) {
                mongoose.model(config.resource)
                    .findByIdAndRemove(req.params.id, function (err, data) {
                        if (err) {
                            res.send(mongoHandler.handleError(err));
                        } else {
                            res.send(200, data);
                        }
                        next();
                    });
            }
        };
    };

})();