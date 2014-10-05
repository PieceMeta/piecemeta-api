(function () {
    'use strict';

    var restify = require('restify'),
        mongoose = require('mongoose'),
        preflightEnabler = require('se7ensky-restify-preflight'),
        urlExtParser = require('./lib/parsers/pre/urlext-parser'),
        bodyParser = require('./lib/body-parser'),
        xmlFormatter = require('./lib/formatters/xml-formatter'),
        tokenAuth = require('./lib/token-auth'),
        Settings = require('settings'),
        sysConfig = new Settings(require('./config')),
        resourceMap = require('./resource-map')();

    // Database

    mongoose.connect('mongodb://' + sysConfig.mongodb.host + ':' + sysConfig.mongodb.port + '/' + sysConfig.mongodb.database);

    mongoose.model('PackageModel', require('./models/package').PackageModel);
    mongoose.model('ChannelModel', require('./models/channel').ChannelModel);
    mongoose.model('StreamModel', require('./models/stream').StreamModel);
    mongoose.model('UserModel', require('./models/user').UserModel);
    mongoose.model('ApiKeyModel', require('./models/api_key').ApiKeyModel);
    mongoose.model('AccessTokenModel', require('./models/access_token').AccessTokenModel);


    // Server config

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
    server.use(restify.authorizationParser());
    server.use(tokenAuth());
    server.use(bodyParser());

    //  Mount resource map
    //

    for (var n in resourceMap) {
        if (typeof resourceMap[n] === 'object') {
            for (var path in resourceMap[n]) {
                if (Array.isArray(resourceMap[n][path])) {
                    var entry = resourceMap[n][path];
                    for (var i in entry) {
                        if (typeof entry[i] === 'object') {
                            server[entry[i].type](path, entry[i].controller);
                        } else {
                            console.log('failed to add route', path, entry[i]);
                        }
                    }
                }
            }
        } else {
            console.log('failed to mount resource', resourceMap[n], n);
        }
    }

    // Start server

    server.listen(sysConfig.http_port, function () {
        console.log('%s listening at %s', server.name, server.url);
    });
}());