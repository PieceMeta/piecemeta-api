(function () {
    'use strict';

    var mongoose = require('mongoose'),
        mongoHandler = require('../lib/util/mongoose-response');

    module.exports = function (config) {
        return {
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