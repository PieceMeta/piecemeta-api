(function () {
    'use strict';
    var mongoose = require('mongoose'),
        validator = require('validator'),
        Schema = mongoose.Schema,
        uniqueValidator = require('mongoose-unique-validator'),
        User = new Schema({

            uuid: { type: String, unique: true },
            name: { type: String, required: true },
            email: { type: String, index: true, unique: true, required: true },
            crypted_password: { type: String, required: true },
            password_salt: { type: String, required: true },
            confirmed: { type: Boolean, default: false },
            blocked: { type: Boolean, default: false },
            created: Date,
            updated: Date,
            last_login: Date,
            failed_logins: { type: Number, default: 0 },
            single_access_token: String

        }, {
            autoindex: process.env.NODE_ENV !== 'production',
            id: false
        });

    User.plugin(uniqueValidator, { message: 'This E-Mail is already registered.' });

    if (typeof User.options.toJSON === 'undefined') {
        User.options.toJSON = {};
    }

    User.options.toJSON.transform = function (doc, ret) {
        filterParams(ret);
    };

    if (typeof User.options.toObject === 'undefined') {
        User.options.toObject = {};
    }

    User.options.toObject.transform = function (doc, ret) {
        filterParams(ret);
    };

    User.pre('save', function (next) {
        var now = Date.now(),
            sanitizer = require('sanitizer');
        this.updated = now;
        this.name = sanitizer.sanitize(this.name);
        if (!this.uuid) {
            this.generateUUID();
        }
        if (!this.created) {
            this.created = now;
        }
        if (typeof this.password_salt === 'undefined') {
            this.password_salt = this.constructor.generatePasswordSalt();
        }
        if (typeof this.single_access_token === 'undefined' && !this.confirmed) {
            this.generateSingleAccessToken();
        }
        if (this.modifiedPaths().indexOf('crypted_password') > -1) {
            var instance = this;
            this.constructor.encryptPassword(this.crypted_password, this.password_salt, function (err, crypted_password) {
                instance.crypted_password = crypted_password;
                next();
            });
        } else {
            next();
        }
    });

    User.path('email').validate(function (value) {
        return validator.isEmail(value);
    }, 'Invalid email');

    User.path('crypted_password').validate(function (value) {
        return validator.isLength(value, 8);
    }, 'Password must be at least 8 characters long.');

    User.virtual('password').set(function (password) {
        this.password_salt = this.constructor.generatePasswordSalt();
        this.crypted_password = password;
    });

    User.methods.isValidPassword = function (password, callback) {
        var instance = this;
        if (this.failed_logins > 3 && Date.now() - this.last_login < 300000) {
            callback(new Error('Too many failed login attempts. Account blocked for 5 minutes.'), false);
        } else {
            this.constructor.encryptPassword(password, this.password_salt, function (err, password_hash) {
                if (err) {
                    return callback(err, false);
                }
                instance.last_login = Date.now();
                var loginSuccess = instance.crypted_password === password_hash;
                if (!loginSuccess) {
                    instance.failed_logins += 1;
                } else {
                    instance.failed_logins = 0;
                }
                instance.save(function (err) {
                    callback(err, loginSuccess);
                });
            });
        }
    };

    User.statics.generatePasswordSalt = function () {
        var secureRandom = require('secure-random');
        var saltbytes = secureRandom.randomBuffer(48);
        return saltbytes.toString('hex');
    };

    User.statics.encryptPassword = function (password, salt, callback) {
        var crypto = require('crypto');
        crypto.pbkdf2(password, salt, 80000, 256, function (err, hash_bytes) {
            callback(err, hash_bytes ? hash_bytes.toString('hex') : null);
        });
    };

    User.methods.confirmUser = function (callback) {
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

    User.methods.generateUUID = function () {
        if (this.email) {
            var uuid = require('../../lib/util/uuid');
            this.uuid = uuid.v5(this.email);
        }
    };

    User.methods.generateSingleAccessToken = function (callback) {
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

    User.methods.initiatePasswordReset = function (callback) {
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
        delete obj.crypted_password;
        delete obj.password_salt;
        delete obj.blocked;
        delete obj.confirmed;
        delete obj.__v;
        delete obj._id;
    }

    module.exports.User = User;
}());