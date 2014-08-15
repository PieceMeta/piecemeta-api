module.exports.list = function (req, res, next) {
    'use strict';
    var mongoose = require('mongoose');
    mongoose.model('DataSequenceModel').find({}, function (err, data) {
        if (err) {
            console.log(err);
            res.send(500);
            return next();
        }
        res.send(200, data);
        next();
    });
};

module.exports.get = function (req, res, next) {
    'use strict';
    var mongoose = require('mongoose');
    mongoose.model('DataSequenceModel').findById(req.params.id, function (err, data) {
        if (err) {
            if (err.name && err.name === 'CastError') {
                res.send(403);
            } else {
                console.log(err);
                res.send(500);
            }
            return next();
        }
        res.send(200, data);
        next();
    });
};

module.exports.post = function (req, res, next) {
    'use strict';
    var mongoose = require('mongoose');
    mongoose.model('DataSequenceModel').create(req.params, function (err, data) {
        if (err) {
            if (err.name && err.name === 'CastError') {
                res.send(403);
            } else {
                console.log(err);
                res.send(500);
            }
            return next();
        }
        res.send(200, data);
        next();
    });
};
