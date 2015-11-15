// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

(function () {
    'use strict';

    var msgpack = require("msgpack");

    ///--- Exports

    function formatMsgpack(req, res, body, cb) {

        var responseBody = {};

        if (body instanceof Error) {
            // snoop for RestError or HttpError, but don't rely on
            // instanceof
            res.statusCode = body.statusCode || 500;

            if (body.body) {
                body = body.body;
            } else {
                body = {
                    message: body.message
                };
            }
        }

        if (Array.isArray(body)) {
            var result = [];
            for (var i in body) {
                result.push(body[i].toObject());
            }
            responseBody = result;
        } else {
            if (body.hasOwnProperty("toObject")) {
                responseBody = body.toObject();
            } else {
                responseBody = body;
            }
        }

        var data = msgpack.pack(responseBody);
        res.setHeader('Content-Length', Buffer.byteLength(data));

        return cb(null, data);
    }

    module.exports = formatMsgpack;
})();