'use strict';

var LmdbModel = require('../lib/lmdb/model');

class AccessToken extends LmdbModel {
    constructor() {
        this.schema = {

            uuid: {type: String, primary: true},
            token: {type: String, index: true},
            api_key: {type: String, index: true, required: true},
            scopes: {type: Array, default: ['user'], arrayType: String, unique: true},
            issued: Date,
            hours_valid: {type: Number, default: 1440}

        };
        super();
    }

    isValid() {
        var expiration = new Date();
        expiration.setHours(expiration.getHours() + this.doc.hours_valid);
        return this.doc.issued < expiration;
    }

    generateAccessToken() {
        var secureRandom = require('secure-random');
        return secureRandom.randomBuffer(128).toString('hex');
    }
}

module.exports = AccessToken;