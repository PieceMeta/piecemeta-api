'use strict';

var AccessToken = {

    uuid: {type: 'string', primary: true},
    token: {type: 'string', index: true},
    api_key: {type: 'string', index: true, required: true},
    scopes: {type: 'array', default: ['user']},
    issued: 'date',
    hours_valid: {type: 'number', default: 1440}

};

module.exports.AccessToken = AccessToken;