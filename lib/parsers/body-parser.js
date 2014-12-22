// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

var assert = require('assert-plus');

var errors = require('restify/lib/errors');

var bodyReader = require('restify/lib/plugins/body_reader');
var jsonParser = require('restify/lib/plugins/json_body_parser');
var formParser = require('restify/lib/plugins/form_body_parser');
var multipartParser = require('restify/lib/plugins/multipart_parser');
var fieldedTextParser = require('restify/lib/plugins/fielded_text_body_parser.js');
var msgPackParser = require('./msgpack-body-parser');
var xmlParser = require('./xml-body-parser');


///--- Globals

var UnsupportedMediaTypeError = errors.UnsupportedMediaTypeError;


///--- API

function bodyParser(options) {
    assert.optionalObject(options, 'options');
    options = options || {};
    options.bodyReader = true;

    var read = bodyReader(options);
    var parseForm = formParser(options);
    var parseJson = jsonParser(options);
    var parseMultipart = multipartParser(options);
    var parseFieldedText = fieldedTextParser(options);
    var parseMsgPack = msgPackParser(options);
    var parseXml = xmlParser(options);

    function parseBody(req, res, next) {
        // Allow use of 'requestBodyOnGet' flag to allow for merging of
        // the request body of a GET request into req.params
        if (req.method === 'HEAD') {
            next();
            return;
        }
        if (req.method === 'GET') {
            if (!options.requestBodyOnGet) {
                next();
                return;
            }
        }

        if (req.contentLength() === 0 && !req.isChunked()) {
            next();
            return;
        }

        var parser;
        var type = req.contentType();
        switch (type) {
            case 'application/json':
                parser = parseJson[0];
                break;
            case 'application/msgpack':
                parser = parseMsgPack[0];
                break;
            case 'application/xml':
                parser = parseXml[0];
                break;
            case 'application/x-www-form-urlencoded':
                parser = parseForm[0];
                break;
            case 'multipart/form-data':
                parser = parseMultipart;
                break;
            case 'text/tsv':
                parser = parseFieldedText;
                break;
            case 'text/tab-separated-values':
                parser = parseFieldedText;
                break;
            case 'text/csv':
                parser = parseFieldedText;
                break;

            default:
                break;
        }

        if (parser) {
            parser(req, res, next);
        } else if (options && options.rejectUnknown) {
            next(new UnsupportedMediaTypeError(type));
        } else {
            next();
        }
    }

    return ([read, parseBody]);
}

module.exports = bodyParser;
