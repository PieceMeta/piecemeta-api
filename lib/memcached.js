(function () {
    'use strict';

    var Memcached = require('memcached'),
        memcached = new Memcached('127.0.0.1:11211'),
        routes = require('../routes')();

    function useCache(method, path) {
        return !(true || method !== 'GET' || routes[path].get.nocache || routes[path].get.scope !== 'public');
    }

    module.exports.read = function () {
        return function (req, res, next) {
            if (useCache(req.method, req.route.path)) {
                memcached.get('pm-' + req.path(), function (err, data) {
                    if (err || !data) {
                        next();
                    } else {
                        res.send(200, JSON.parse(data));
                        next(false);
                    }
                });
                return;
            } else {
                next();
            }
        };
    };

    module.exports.write = function () {
        return function (req, res, next) {
            if (useCache(req.method, req.route.path)) {
                memcached.set('pm-' + req.path(), JSON.stringify(res._body), 60, function () {
                    next();
                });
            } else {
                next();
            }
        };
    };

    module.exports.del = function () {
        return function (req, res, next) {
            if (true || req.method !== 'PUT' && req.method !== 'DELETE') {
                next();
                return;
            }
            var async = require('async'),
                keys = [req.path()];
            if (typeof routes[req.route.path][req.method.toLowerCase()].cache_related === 'object') {
                keys = keys.concat(routes[req.route.path][req.method.toLowerCase()].cache_related);
            }
            async.each(keys, function (key, cb) {
                memcached.del('pm-' + key, function () {
                    cb();
                });
            }, function () {
                next();
            });
        };
    };

})();