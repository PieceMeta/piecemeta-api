(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        Channel = Schema({

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

    if (typeof Channel.options.toJSON === 'undefined') {
        Channel.options.toJSON = {};
    }

    Channel.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    Channel.methods.generateUUID = function () {
        var uuid = require('../lib/util/uuid');
        this.uuid = uuid.v5(this.created + this.user_uuid, this.namespace);
    };

    Channel.pre('save', function (next) {
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

    Channel.path('title').set(function (val) {
        var sanitizer = require('sanitizer');
        return sanitizer.sanitize(val);
    });

    function filterParams(obj) {
        delete obj.__v;
        delete obj._id;
    }

    module.exports.Channel = Channel;
}());