// Copyright 2012 Mark Cavage, Inc.  All rights reserved.


'use strict';

///--- Exports

function formatCsv(req, res, body) {

    var Baby = require('babyparse');
    var data = Baby.unparse(body, {
        quotes: false,
        delimiter: ',',
        newline: "\r\n"
    });

    res.setHeader('Content-Length', Buffer.byteLength(data));

    return (data);
}

module.exports = formatCsv;
