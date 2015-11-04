'use strict';

var LmdbModel = require('../lib/lmdb/model');

class Package extends LmdbModel {
    constructor() {
        this.schema = {

            uuid: {type: String, minLength: 1, index: true},
            user_uuid: {type: String, minLength: 1, index: true},
            title: {type: String, minLength: 1},
            description: String,

            created: Date,
            updated: Date

        };
        super();
    }
}

module.exports = Package;