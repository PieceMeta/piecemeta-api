(function () {
    'use strict';

    module.exports = function (api_server_uuid, callback) {
        var async = require('async'),
            mongoose = require('mongoose'),
            config = require('../lib/config');
        async.waterfall([
            function (cb) {
                config.load(cb);
            },
            function (cb) {
                mongoose.connect('mongodb://' + config.get.mongodb.host + ':' + config.get.mongodb.port + '/' + config.get.mongodb.database);
                mongoose.model('ApiServer', require('../models/tracker/api-server').ApiServer);
                mongoose.model('ApiKey', require('../models/auth/api-key').ApiKey);
                cb(null);
            },
            function (cb) {
                mongoose.model('ApiServer').find({ uuid: api_server_uuid }, cb);
            },
            function (api_server, cb) {
                mongoose.model('ApiKey').find({
                    device_uuid: api_server.uuid
                }, function (err, api_key) {
                    cb(err, api_server, api_key);
                });
            },
            function (api_server, api_key, cb) {
                if (api_key) {
                    cb(null, api_server, api_key);
                } else {
                    mongoose.model('ApiKey').create({
                        device_uuid: api_server.uuid,
                        scopes: ['push']
                    }, function (err, api_key) {
                        cb(err, api_server, api_key);
                    });
                }
            },
            function (api_server, api_key, cb) {
                var clientConfig = {
                    host: (api_server.secure ? 'https://' : 'http://') + api_server.host + (api_server.port ? ':' + api_server.port : ''),
                    contentType: 'application/json'
                };
                var client = require('piecemeta-apiclient')(clientConfig);
                client.resource('push_subscriptions').action('post', {
                    api_server: [config.get.api_server],
                    api_key: api_key.key,
                    api_secret: api_key.secret
                }, function (err) {
                    cb(err, api_server);
                });
            }
        ], function (err, response) {
            callback(err, response);
        });
    };

})();