(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        PushSubscription = new Schema({
            api_server: { type: [require('../../models/tracker/api-server').ApiServer], required: true },
            api_key: { type: String, required: true },
            api_secret: { type: String, required: true },
            access_token: String,
            last_updated: Date,
            last_status: Number,
            created: Date,
            updated: Date
        }, {
            autoindex: process.env.NODE_ENV !== 'production',
            id: false
        });

    module.exports.PushSubscription = require('../../lib/model-helper').setup(PushSubscription);
}());