'use strict';
module.exports = function () {
    var restify = require('restify'),
        routes = require('../../routes')();
    return function (req, res, next) {
        var currentRoute;
        if (typeof routes[req.route.path] === 'object') {
            if (typeof routes[req.route.path][req.route.method.toLowerCase()] === 'object') {
                currentRoute = routes[req.route.path][req.route.method.toLowerCase()];
            }
        }
        if (!currentRoute) {
            return next(new restify.InternalError());
        }
        if (currentRoute.scope === 'public') {
            next();
        } else {
            if (req.user && req.api_key && req.api_key.isScopeAllowed(currentRoute.scope)) {
                next();
            } else {
                next(new restify.NotAuthorizedError());
            }
        }
    };
};
