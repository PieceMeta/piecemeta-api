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

    if (typeof Stream.options.toJSON === 'undefined') {
        Stream.options.toJSON = {};
    }

    Stream.options.toJSON.transform = function (doc, ret) {
        filterParams(ret);
    };

    if (typeof Stream.options.toObject === 'undefined') {
        Stream.options.toObject = {};
    }

    Stream.options.toObject.transform = function (doc, ret) {
        filterParams(ret);
    };

    Stream.methods.generateUUID = function () {
        var uuid = require('../lib/util/uuid');
        this.uuid = uuid.v4();
    };

    Stream.pre('save', function (next) {
        var now = Date.now();
        this.updated = now;
        if (!this.created) {
            this.created = now;
        }
        if (!this.uuid) {
            this.generateUUID();
        }
        next();
    });

    Stream.path('title').set(function (val) {
        var sanitizer = require('sanitizer');
        return sanitizer.sanitize(val);
    });

    Stream.path('group').set(function (val) {
        var sanitizer = require('sanitizer');
        return sanitizer.sanitize(val);
    });

    function filterParams(obj) {
        delete obj.__v;
        delete obj._id;
    }

    module.exports.Stream = Stream;
}());