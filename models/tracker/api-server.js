(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        ApiServer = Schema({
            uuid: { type: String, index: true },
            secret: String,
            host: String,
            port: Number,
            secure: Boolean,
            last_updated: Date,
            last_status: Number,
            created: Date,
            updated: Date
        });

    if (typeof ApiServer.options.toJSON === 'undefined') {
        ApiServer.options.toJSON = {};
    }

    ApiServer.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
        delete ret.scopes;
    };

    if (typeof ApiServer.options.toObject === 'undefined') {
        ApiServer.options.toObject = {};
    }

    ApiServer.options.toObject.transform = function (doc, ret, options) {
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
        obj.id = obj._id.toString();
        delete obj.__v;
        delete obj._id;
    }

    module.exports.ApiServer = ApiServer;
}());