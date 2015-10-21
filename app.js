'use strict';

var Promise = require('bluebird'),
    config = require('./lib/config');

Promise.promisify(config.load)()
    .then(function checkConfig() {
        if (typeof config.get !== 'object') {
            throw new Error('Server has not been configured yet. Please run bin/setup.');
        }
    })
    .then(function setupSearch() {
        var search = require('./lib/search');
        return search.setBasepath('./index');
    })
    .then(function openLmdbEnv() {
        var lmdbSys = require('./lib/lmdb/sys');
        return lmdbSys.openEnv(config.get.lmdb.path, config.get.lmdb.mapsize * 1024 * 1024, config.get.lmdb.maxdbs);
    })
    .then(function setupLmdb(lmdbEnv) {
        var lmdbMeta = require('./lib/lmdb/meta'),
            lmdbStream = require('./lib/lmdb/stream');
        lmdbStream.setEnv(lmdbEnv);
        lmdbMeta.setEnv(lmdbEnv);
        lmdbMeta.registerSchema('Package', require('./models/lmdb/package').Package);
        lmdbMeta.registerSchema('Channel', require('./models/lmdb/channel').Channel);
        lmdbMeta.registerSchema('Stream', require('./models/lmdb/stream').Stream);
        lmdbMeta.registerSchema('AccessToken', require('./models/lmdb/access-token').AccessToken);
        lmdbMeta.registerSchema('ApiKey', require('./models/lmdb/api-key').ApiKey);
        lmdbMeta.registerSchema('User', require('./models/lmdb/user').User);
    })
    .then(function setupMongodb(lmdbEnv) {
        var mongoose = require('mongoose'),
            dburl = 'mongodb://' +
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
        console.log('Connected to MongoDB at %s', dburl);
    })
    .then(function setupServer() {
        var restify = require('restify'),
            preflightEnabler = require('se7ensky-restify-preflight'),
            server = restify.createServer({
            name: "PieceMeta API Server",
            version: require("./package.json").version,
            formatters: {
                'application/msgpack': function formatMsgPack(req, res, body) {
                    var msgPack = require('msgpack');
                    return msgPack.pack(body);
                },
                'application/xml': function formatXml(req, res, body) {
                    return require('./lib/formatters/xml-formatter')(req, res, body);
                },
                'text/csv': function formatCsv(req, res, body) {
                    return require('./lib/formatters/csv-formatter')(req, res, body);
                }
            }
        });
        server.pre(restify.pre.userAgentConnection());
        server.pre(require('./lib/parsers/urlext-parser')());

        server.use(restify.CORS({
            credentials: true,
            origins: ['*'],
            allow_headers: ['Authorization', 'Basic']
        }));

        preflightEnabler(server, {headers: ['Authorization', 'Basic']});

        server.use(restify.fullResponse());
        server.use(restify.gzipResponse());
        server.use(restify.authorizationParser());
        server.use(require('./lib/auth/token-auth')());
        server.use(require('./lib/auth/route-auth')());
        server.use(require('./lib/parsers/body-parser')());
        server.use(restify.queryParser());

        return server;
    })
    .then(function setupRoutes(server) {
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
        return server;
    })
    .then(function runServer(server) {
        server.listen(config.get.api_server.port, config.get.api_server.host, function () {
            console.log('%s listening at %s', server.name, server.url);
        });
    })
    .catch(function (err) {
        console.log(err.message);
    });
