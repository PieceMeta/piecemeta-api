(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        UserModel = Schema({

            name: { type: String, required: true },
            email: { type: String, required: true },
            password: { type: String, required: true },
            password_salt: String,
            confirmed: { type: Boolean, required: true, default: false },
            blocked: { type: Boolean, required: true, default: false },
            created_at: Date,
            updated_at: Date,
            last_login: Date,
            single_access_token: String,
            api_key: String,
            api_secret: String

        });

    UserModel.pre('save', function (next) {
        var now = Date.now();
        this.updated_at = now;
        if (!this.created_at) {
            this.created_at = now;
        }
        if (typeof this.password_salt === 'undefined') {
            this.password_salt = this.constructor.generatePasswordSalt();
        }
        if (typeof this.single_access_token === 'undefined' && !this.confirmed) {
            this.generateSingleAccessToken();
        }
        if (typeof this.api_key === 'undefined') {
            this.generateApiCredentials();
        }
        next();
    });

    UserModel.path('email').validate(function (value) {
        return /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/i.test(value);
    }, 'Invalid email');

    UserModel.path('password').set(function (password) {
        if (typeof this.password_salt === 'undefined') {
            this.password_salt = this.constructor.generatePasswordSalt();
        }
        return this.constructor.encryptPassword(password, this.password_salt);
    });

    UserModel.methods.isValidPassword = function (password) {
        return this.password === this.constructor.encryptPassword(password, this.password_salt);
    };

    UserModel.statics.generatePasswordSalt = function () {
        var secureRandom = require('secure-random');
        var saltbytes = secureRandom.randomBuffer(48);
        return saltbytes.toString('hex');
    };

    UserModel.statics.encryptPassword = function (password, salt) {
        var crypto = require('crypto');
        return crypto.createHash('sha512').update(password + salt).digest('hex');
    };

    UserModel.methods.confirmUser = function (callback) {
        this.single_access_token = null;
        this.confirmed = true;
        this.save(function (err) {
            if (err) {
                callback(err);
            } else {
                callback(null);
            }
        });
    };

    UserModel.methods.generateSingleAccessToken = function (callback) {
        var sha1 = require('sha1');
        this.single_access_token = sha1(this.email + Math.round(Math.random() * 1000000).toString());
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

    UserModel.methods.generateApiCredentials = function (callback) {
        var secureRandom = require('secure-random'),
            sha1 = require('sha1');
        this.api_key = sha1(secureRandom.randomBuffer(8).toString('hex') + this.email + secureRandom.randomBuffer(8).toString('hex'));
        this.api_secret = secureRandom.randomBuffer(64).toString('hex');
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

    UserModel.methods.initiatePasswordReset = function (callback) {
        this.generateSingleAccessToken(function (err) {
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
    };

    module.exports.UserModel = UserModel;
}());