(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        Stream = Schema({

            channel_id: { type: Schema.Types.ObjectId, index: true, required: true },
            user_id: { type: Schema.Types.ObjectId, index: true, required: true },
            title: { type: String, required: true },
            group: { type: String },
            frames: [Number],
            fps: Number,

            created: Date,
            updated: Date

        });

    if (typeof Stream.options.toJSON === 'undefined') {
        Stream.options.toJSON = {};
    }

    Stream.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    if (typeof Stream.options.toObject === 'undefined') {
        Stream.options.toObject = {};
    }

    Stream.options.toObject.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    Stream.pre('save', function (next) {
        var now = Date.now();
        this.updated = now;
        if (!this.created) {
            this.created = now;
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
        obj.id = obj._id.toString();
        obj.channel_id = obj.channel_id.toString();
        obj.user_id = obj.user_id.toString();
        delete obj._id;
        delete obj.__v;
    }

    module.exports.Stream = Stream;
}());