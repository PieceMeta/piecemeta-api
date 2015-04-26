(function () {
    'use strict';

    var restify = require('restify'),
        mongoose = require('mongoose'),
        preflightEnabler = require('se7ensky-restify-preflight'),
        urlExtParser = require('./lib/parsers/pre/urlext-parser'),
        bodyParser = require('./lib/parsers/body-parser'),
        xmlFormatter = require('./lib/formatters/xml-formatter'),
        csvFormatter = require('./lib/formatters/csv-formatter'),
        tokenAuth = require('./lib/auth/token-auth'),
        routeAuth = require('./lib/auth/route-auth'),
        memcache = require('./lib/memcached'),
        config = require('./lib/config'),
        async = require('async'),
        routes = require('./routes')();

    async.waterfall([
        function (cb) {
            config.load(cb);
        },
        function (cb) {
            if (config.get) {
                var dburl = 'mongodb://' +
                    config.get.mongodb.host + ':' +
                    config.get.mongodb.port + '/' +
                    config.get.mongodb.dbname;
                mongoose.connect(dburl);
                mongoose.model('Collection', require('./models/collection').Collection);
                mongoose.model('Package', require('./models/package').Package);
                mongoose.model('Channel', require('./models/channel').Channel);
                mongoose.model('Stream', require('./models/stream').Stream);
                mongoose.model('User', require('./models/auth/user').User);
                mongoose.model('ApiKey', require('./models/auth/api-key').ApiKey);
                mongoose.model('AccessToken', require('./models/auth/access-token').AccessToken);
                mongoose.model('ApiServer', require('./models/tracker/api-server').ApiServer);
                mongoose.model('Tracker', require('./models/tracker/tracker').Tracker);
                mongoose.model('PushSubscription', require('./models/tracker/push-subscription').PushSubscription);
                cb(null);
            } else {
                cb(new Error('Server has not been configured yet. Please run bin/setup.'));
            }
        }, function (cb) {
            /*
            var workerFarm = require('worker-farm'),
                workers = workerFarm(require.resolve('./workers/update'));
            setInterval(function () {
                workers(function (err, pid) {
                    console.log('update job finished', err, pid);
                });
            },10*1000);
            */
            cb(null);
        }, function (cb) {
            var server = restify.createServer({
                name: "PieceMeta API Server",
                version: require("./package.json").version,
                formatters: {
                    'application/msgpack': function formatMsgPack(req, res, body) {
                        var msgPack = require('msgpack');
                        return msgPack.pack(body);
                    },
                    'application/xml': function formatXml(req, res, body) {
                        return xmlFormatter(req, res, body);
                    },
                    'text/csv': function formatCsv(req, res, body) {
                        return csvFormatter(req, res, body);
                    }
                }
            });
            server.pre(restify.pre.userAgentConnection());
            server.pre(urlExtParser());

            server.use(restify.CORS({
                credentials: true,
                origins: ['*'],
                allow_headers: ['Authorization', 'Basic']
            }));

            preflightEnabler(server, { headers: ['Authorization', 'Basic'] });

            server.use(restify.fullResponse());
            server.use(restify.gzipResponse());
            server.use(memcache.read());
            server.use(restify.authorizationParser());
            server.use(tokenAuth());
            server.use(routeAuth());
            server.use(bodyParser());
            server.use(restify.queryParser());

            for (var path in routes) {
                if (typeof routes[path] === 'object') {
                    for (var method in routes[path]) {
                        if (typeof routes[path][method] === 'object') {
                            var routeType = routes[path][method].overrideVerb || method;
                            server[routeType](path, routes[path][method].controller, memcache.write(), memcache.del());
                        }
                    }
                }
            }

            cb(null, server);
        }
    ], function (err, server) {
        if (!err) {
            server.listen(config.get.api_server.port, config.get.api_server.host, function () {
                console.log('%s listening at %s', server.name, server.url);
            });
        } else {
            console.log(err.message);
        }
    });

}());