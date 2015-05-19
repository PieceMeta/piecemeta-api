(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        Channel = new Schema({

            uuid: { type: String, unique: true },
            namespace: { type: String, required: true },
            package_uuid: { type: String, index: true, required: true },
            user_uuid: { type: String, index: true, required: true },
            title: { type: String, required: true },
            parent_channel_uuid: { type: String, index: true },

            created: Date,
            updated: Date

        }, {
            autoindex: process.env.NODE_ENV !== 'production',
            id: false
        });

    module.exports.Channel = require('../lib/util/model-helper').setup(Channel);
}());