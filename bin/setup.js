#!/usr/bin/env node

'use strict';

var Promise = require('bluebird'),
    path = require('path'),
    prompt = require('prompt'),
    search = require('../lib/search'),
    lmdbSys = require('../lib/lmdb/sys'),
    lmdbMeta = require('../lib/lmdb/meta');

Promise.promisifyAll(prompt);

prompt.message = "";
prompt.delimiter = "";
prompt.start();

Promise.coroutine(function* () {
    console.log('\nWelcome to the PieceMeta API Server setup.'.yellow);

    var config = yield loadConfig();

    if (!config) {
        yield serverSetup();
    }

    yield createAdminUser();

    console.log('PieceMeta API Server setup successful.'.green);
    process.exit(0);
})()
.catch(function (err) {
    console.log(`PieceMeta API Server setup failed: ${err.message}`.red);
    process.exit(1);
});

function serverSetup() {
    return Promise.coroutine(function* () {
        var config = {
            lmdb: null,
            api_server: null,
            mongodb: null,
            mailer: null
        };

        console.log('You will now need to provide a little info to be able to start the server.');

        console.log('\nAPI SERVER\n'.cyan);

        config.api_server = yield prompt.getAsync({
            properties: {
                host: {
                    description: 'Enter the API Server\'s hostname',
                    type: 'string',
                    default: 'localhost',
                    required: true
                },
                secure: {
                    description: 'Is the API Server accessible via HTTPS?',
                    type: 'boolean',
                    default: false,
                    required: true
                }
            }
        });

        var uuid = require('../lib/util/uuid');
        config.api_server.uuid = uuid.v4();

        config.api_server.port = yield prompt.getAsync({
            properties: {
                port: {
                    description: 'Enter the API Server\'s port',
                    type: 'number',
                    pattern: /^[0-9]+$/,
                    message: 'Port must be a number',
                    default: config.api_server.secure ? 4443 : 8080,
                    required: true
                }
            }
        });

        console.log('\nMONGODB\n'.cyan);

        config.mongodb = yield prompt.getAsync({
            properties: {
                host: {
                    description: 'Enter the MongoDB hostname',
                    type: 'string',
                    default: 'localhost',
                    required: true
                },
                port: {
                    description: 'Enter the MongoDB port',
                    type: 'number',
                    pattern: /^[0-9]+$/,
                    message: 'Port must be a number',
                    default: 27017,
                    required: true
                },
                dbname: {
                    description: 'Database name',
                    type: 'string',
                    default: 'piecemeta-api',
                    required: true
                },
                user: {
                    description: 'Database user (optional)',
                    type: 'string'
                },
                pass: {
                    description: 'Database password (optional)',
                    type: 'string',
                    hidden: true
                }
            }
        });

        console.log('\nLMDB\n'.cyan);

        config.lmdb = yield prompt.getAsync({
            properties: {
                path: {
                    description: 'Enter the LMDB data path',
                    type: 'string',
                    default: path.resolve('../lmdb'),
                    required: true
                },
                mapsize: {
                    description: 'Enter the mapsize (in MB)',
                    type: 'number',
                    pattern: /^[0-9]+$/,
                    message: 'Mapsize must be a number',
                    default: 4096,
                    required: true
                },
                maxdbs: {
                    description: 'Maximum number of DBs (each data package uses a db)',
                    type: 'number',
                    pattern: /^[0-9]+$/,
                    message: 'Max DBs must be a number',
                    default: 256,
                    required: true
                }
            }
        });

        console.log('\nEMAIL NOTIFICATIONS\n'.cyan);

        config.mailer = yield prompt.getAsync({
            properties: {
                address: {
                    description: 'Send notifications from this address',
                    type: 'string',
                    required: true
                },
                host: {
                    description: 'SMTP Host',
                    type: 'string',
                    required: true
                },
                port: {
                    description: 'SMTP Port',
                    type: 'number',
                    pattern: /^[0-9]+$/,
                    message: 'Port must be a number',
                    default: 465,
                    required: true
                },
                secure: {
                    description: 'Secure connection?',
                    type: 'boolean',
                    default: true,
                    required: true
                },
                user: {
                    description: 'SMTP user (optional)',
                    type: 'string'
                },
                pass: {
                    description: 'SMTP password (optional)',
                    type: 'string',
                    hidden: true
                }
            }
        });

        console.log('\nWriting config.json...\n');

        yield saveConfig(config);
    })();
}

function createAdminUser() {
    return Promise.coroutine(function* () {
        console.log('\nCREATE ADMIN USER\n'.cyan);

        var config = yield loadConfig(),
            user = yield prompt.getAsync({
                properties: {
                    name: {
                        description: 'Name',
                        type: 'string',
                        default: 'Admin',
                        required: true
                    },
                    email: {
                        description: 'EMail',
                        type: 'string',
                        required: true
                    },
                    password: {
                        description: 'Password',
                        type: 'string',
                        required: true,
                        hidden: true
                    },
                    password_confirm: {
                        description: 'Repeat password',
                        type: 'string',
                        required: true,
                        hidden: true
                    }
                }
            });

        user.confirmed = true;

        yield search.setBasepath('../index');
        var lmdbEnv = yield lmdbSys.openEnv(
            config.lmdb.path,
            config.lmdb.mapsize * 1024 * 1024,
            config.lmdb.maxdbs
        );
        lmdbMeta.setEnv(lmdbEnv);
        lmdbMeta.registerSchema('User', require('../models/user'));
        lmdbMeta.registerSchema('ApiKey', require('../models/api-key'));

        var dbi = yield lmdbSys.openDb('User'),
            userResult = yield lmdbMeta.createMetaData(dbi, 'User', user);
        yield lmdbSys.closeDb(dbi);
        dbi = yield lmdbSys.openDb('ApiKey');
        yield lmdbMeta.createMetaData(dbi, 'ApiKey', {user_uuid: userResult.uuid, scopes: ['user', 'admin']});
        yield lmdbSys.closeDb(dbi);
    })();
}

function loadConfig() {
    var fs = require('fs'),
        path = require('path');
    return Promise.promisify(fs.readFile)(path.join(__dirname, '..', 'config.json'))
        .then(function (data) {
            return data ? JSON.parse(data) : null;
        })
        .catch(function () {
            return null;
        });
}

function saveConfig(config) {
    var fs = require('fs'),
        path = require('path');
    return Promise.promisify(fs.writeFile)(path.join(__dirname, '..', 'config.json'), JSON.stringify(config, null, '\t'));
}