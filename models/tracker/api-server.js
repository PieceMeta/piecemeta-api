(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        ApiServer = new Schema({
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

    if (typeof ApiServer.options.toJSON === 'undefined') {
        ApiServer.options.toJSON = {};
    }

    ApiServer.options.toJSON.transform = function (doc, ret) {
        filterParams(ret);
        delete ret.scopes;
    };

    if (typeof ApiServer.options.toObject === 'undefined') {
        ApiServer.options.toObject = {};
    }

    ApiServer.options.toObject.transform = function (doc, ret) {
        filterParams(ret);
    };

    ApiServer.pre('save', function (next) {
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

    module.exports.ApiServer = ApiServer;
}());