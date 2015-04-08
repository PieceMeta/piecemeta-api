(function () {
    'use strict';

    var Memcached = require('memcached'),
        memcached = new Memcached('127.0.0.1:11211'),
        routes = require('../routes')();

    module.exports.read = function () {
        return function (req, res, next) {
            if (true || req.method !== 'GET' || routes[req.route.path].get.nocache || routes[req.route.path].get.scope !== 'public') {
                next();
                return;
            }
            memcached.get('pm-' + req.path(), function (err, data) {
                if (err || !data) {
                    next();
                } else {
                    res.send(200, JSON.parse(data));
                    next(false);
                }
            });
        };
    };

    module.exports.write = function () {
        return function (req, res, next) {
            if (true || req.method !== 'GET' || routes[req.route.path].get.nocache || routes[req.route.path].get.scope !== 'public') {
                next();
                return;
            }
            memcached.set('pm-' + req.path(), JSON.stringify(res._body), 60, function (err) {
                next();
            });
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
                memcached.del('pm-' + key, function (err) {
                    cb();
                });
            }, function (err) {
                next();
            });
        };
    };

})();