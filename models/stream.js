(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        Stream = new Schema({

            uuid: { type: String, unique: true },
            namespace: { type: String, required: true },
            channel_uuid: { type: String, index: true, required: true },
            user_uuid: { type: String, index: true, required: true },
            title: { type: String, required: true },
            group: { type: String },
            frames: [Number],
            fps: Number,

            created: Date,
            updated: Date

        }, {
            autoindex: process.env.NODE_ENV !== 'production',
            id: false
        });

    require('../lib/model-helper').setup(Stream);

    Stream.path('group').set(function (val) {
        var sanitizer = require('sanitizer');
        return sanitizer.sanitize(val);
    });

    module.exports.Stream = Stream;
}());