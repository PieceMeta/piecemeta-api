// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

'use strict';

var js2xmlparser = require("js2xmlparser");

///--- Exports

function formatXML(req, res, body) {

    var options = {
        useCDATA: false,
        convertMap: {
            "[object Date]": function (date) {
                return date.toISOString();
            },
            "[object Function]": function () {
                return undefined;
            }
        }
    };

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
            if (typeof body[i].toObject === 'function') {
                result.push(body[i].toObject());
            } else {
                result.push(body[i]);
            }
        }
        var resourcePathName = req.path().split('/')[1];
        responseBody[resourcePathName.substr(0, resourcePathName.length - 1)] = result;
    } else {
        if (typeof body.toObject === 'function') {
            responseBody = body.toObject();
        } else {
            responseBody = body;
        }
    }

    var data = js2xmlparser('response', responseBody, options);
    res.setHeader('Content-Length', Buffer.byteLength(data));

    return (data);
}

module.exports = formatXML;
