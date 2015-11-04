'use strict';

var LmdbModel = require('../lib/lmdb/model');

class ApiKey extends LmdbModel {
    constructor() {
        this.schema = {

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
        super();
    }

    isScopeAllowed(scope) {
        return this.doc.scopes.indexOf(scope) > -1;
    }

    generateApiCredentials() {
        var secureRandom = require('secure-random'),
            sha1 = require('sha1');
        this.doc.key = sha1(secureRandom.randomBuffer(8).toString('hex') + this.doc.email + secureRandom.randomBuffer(8).toString('hex'));
        this.doc.secret = secureRandom.randomBuffer(128).toString('hex');
    }
}

module.exports = ApiKey;