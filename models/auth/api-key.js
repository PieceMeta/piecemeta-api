(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        ApiKey = Schema({
            user_id: Schema.Types.ObjectId,
            key: String,
            secret: String,
            scopes: { type: [String], default: ['user'] },
            created: Date,
            updated: Date,
            active: { type: Boolean, default: true }
        });

    if (typeof ApiKey.options.toJSON === 'undefined') {
        ApiKey.options.toJSON = {};
    }

    ApiKey.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
        delete ret.scopes;
    };

    if (typeof ApiKey.options.toObject === 'undefined') {
        ApiKey.options.toObject = {};
    }

    ApiKey.options.toObject.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    ApiKey.pre('save', function (next) {
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

    ApiKey.methods.isScopeAllowed = function (scope) {
        return this.scopes.indexOf(scope) > -1;
    };

    ApiKey.methods.generateApiCredentials = function (callback) {
        var secureRandom = require('secure-random'),
            sha1 = require('sha1');

        this.key = sha1(secureRandom.randomBuffer(8).toString('hex') + this.email + secureRandom.randomBuffer(8).toString('hex'));
        this.secret = secureRandom.randomBuffer(128).toString('hex');

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
        delete obj.active;
        delete obj.id;
        delete obj._id;
    }

    module.exports.ApiKey = ApiKey;
}());