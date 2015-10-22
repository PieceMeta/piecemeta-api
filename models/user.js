'use strict';

var User = {

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

module.exports.isValidPassword = function (password, instance, callback) {
    // TODO: to be fixed...
    if (instance.failed_logins > 3 && Date.now() - instance.last_login < 300000) {
        callback(new Error('Too many failed login attempts. Account blocked for 5 minutes.'), false);
    } else {
        this.constructor.encryptPassword(password, instance.password_salt, function (err, password_hash) {
            if (err) {
                return callback(err, false);
            }
            instance.last_login = Date.now();
            var loginSuccess = instance.crypted_password === password_hash;
            if (!loginSuccess) {
                instance.failed_logins += 1;
            } else {
                instance.failed_logins = 0;
            }
            callback(err, loginSuccess);
        });
    }
};

module.exports.generatePasswordSalt = function () {
    var secureRandom = require('secure-random');
    var saltbytes = secureRandom.randomBuffer(48);
    return saltbytes.toString('hex');
};

module.exports.encryptPassword = function (password, salt, callback) {
    var crypto = require('crypto');
    crypto.pbkdf2(password, salt, 80000, 256, function (err, hash_bytes) {
        callback(err, hash_bytes ? hash_bytes.toString('hex') : null);
    });
};

module.exports.generateUUID = function (obj) {
    if (obj.email) {
        var uuid = require('../lib/util/uuid');
        obj.uuid = uuid.v5(obj.email);
    }
    return obj;
};

module.exports.generateSingleAccessToken = function (obj) {
    var sha1 = require('sha1');
    obj.single_access_token = sha1(obj.email + Math.round(Math.random() * 1000000).toString());
    return obj;
};

module.exports.User = User;