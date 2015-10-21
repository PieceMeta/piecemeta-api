'use strict';

var ApiKey = {

    uuid: {type: 'string', primary: true},
    key: {type: 'string', index: true},
    secret: {type: 'string'},
    user_uuid: {type: 'string', index: true, required: true},
    device_uuid: {type: 'string'},
    scopes: {type: 'array', default: ['user']},
    active: {type: 'boolean', default: true},

    created: 'date',
    updated: 'date'

};

module.exports.ApiKey = ApiKey;