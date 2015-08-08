'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Stream = new Schema({

        uuid: {type: String, unique: true},
        channel_uuid: {type: String, index: true, required: true},
        package_uuid: {type: String, index: true, required: true},
        user_uuid: {type: String, index: true, required: true},
        title: {type: String, required: true},
        group: {type: String},
        frameCount: Number,
        labels: [String],
        format: String,
        fps: Number,

        created: Date,
        updated: Date

    }, {
        autoindex: process.env.NODE_ENV !== 'production',
        id: false
    });

require('../lib/util/model-helper').setup(Stream, function (next) {
    var now = Date.now(),
        sanitizer = require('sanitizer');
    if (typeof this.title !== 'undefined') {
        this.title = sanitizer.sanitize(this.title);
    }
    if (typeof this.description !== 'undefined') {
        this.description = sanitizer.sanitize(this.description);
    }
    this.updated = now;
    if (!this.created) {
        this.created = now;
    }
    if (!this.format) {
        this.format = 'float';
    }
    if (!this.uuid) {
        this.generateUUID();
    }
    next();
});

Stream.path('group').set(function (val) {
    var sanitizer = require('sanitizer');
    return sanitizer.sanitize(val);
});

module.exports.Stream = Stream;
