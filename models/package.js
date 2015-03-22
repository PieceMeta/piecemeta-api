(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        Package = Schema({

            uuid: { type: String, unique: true },
            namespace: { type: String, required: true },
            user_uuid: { type: String, index: true, required: true },
            title: { type: String, required: true },
            description: { type: String },

            created: Date,
            updated: Date

        }, {
            autoindex: process.env.NODE_ENV !== 'production',
            id: false
        });

    if (typeof Package.options.toJSON === 'undefined') {
        Package.options.toJSON = {};
    }

    Package.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    if (typeof Package.options.toObject === 'undefined') {
        Package.options.toObject = {};
    }

    Package.options.toObject.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    Package.methods.generateUUID = function () {
        var uuid = require('../lib/util/uuid');
        this.uuid = uuid.v4();
    };

    Package.pre('save', function (next) {
        var now = Date.now(),
            sanitizer = require('sanitizer');
        this.title = sanitizer.sanitize(this.title);
        this.description = sanitizer.sanitize(this.description);
        this.updated = now;
        if (!this.created) {
            this.created = now;
        }
        if (!this.uuid) {
            this.generateUUID();
        }
        next();
    });

    function filterParams(obj) {
        delete obj.__v;
        delete obj._id;
    }

    module.exports.Package = Package;
}());