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
                var q = mongoose.model(config.resource).find(query);
                if (req.contentType() === 'text/csv') {
                    q = q.select('title group frames');
                } else if (typeof config.select === 'string') {
                    q = q.select(config.select);
                }
                q.exec(function (err, data) {
                    if (err) {
                        res.send(mongoHandler.handleError(err));
                    } else {
                        if (data) {
                            if (req.contentType() === 'text/csv') {
                                var labels = [];
                                var maxlen = 0;
                                for (var i in data) {
                                    if (typeof data[i] === 'object') {
                                        var label = (data[i].group ? data[i].group + '.' : '') + data[i].title;
                                        if (data[i].frames.length > maxlen) {
                                            maxlen = data[i].frames.length;
                                        }
                                        labels.push(label);
                                    }
                                }
                                var values = [];
                                for (var n = 0; n < maxlen; n += 1) {
                                    var row = [];
                                    for (i in data) {
                                        if (typeof data[i] === 'object') {
                                            if (typeof data[i].frames[n] !== 'undefined') {
                                                row.push(data[i].frames[n]);
                                            } else {
                                                row.push('');
                                            }
                                        }
                                    }
                                    values.push(row);
                                }
                                data = [labels].concat(values);
                            }
                            console.log(data);
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
                var q = mongoose.model('Stream').findOne({uuid: req.params.uuid});
                if (typeof config.select === 'string') {
                    q = q.select(config.select);
                }
                q.exec(function (err, data) {
                    if (err) {
                        res.send(mongoHandler.handleError(err));
                    } else {
                        if (data) {
                            var frames;
                            if (req.query.from || req.query.to) {
                                var from = req.query.from ? parseInt(req.query.from) : 0;
                                var to = req.query.to ? parseInt(req.query.to) - from : data.frames.length - from;
                                if (from <= from + to) {
                                    frames = data.frames.splice(from, to);
                                    data.frames = frames;
                                }
                            }
                            if (req.query.skip && req.query.skip <= data.frames.length && parseInt(req.query.skip) > 1) {
                                frames = [];
                                for (var q = 0; q < data.frames.length; q += parseInt(req.query.skip)) {
                                    frames.push(data.frames[q]);
                                }
                                data.frames = frames;
                            }
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