(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        AccessTokenModel = Schema({
            api_key: { type: String, index: true },
            token: String,
            scopes: [String],
            issued: Date,
            hours_valid: { type: Number, default: 1440 }
        });

    if (typeof AccessTokenModel.options.toJSON === 'undefined') {
        AccessTokenModel.options.toJSON = {};
    }

    AccessTokenModel.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    if (typeof AccessTokenModel.options.toObject === 'undefined') {
        AccessTokenModel.options.toObject = {};
    }

    AccessTokenModel.options.toObject.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    AccessTokenModel.pre('save', function (next) {
        this.issued = Date.now();
        if (typeof this.token === 'undefined' || this.access_token_expires < Date.now()) {
            this.generateAccessToken();
        }
        next();
    });

    AccessTokenModel.methods.isValid = function () {
        var expiration = Date.now();
        expiration.setHours(expiration.getHours() + this.hours_valid);
        return this.issued < expiration;
    };

    AccessTokenModel.methods.generateAccessToken = function (callback) {
        var secureRandom = require('secure-random');

        this.token = secureRandom.randomBuffer(64).toString('hex');

        if (callback) {
            this.save(function (err) {
                if (err) {
                    if (typeof callback === 'function') {
                        callback(err);
                    }
                } else {
                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            });
        }
    };

    function filterParams(obj) {
        delete obj.id;
        delete obj._id;
    }

    module.exports.AccessTokenModel = AccessTokenModel;
}());