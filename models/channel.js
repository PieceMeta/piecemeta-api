'use strict';

var Channel = {

    uuid: {type: 'string', index: true, unique: true},
    user_uuid: {type: 'string', index: true, required: true},
    package_uuid: {type: 'string', index: true, required: true},
    title: {type: 'string', required: true},
    description: {type: 'string'},

    created: 'date',
    updated: 'date'

};

module.exports.Channel = Channel;