'use strict';

var mongoose = require('mongoose'),
    Promise = require('bluebird'),
    htClient = require('../lib/ht-client'),
    htResponse = require('../lib/util/ht-response'),
    hypertable = require('hypertable'),
    mongoHandler = require('../lib/util/mongoose-response');

Promise.longStackTraces();
Promise.promisifyAll(mongoose.model('Stream'));

module.exports = function (config) {
    return {
        find: function (req, res, next) {
            var query = {};
            query = require('../lib/util/query-mapping')(query, req, config);
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
                                if (data.hasOwnProperty(i) && typeof data[i] === 'object') {
                                    var label = (data[i].group ? data[i].group + '.' : '') + data[i].title;
                                    if (req.query.skip && req.query.skip <= data[i].frames.length && parseInt(req.query.skip) > 1) {
                                        var frames = [];
                                        for (var q = 0; q < data[i].frames.length; q += parseInt(req.query.skip)) {
                                            frames.push(data[i].frames[q]);
                                        }
                                        data[i].frames = frames;
                                    }
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
                                    if (data.hasOwnProperty(i) && typeof data[i] === 'object') {
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
            //var qAsync = Promise.promisify(q.exec);
            q.exec()
                .then(function (data) {
                    if (data) {
                        return data;
                    } else {
                        var restify = require('restify');
                        res.send(new restify.NotFoundError());
                        next();
                    }
                })
                .then(function (data) {
                    return htClient.openNamespace(data.package_uuid + '/' + data.channel_uuid)
                        .then(function (namespace) {
                            return htClient.getCells(namespace, data.uuid, data.labels, 0, 500, 10);
                        })
                        .then(function (result) {
                            console.log(result.length);
                            return data;
                        })
                        .catch(function (err) {
                            console.log(err.stack);
                            throw err;
                        });
                    /*
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
                    */

                })
                .then(function (data) {
                    res.send(200, data);
                    next();
                })
                .catch(function (err) {
                    res.send(mongoHandler.handleError(err));
                    next();
                });
        },
        post: function (req, res, next) {
            var namespace;
            var object = req.body;
            object.user_uuid = req.user.uuid;
            var frames = object.frames;
            delete object.frames;
            var nspath = object.package_uuid + '/' + object.channel_uuid;
            mongoose.model('Stream')
                .createAsync(object)
                .then(function (data) {
                    return htClient.createNamespace(object.package_uuid)
                        .then(function () {
                            return htClient.createNamespace(nspath);
                        })
                        .then(function () {
                            return htClient.openNamespace(nspath);
                        })
                        .then(function (ns) {
                            namespace = ns;
                            var defaultAgOptions = new hypertable.AccessGroupOptions({blocksize: 65536});
                            var defaultCfOptions = new hypertable.ColumnFamilyOptions({max_versions: 1});
                            var cfOptions = new hypertable.ColumnFamilyOptions({max_versions: 1});
                            var agSpec = new hypertable.AccessGroupSpec({name: 'ag_normal', defaults: cfOptions});
                            var agSpecs = {};
                            agSpecs.ag_normal = agSpec;
                            var cfSpecs = {};
                            for (var i=0; i<object.labels.length; i+=1) {
                                var cfSpec = new hypertable.ColumnFamilySpec({
                                    name: object.labels[i], access_group: 'ag_normal',
                                    value_index: true, qualifier_index: true
                                });
                                cfSpecs[object.labels[i]] = cfSpec;
                            }
                            var schema = new hypertable.Schema({
                                access_groups: agSpecs, column_families: cfSpecs,
                                access_group_defaults: defaultAgOptions,
                                column_family_defaults: defaultCfOptions
                            });
                            return htClient.createTable(namespace, data.uuid, schema);
                        })
                        .then(function () {
                            return htClient.setCells(namespace, data.uuid, object.labels, frames, 0);
                        })
                        .then(function () {
                            return htClient.closeNamespace(namespace);
                        })
                        .then(function () {
                            return data;
                        })
                        .catch(function (err) {
                            res.send(htResponse.handleError(err));
                        });
                })
                .then(function (data) {
                    if (data) {
                        res.send(201, data);
                    }
                    next();
                })
                .catch(function (err) {
                    console.log(err.stack);
                    res.send(mongoHandler.handleError(err));
                });
        }
    };
};
