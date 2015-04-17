(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        ApiServer = new Schema({
            uuid: { type: String, unique: true },
            host: String,
            port: Number,
            secure: Boolean,
            last_updated: Date,
            last_status: Number,
            created: Date,
            updated: Date
        }, {
            autoindex: process.env.NODE_ENV !== 'production',
            id: false
        });

    module.exports.ApiServer = require('../../lib/model-helper').setup(ApiServer);
}());