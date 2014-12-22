(function () {
    'use strict';

    var Memcached = require('memcached');
    var memcached = new Memcached('127.0.0.1:11211');
    var routes = require('../routes')();

    module.exports.read = function () {
        return function (req, res, next) {
            if (req.method !== 'GET' || routes[req.route.path].get.scope !== 'public') {
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
            if (req.method !== 'GET' || routes[req.route.path].get.scope !== 'public') {
                next();
                return;
            }
            memcached.set('pm-' + req.path(), JSON.stringify(res._body), 60, function (err) {
                next();
            });
        };
    };

})();