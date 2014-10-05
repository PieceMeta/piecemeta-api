(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        uniqueValidator = require('mongoose-unique-validator'),
        UserModel = Schema({

            name: { type: String, required: true },
            email: { type: String, index: true, unique: true, required: true },
            avatar: { type: String, default: 'robohash' },
            crypted_password: { type: String, required: true },
            password_salt: String,
            confirmed: { type: Boolean, default: false },
            blocked: { type: Boolean, default: false },
            created: Date,
            updated: Date,
            single_access_token: String

        });

    UserModel.plugin(uniqueValidator, { message: 'This E-Mail is already registered.' });

    if (typeof UserModel.options.toJSON === 'undefined') {
        UserModel.options.toJSON = {};
    }

    UserModel.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    if (typeof UserModel.options.toObject === 'undefined') {
        UserModel.options.toObject = {};
    }

    UserModel.options.toObject.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    UserModel.pre('save', function (next) {
        var now = Date.now();
        this.updated = now;
        if (!this.created) {
            this.created = now;
        }
        if (typeof this.password_salt === 'undefined') {
            this.password_salt = this.constructor.generatePasswordSalt();
        }
        if (typeof this.single_access_token === 'undefined' && !this.confirmed) {
            this.generateSingleAccessToken();
        }
        next();
    });

    UserModel.path('email').validate(function (value) {
        return /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/i.test(value);
    }, 'Invalid email');

    UserModel.virtual('password').set(function (password) {
        if (typeof this.password_salt === 'undefined') {
            this.password_salt = this.constructor.generatePasswordSalt();
        }
        this.crypted_password = this.constructor.encryptPassword(password, this.password_salt);
    });

    UserModel.methods.isValidPassword = function (password) {
        return this.crypted_password === this.constructor.encryptPassword(password, this.password_salt);
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

    function filterParams(obj) {
        obj.id = obj._id.toString();
        delete obj.crypted_password;
        delete obj.single_access_token;
        delete obj.password_salt;
        delete obj.blocked;
        delete obj.confirmed;
        delete obj._id;
    }

    module.exports.UserModel = UserModel;
}());