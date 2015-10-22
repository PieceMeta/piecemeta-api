'use strict';

var AccessToken = {

    uuid: {type: 'string', primary: true},
    token: {type: 'string', index: true},
    api_key: {type: 'string', index: true, required: true},
    scopes: {type: 'array', default: ['user']},
    issued: 'date',
    hours_valid: {type: 'number', default: 1440}

};

module.exports.isValid = function (obj) {
    var expiration = new Date();
    expiration.setHours(expiration.getHours() + obj.hours_valid);
    return obj.issued < expiration;
};

module.exports.generateAccessToken = function () {
    var secureRandom = require('secure-random');
    return secureRandom.randomBuffer(128).toString('hex');
};

module.exports.AccessToken = AccessToken;