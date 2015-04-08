(function () {
    'use strict';

    var mongoose = require('mongoose'),
        restify = require('restify'),
        msgpack = require('msgpack'),
        js2xmlparser = require("js2xmlparser"),
        fs = require('fs'),
        path = require('path'),
        async = require('async'),
        mongoHandler = require('../lib/util/mongoose-response');

    module.exports.get = function (req, res, next) {
        var filepath,
            extensions = {
            'application/json': 'json',
            'application/msgpack': 'msgpack',
            'application/xml': 'xml'
        };
        if (typeof extensions[req.contentType()] === 'undefined') {
            res.send(404);
            return;
        }
        filepath = path.join('.', 'cache', req.params.uuid + '.' + extensions[req.contentType()]);
        fs.exists(filepath, function (exists) {
            if (exists) {
                fs.createReadStream(filepath).pipe(res);
            } else {
                async.waterfall([
                    function (cb) {
                        mongoose.model('Package').findOne({uuid: req.params.uuid}, cb);
                    },
                    function (pkg, cb) {
                        mongoose.model('Channel').find({package_uuid: pkg.uuid}, function (err, channels) {
                            if (err) {
                                cb(err, null);
                                return;
                            }
                            pkg = pkg.toObject();
                            pkg.channels = [];
                            async.each(channels, function (channel, nextChannel) {
                                pkg.channels.push(channel.toObject());
                                nextChannel();
                            }, function (err) {
                                cb(err, pkg);
                            });
                        });
                    },
                    function (pkg, cb) {
                        async.each(pkg.channels, function (channel, nextChannel) {
                            mongoose.model('Stream').find({channel_uuid: channel.uuid}, function (err, streams) {
                                if (err) {
                                    cb(err, null);
                                    return;
                                }
                                var i = pkg.channels.indexOf(channel);
                                pkg.channels[i].streams = [];
                                async.each(streams, function (stream, nextStream) {
                                    pkg.channels[i].streams.push(stream.toObject());
                                    nextStream();
                                }, function (err) {
                                    nextChannel(err);
                                });
                            });
                        }, function (err) {
                            cb(err, pkg);
                        });
                    },
                    function (pkg, cb) {
                        var fileData;
                        switch (extensions[req.contentType()]) {
                            case 'json':
                                fileData = JSON.stringify(pkg);
                                break;
                            case 'msgpack':
                                fileData = msgpack.pack(pkg);
                                break;
                            case 'xml':
                                var options = {
                                    useCDATA: false,
                                    convertMap: {
                                        "[object Date]": function (date) {
                                            return date.toISOString();
                                        },
                                        "[object Function]": function (func) {
                                            return undefined;
                                        }
                                    }
                                };
                                fileData = js2xmlparser('package', pkg, options);
                                break;
                            default:
                                cb(null, null);
                                return;
                        }
                        fs.writeFile(filepath, fileData, function (err) {
                            cb(err, fileData);
                        });
                    }
                ], function (err, fileData) {
                    if (err) {
                        res.send(mongoHandler.handleError(err));
                    } else {
                        res.send(200, fileData);
                    }
                });
            }
        });
    };

})();