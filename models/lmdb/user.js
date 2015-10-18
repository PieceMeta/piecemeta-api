'use strict';

var User = {

    uuid: {type: 'string', index: true, unique: true},
    name: {type: 'string', required: true},
    email: {type: 'string', required: true, unique: true},
    crypted_password: {type: 'string', required: true},
    password_salt: {type: 'string', required: true},
    confirmed: {type: 'boolean', default: false},
    blocked: {type: 'boolean', default: false},
    last_login: {type: 'date'},
    failed_logins: {type: 'number', default: 0},
    single_access_token: {type: 'string'},

    created: 'date',
    updated: 'date'

};

module.exports.User = User;