(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        Tracker = Schema({
            host: String,
            port: Number,
            secure: Boolean,
            last_updated: Date,
            last_status: Number,
            created: Date,
            updated: Date
        });

    if (typeof Tracker.options.toJSON === 'undefined') {
        Tracker.options.toJSON = {};
    }

    Tracker.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
        delete ret.scopes;
    };

    if (typeof Tracker.options.toObject === 'undefined') {
        Tracker.options.toObject = {};
    }

    Tracker.options.toObject.transform = function (doc, ret, options) {
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
        obj.id = obj._id.toString();
        delete obj.__v;
        delete obj._id;
    }

    module.exports.Tracker = Tracker;
}());