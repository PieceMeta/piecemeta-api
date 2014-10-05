(function () {
    'use strict';

    module.exports.post = function (req, res, next) {
        var mongoose = require('mongoose'),
            restify = require('restify');

        mongoose.model('AccessTokenModel')
            .findOne({ api_key: req.params.key }, function (err, token) {
                if (err) {
                    console.log(err);
                    res.send(new restify.InternalError());
                    return next();
                }
                if (token && token.isValid) {
                    res.send(201, token);
                    next();
                } else {
                    mongoose.model('AccessTokenModel').create({ api_key: req.params.key }, function (err, token) {
                        console.log(token, err);
                        if (err) {
                            console.log(err);
                            res.send(new restify.InternalError());
                            return next();
                        }
                        res.send(201, token);
                        next();
                    });
                }
            });
    };

}());