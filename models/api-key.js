'use strict';

var ApiKey = {

    uuid: {type: 'string', primary: true},
    key: {type: 'string', index: true},
    secret: {type: 'string', index: true},
    user_uuid: {type: 'string', index: true, required: true},
    device_uuid: {type: 'string'},
    scopes: {type: 'array', default: ['user'], index: true},
    active: {type: 'boolean', index: true, default: true},

    created: 'date',
    updated: 'date'

};

module.exports.isScopeAllowed = function (scope) {
    return this.scopes.indexOf(scope) > -1;
};

module.exports.generateApiCredentials = function (obj) {
    var secureRandom = require('secure-random'),
        sha1 = require('sha1');
    obj.key = sha1(secureRandom.randomBuffer(8).toString('hex') + obj.email + secureRandom.randomBuffer(8).toString('hex'));
    obj.secret = secureRandom.randomBuffer(128).toString('hex');
    return;
};

module.exports.ApiKey = ApiKey;