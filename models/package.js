'use strict';

var Package = {

    uuid: {type: 'string', index: true, unique: true},
    user_uuid: {type: 'string', index: true, required: true},
    title: {type: 'string', required: true},
    description: {type: 'string'},

    created: 'date',
    updated: 'date'

};

module.exports.Package = Package;