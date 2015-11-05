'use strict';

var Promise = require('bluebird'),
    restify = require('restify'),
    preflight = require('se7ensky-restify-preflight'),
    config = require('./lib/config'),
    search = require('./lib/search'),
    lmdbSys = require('./lib/lmdb/sys'),
    lmdbMeta = require('./lib/lmdb/meta'),
    lmdbStream = require('./lib/lmdb/stream');

Promise.coroutine(function* () {
    var lmdbEnv, server, routes,
        version = require("./package.json").version;

    yield config.load();

    if (typeof config.get !== 'object') {
        throw new Error('Server has not been configured yet. Please run bin/setup.');
    }

    yield search.setBasepath('./index');

    lmdbEnv = yield lmdbSys.openEnv(
        config.get.lmdb.path,
        config.get.lmdb.mapsize * 1024 * 1024,
        config.get.lmdb.maxdbs
    );
    lmdbStream.setEnv(lmdbEnv);
    lmdbMeta.setEnv(lmdbEnv);
    lmdbMeta.registerSchema('Package', require('./models/package'));
    lmdbMeta.registerSchema('Channel', require('./models/channel'));
    lmdbMeta.registerSchema('Stream', require('./models/stream'));
    lmdbMeta.registerSchema('AccessToken', require('./models/access-token'));
    lmdbMeta.registerSchema('ApiKey', require('./models/api-key'));
    lmdbMeta.registerSchema('User', require('./models/user'));

    server = restify.createServer({
        name: `PieceMeta API Server v${version}`,
        version: version,
        formatters: {
            'application/msgpack': (req, res, body) => {
                return require('msgpack').pack(body);
            },
            'application/xml': (req, res, body) => {
                return require('./lib/formatters/xml-formatter')(req, res, body);
            },
            'text/csv': (req, res, body) => {
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

    preflight(server, {headers: ['Authorization', 'Basic']});

    server.use(restify.fullResponse());
    server.use(restify.gzipResponse());
    server.use(restify.authorizationParser());
    server.use(require('./lib/auth/token-auth')());
    server.use(require('./lib/auth/route-auth')());
    server.use(require('./lib/parsers/user-alias-parser')());
    server.use(require('./lib/parsers/body-parser')());
    server.use(restify.queryParser());

    routes = require('./routes')();
    for (let path in routes) {
        if (typeof routes[path] === 'object') {
            for (let method in routes[path]) {
                if (typeof routes[path][method] === 'object') {
                    var routeType = routes[path][method].overrideVerb || method;
                    server[routeType](path, routes[path][method].controller);
                }
            }
        }
    }

    server.listen(config.get.api_server.port, config.get.api_server.host, () => {
        console.info(`${server.name}: ${server.url}`);
    });

})();