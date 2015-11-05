'use strict';

module.exports = function () {
    return function (req, res, next) {
        if (!req.user && req.params.uuid === 'me' || req.user && req.params.uuid !== req.user.uuid) {
            res.send(new require('restify').NotAuthorizedError());
            return next();
        } else if (req.user && req.params.uuid === 'me') {
            req.params.uuid = req.user.uuid;
        }
        next();
    };
};