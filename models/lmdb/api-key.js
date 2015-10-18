'use strict';

var ApiKey = {

    key: {type: 'string', primary: true},
    secret: {type: 'string'},
    user_uuid: {type: 'string', index: true, required: true},
    device_uuid: {type: 'string'},
    scopes: {type: 'array', default: ['user']},
    active: {type: 'boolean', default: true},

    created: 'date',
    updated: 'date'

};

module.exports.ApiKey = ApiKey;