module.exports.post = function (req, res, next) {
    'use strict';
    var mongoose = require('mongoose'),
        restify = require('restify');
    var condition = { email: req.params.email };
    if (req.params.single_access_token) {
        condition = { single_access_token: req.params.single_access_token };
    }
    mongoose.model('UserModel').findOne(condition, function (err, user) {
        if (err) {
            console.log(err);
            res.send(new restify.InternalError());
            return next();
        }
        if (user && req.params.single_access_token) {
            user.confirmUser(function (err) {
                if (err) {
                    console.log('error confirming user', err);
                    res.send(new restify.NotAuthorizedError());
                    return next();
                }
                res.send(200, {
                    id: user._id.toString(),
                    api_key: user.api_key,
                    api_secret: user.api_secret
                });
                return;
            });
        }
        if (!user || (!req.params.single_access_token && !user.isValidPassword(req.params.password)) || !user.confirmed) {
            res.send(new restify.NotAuthorizedError());
            return next();
        }
        res.send(200, {
            id: user._id.toString(),
            api_key: user.api_key,
            api_secret: user.api_secret
        });
        next();
    });
};