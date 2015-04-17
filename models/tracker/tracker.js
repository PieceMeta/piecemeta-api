(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        Tracker = new Schema({
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

    if (typeof Tracker.options.toJSON === 'undefined') {
        Tracker.options.toJSON = {};
    }

    Tracker.options.toJSON.transform = function (doc, ret) {
        filterParams(ret);
        delete ret.scopes;
    };

    if (typeof Tracker.options.toObject === 'undefined') {
        Tracker.options.toObject = {};
    }

    Tracker.options.toObject.transform = function (doc, ret) {
        filterParams(ret);
    };

    Tracker.pre('save', function (next) {
        var now = Date.now();
        this.updated = now;
        if (!this.created) {
            this.created = now;
        }
        next();
    });

    function filterParams(obj) {
        delete obj.__v;
        delete obj._id;
    }

    module.exports.Tracker = Tracker;
}());