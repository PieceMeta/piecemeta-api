'use strict';

var LmdbModel = require('../lib/lmdb/model');

class Stream extends LmdbModel {
    constructor() {
        this.schema = {

            uuid: {type: 'string', index: true, unique: true},
            channel_uuid: {type: 'string', index: true, required: true},
            package_uuid: {type: 'string', index: true, required: true},
            user_uuid: {type: 'string', index: true, required: true},
            title: {type: 'string', required: true},
            description: {type: 'string'},
            group: {type: 'string'},
            frameCount: {type: 'number'},
            labels: {type: 'array', required: true},
            format: {type: 'string'},
            fps: {type: 'number', required: true},

            created: 'date',
            updated: 'date'

        };
        super();
    }
}

module.exports = Stream;