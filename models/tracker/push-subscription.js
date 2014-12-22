(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        PushSubscription = Schema({
            api_server_uuid: { type: String, index: true },
            token: String,
            accepted: Boolean,
            last_updated: Date,
            last_status: Number,
            created: Date,
            updated: Date
        });

    if (typeof PushSubscription.options.toJSON === 'undefined') {
        PushSubscription.options.toJSON = {};
    }

    PushSubscription.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    if (typeof PushSubscription.options.toObject === 'undefined') {
        PushSubscription.options.toObject = {};
    }

    PushSubscription.options.toObject.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    PushSubscription.pre('save', function (next) {
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

    module.exports.PushSubscription = PushSubscription;
}());