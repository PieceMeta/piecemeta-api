'use strict';

var LmdbModel = require('../lib/lmdb/model');

class Channel extends LmdbModel {
    constructor() {
        this.schema = {

            uuid: {type: 'string', index: true, unique: true},
            user_uuid: {type: 'string', index: true, required: true},
            package_uuid: {type: 'string', index: true, required: true},
            title: {type: 'string', required: true},
            description: {type: 'string'},

            created: 'date',
            updated: 'date'

        };
        super();
    }
}

module.exports = Channel;