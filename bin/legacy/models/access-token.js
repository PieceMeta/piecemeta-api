'use strict';
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    AccessToken = new Schema({
        api_key: { type: String, index: true, required: true },
        token: String,
        scopes: { type: [String], default: ['user'] },
        issued: Date,
        hours_valid: { type: Number, default: 1440 }
    }, {
        autoindex: process.env.NODE_ENV !== 'production',
        id: false
    });

if (typeof AccessToken.options.toJSON === 'undefined') {
    AccessToken.options.toJSON = {};
}

AccessToken.options.toJSON.transform = function (doc, ret) {
    filterParams(ret);
};

if (typeof AccessToken.options.toObject === 'undefined') {
    AccessToken.options.toObject = {};
}

AccessToken.options.toObject.transform = function (doc, ret) {
    filterParams(ret);
};

AccessToken.pre('save', function (next) {
    this.issued = Date.now();
    if (typeof this.token === 'undefined' || this.access_token_expires < Date.now()) {
        this.generateAccessToken();
    }
    next();
});

AccessToken.methods.isValid = function () {
    var expiration = new Date();
    expiration.setHours(expiration.getHours() + this.hours_valid);
    return this.issued < expiration;
};

AccessToken.methods.generateAccessToken = function (callback) {
    var secureRandom = require('secure-random');

    this.token = secureRandom.randomBuffer(128).toString('hex');

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
    delete obj.__v;
    delete obj._id;
    delete obj.scopes;
    delete obj.api_key;
}

module.exports.AccessToken = AccessToken;
