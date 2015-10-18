
'use strict';

var restify = require('restify'),
    Promise = require('bluebird'),
    mongoose = require('mongoose'),
    lmdbClient = require('./lib/lmdb-client'),
    config = require('./lib/config'),
    preflightEnabler = require('se7ensky-restify-preflight'),
    urlExtParser = require('./lib/parsers/urlext-parser'),
    bodyParser = require('./lib/parsers/body-parser'),
    xmlFormatter = require('./lib/formatters/xml-formatter'),
    csvFormatter = require('./lib/formatters/csv-formatter'),
    tokenAuth = require('./lib/auth/token-auth'),
    routeAuth = require('./lib/auth/route-auth');

Promise.promisify(config.load)()
    .then(function () {
        if (config.get) {
            var dburl = 'mongodb://' +
                config.get.mongodb.host + ':' +
                config.get.mongodb.port + '/' +
                config.get.mongodb.dbname;
            mongoose.connect(dburl);
            mongoose.model('User', require('./models/user').User);
            mongoose.model('ApiKey', require('./models/api-key').ApiKey);
            mongoose.model('AccessToken', require('./models/access-token').AccessToken);
            mongoose.model('Channel', require('./models/channel').Channel);
            mongoose.model('Package', require('./models/package').Package);
            mongoose.model('Stream', require('./models/stream').Stream);
            console.log('Connected to MongoDB at', dburl);

            lmdbClient.openEnv(config.get.lmdb.path, config.get.lmdb.mapsize * 1024 * 1024, config.get.lmdb.maxdbs);
            lmdbClient.registerSchema('Package', require('./models/lmdb/package').Package);
            lmdbClient.registerSchema('Channel', require('./models/lmdb/channel').Channel);
            lmdbClient.registerSchema('Stream', require('./models/lmdb/stream').Stream);
            lmdbClient.registerSchema('AccessToken', require('./models/lmdb/access-token').AccessToken);
            lmdbClient.registerSchema('ApiKey', require('./models/lmdb/api-key').ApiKey);
            lmdbClient.registerSchema('User', require('./models/lmdb/user').User);

        } else {
            throw new Error('Server has not been configured yet. Please run bin/setup.');
        }

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

        preflightEnabler(server, {headers: ['Authorization', 'Basic']});

        server.use(restify.fullResponse());
        server.use(restify.gzipResponse());
        server.use(restify.authorizationParser());
        server.use(tokenAuth());
        server.use(routeAuth());
        server.use(bodyParser());
        server.use(restify.queryParser());

        var routes = require('./routes')(config);

        for (var path in routes) {
            if (typeof routes[path] === 'object') {
                for (var method in routes[path]) {
                    if (typeof routes[path][method] === 'object') {
                        var routeType = routes[path][method].overrideVerb || method;
                        server[routeType](path, routes[path][method].controller);
                    }
                }
            }
        }

        server.listen(config.get.api_server.port, config.get.api_server.host, function () {
            console.log('%s listening at %s', server.name, server.url);
        });
    })
    .catch(function (err) {
        console.log(err.message);
    });
