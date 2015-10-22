#!/usr/bin/env node

'use strict';

var async = require('async'),
    path = require('path'),
    prompt = require('prompt');

prompt.message = "";
prompt.delimiter = "";
prompt.start();

async.waterfall([
    function (cb) {
        console.log('\nWelcome to the PieceMeta API Server setup.'.yellow);
        loadConfig(cb);
    },
    function (config, cb) {
        if (config) {
            cb(null);
        } else {
            initialSetup(cb);
        }
    },
    function (cb) {
        createAdminUser(cb);
    }
], function (err) {
    console.log('\n');
    if (err) {
        console.log('PieceMeta API Server setup failed.'.red, err);
        process.exit(1);
    } else {
        console.log('PieceMeta API Server setup successful.'.green);
        process.exit(0);
    }
});

function initialSetup(callback) {
    var config = {
        lmdb: null,
        api_server: null,
        mongodb: null,
        mailer: null
    };
    async.waterfall([
        function (cb) {
            console.log('You will now need to provide a little info to be able to start the server.');
            cb();
        },
        function (cb) {
            console.log('\nAPI SERVER\n'.cyan);
            prompt.get({
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
            }, function (err, data) {
                if (data) {
                    config.api_server = data;
                    var uuid = require('../lib/util/uuid');
                    config.api_server.uuid = uuid.v4();
                }
                cb(err);
            });
        },
        function (cb) {
            prompt.get({
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
            }, function (err, data) {
                if (data) {
                    config.api_server.port = data.port;
                }
                cb(err);
            });
        },
        function (cb) {
            console.log('\nMONGODB\n'.cyan);
            prompt.get({
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
            }, function (err, data) {
                if (data) {
                    config.mongodb = data;
                }
                cb(err);
            });
        },
        function (cb) {
            console.log('\nLMDB\n'.cyan);
            prompt.get({
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
            }, function (err, data) {
                if (data) {
                    config.lmdb = data;
                }
                cb(err);
            });
        },
        function (cb) {
            console.log('\nEMAIL NOTIFICATIONS\n'.cyan);
            prompt.get({
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
            }, function (err, data) {
                if (data) {
                    config.mailer = data;
                }
                cb(err);
            });
        },
        function (cb) {
            console.log('\nWriting config.json...\n');
            saveConfig(config, cb);
        }
    ], function (err) {
        callback(err);
    });
}

function createAdminUser(callback) {
    var mongoose = require('mongoose');
    async.waterfall([
        function (cb) {
            console.log('\nCREATE ADMIN USER\n'.cyan);
            prompt.get({
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
            }, cb);
        },
        function (data, cb) {
            loadConfig(function (err, config) {
                cb(err, data, config);
            });
        },
        function (data, config, cb) {
            mongoose.connect('mongodb://' + config.mongodb.host + ':' + config.mongodb.port + '/' + config.mongodb.dbname);
            mongoose.model('User', require('legacy/models/user').User);
            var user = {
                name: data.name,
                email: data.email,
                password: data.password,
                confirmed: true
            };
            console.log(user);
            mongoose.model('User').create(user, cb);
        },
        function (user, cb) {
            console.log(user);
            mongoose.model('ApiKey', require('legacy/models/api-key').ApiKey);
            mongoose.model('ApiKey').create({user_uuid: user.uuid, scopes: ['user', 'admin']}, cb);
        }
    ], function (err, apikey) {
        console.log(apikey);
        callback(err);
    });
}

function loadConfig(callback) {
    var fs = require('fs'),
        path = require('path');
    fs.readFile(path.join(__dirname, '..', 'config.json'), function (err, data) {
        callback(err && err.code !== 'ENOENT' ? err : null, data ? JSON.parse(data) : null);
    });
}

function saveConfig(config, callback) {
    var fs = require('fs'),
        path = require('path');
    fs.writeFile(path.join(__dirname, '..', 'config.json'), JSON.stringify(config, null, '\t'), function (err) {
        callback(err);
    });
}
