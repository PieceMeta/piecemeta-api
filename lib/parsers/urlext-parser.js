(function () {
    'use strict';
    module.exports = function () {
        return function (req, res, next) {
            if (req.url.match(/\.(msgpack)/)) {
                req.url = req.url.replace(/\.msgpack/, '');
                req.headers['content-type'] = 'application/msgpack';
                req.headers.accept = 'application/msgpack';
            } else if (req.url.match(/\.(xml)/)) {
                req.url = req.url.replace(/\.xml/, '');
                req.headers['content-type'] = 'application/xml';
                req.headers.accept = 'application/xml';
            } else if (req.url.match(/\.(json)/)) {
                req.url = req.url.replace(/\.json/, '');
                req.headers['content-type'] = 'application/json';
                req.headers.accept = 'application/json';
            } else if (req.url.match(/\.(csv)/)) {
                req.url = req.url.replace(/\.csv/, '');
                req.headers['content-type'] = 'text/csv';
                req.headers.accept = 'text/csv';
            }
            res.setHeader('content-type', req.contentType());
            return next();
        };
    };
})();