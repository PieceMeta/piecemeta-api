// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

(function () {
    'use strict';

    var assert = require('assert-plus'),
        xml2js = require('xml2js');

    var bodyReader = require('restify/lib/plugins/body_reader');


    ///--- API

    /**
     * Returns a plugin that will parse the HTTP request body IF the
     * contentType is application/xml.
     *
     * If req.params already contains a given key, that key is skipped and an
     * error is logged.
     *
     * @return {Function} restify handler.
     * @throws {TypeError} on bad input
     */
    function xmlBodyParser(options) {
        assert.optionalObject(options, 'options');
        options = options || {};

        var override = options.overrideParams;

        function parseXml(req, res, next) {
            if (req.getContentType() !== 'application/xml' || !req.body) {
                next();
                return;
            }

            xml2js.parseString(req.body, function (err, params) {
                if (options.mapParams !== false) {
                    if (Array.isArray(params)) {
                        req.params = params;
                    } else if (typeof (params) === 'object') {
                        Object.keys(params).forEach(function (k) {
                            var p = req.params[k];
                            if (p && !override) {
                                return (false);
                            }
                            req.params[k] = params[k];
                            return (true);
                        });
                    } else {
                        req.params = params;
                    }
                } else {
                    req._body = req.body;
                }

                req.body = params;

                next();
            });
        }

        var chain = [];
        if (!options.bodyReader) {
            chain.push(bodyReader(options));
        }
        chain.push(parseXml);
        return (chain);
    }

    module.exports = xmlBodyParser;
})();