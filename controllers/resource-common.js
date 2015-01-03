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
                        query[config.query.id_mapping] = req.params.uuid;
                    }
                    if (typeof config.query.user_mapping === 'string') {
                        query[config.query.user_mapping] = req.user.uuid;
                    }
                }
                mongoose.model(config.resource).find(query)
                    .exec(function (err, data) {
                        if (err) {
                            res.send(mongoHandler.handleError(err));
                        } else {
                            if (data) {
                                res.send(200, data);
                            } else {
                                var restify = require('restify');
                                res.send(new restify.NotFoundError());
                            }
                        }
                        next();
                    });
            },
            get: function (req, res, next) {
                mongoose.model(config.resource).findOne({ uuid: req.params.uuid })
                    .exec(function (err, data) {
                        if (err) {
                            res.send(mongoHandler.handleError(err));
                        } else {
                            if (data) {
                                res.send(200, data);
                            } else {
                                var restify = require('restify');
                                res.send(new restify.NotFoundError());
                            }
                        }
                        next();
                    });
            },
            post: function (req, res, next) {
                var object = req.body;
                object.user_uuid = req.user.uuid;
                if (mongoose.model(config.resource).schema.path('namespace')) {
                    var serverConfig = require('../lib/config');
                    object.namespace = serverConfig.get.api_server.uuid;
                }
                mongoose.model(config.resource)
                    .create(object, function (err, data) {
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
                    .findOneAndUpdate({ uuid: req.params.uuid }, req.body, function (err, data) {
                        if (err) {
                            res.send(mongoHandler.handleError(err));
                        } else {
                            if (data) {
                                res.send(200, data);
                            } else {
                                var restify = require('restify');
                                res.send(new restify.NotFoundError());
                            }
                        }
                        next();
                    });
            },
            del: function (req, res, next) {
                mongoose.model(config.resource)
                    .findOneAndRemove({ uuid: req.params.uuid }, function (err, data) {
                        if (err) {
                            res.send(mongoHandler.handleError(err));
                        } else {
                            if (data) {
                                res.send(200, data);
                            } else {
                                var restify = require('restify');
                                res.send(new restify.NotFoundError());
                            }
                        }
                        next();
                    });
            }
        };
    };

})();