'use strict';

var Promise = require('bluebird'),
    LmdbModel = require('../lib/lmdb/model');

class User extends LmdbModel {
    constructor() {
        this.schema = {

            uuid: {type: 'string', index: true, unique: true},
            name: {type: 'string', required: true},
            email: {type: 'string', required: true, unique: true},
            crypted_password: {type: 'string', required: true},
            password_salt: {type: 'string', required: true},
            confirmed: {type: 'boolean', default: true, index: true}, // TODO: restore user confirmation
            blocked: {type: 'boolean', default: false},
            last_login: {type: 'date'},
            failed_logins: {type: 'number', default: 0},
            single_access_token: {type: 'string', index: true},

            created: 'date',
            updated: 'date'

        };
        super();
    }

    isValidPassword(password) {
        if (this.doc.failed_logins > 3 && Date.now() - this.doc.last_login < 300000) {
            throw new Error('Too many failed login attempts. Account blocked for 5 minutes.');
        } else {
            return module.exports.encryptPassword(password, this.doc.password_salt)
                .then(function (password_hash) {
                    this.doc.last_login = Date.now();
                    var loginSuccess = this.doc.crypted_password === password_hash;
                    if (!loginSuccess) {
                        this.doc.failed_logins += 1;
                    } else {
                        this.doc.failed_logins = 0;
                    }
                    return loginSuccess;
                });
        }
    }

    generatePasswordSalt() {
        var secureRandom = require('secure-random');
        var saltbytes = secureRandom.randomBuffer(48);
        return saltbytes.toString('hex');
    }

    encryptPassword(password, salt) {
        var crypto = require('crypto');
        return Promise.promisify(crypto.pbkdf2)(password, salt, 80000, 256)
            .then(function (hash_bytes) {
                return hash_bytes ? hash_bytes.toString('hex') : null;
            });
    }

    generateUUID() {
        if (this.doc.email) {
            var uuid = require('../lib/util/uuid');
            this.doc.uuid = uuid.v5(this.doc.email);
        }
    }

    generateSingleAccessToken() {
        var sha1 = require('sha1');
        this.doc.single_access_token = sha1(this.doc.email + Math.round(Math.random() * 1000000).toString());
    }
}

module.exports.User = User;