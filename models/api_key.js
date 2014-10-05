(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        ApiKeyModel = Schema({
            user_id: Schema.Types.ObjectId,
            key: String,
            secret: String,
            scopes: [String],
            created: Date,
            updated: Date,
            active: { type: Boolean, default: true }
        });

    if (typeof ApiKeyModel.options.toJSON === 'undefined') {
        ApiKeyModel.options.toJSON = {};
    }

    ApiKeyModel.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    if (typeof ApiKeyModel.options.toObject === 'undefined') {
        ApiKeyModel.options.toObject = {};
    }

    ApiKeyModel.options.toObject.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    ApiKeyModel.pre('save', function (next) {
        var now = Date.now();
        this.updated = now;
        if (!this.created) {
            this.created = now;
        }
        if (typeof this.key === 'undefined' || typeof this.secret === 'undefined') {
            this.generateApiCredentials();
        }
        next();
    });

    ApiKeyModel.methods.generateApiCredentials = function (callback) {
        var secureRandom = require('secure-random'),
            sha1 = require('sha1');

        this.key = sha1(secureRandom.randomBuffer(8).toString('hex') + this.email + secureRandom.randomBuffer(8).toString('hex'));
        this.secret = secureRandom.randomBuffer(64).toString('hex');

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
        delete obj.active;
        delete obj.id;
        delete obj._id;
    }

    module.exports.ApiKeyModel = ApiKeyModel;
}());