#!/usr/bin/env node

var async = require('async'),
    prompt = require('prompt'),
    mongoose = require('mongoose');

prompt.message = "";
prompt.delimiter = "";
prompt.start();

function loadConfig(callback) {
    var fs = require('fs'),
        path = require('path');
    fs.readFile(path.join(__dirname, '..', 'config.json'), function (err, data) {
        callback(err && err.code !== 'ENOENT' ? err : null, data ? JSON.parse(data) : null);
    });
}

async.waterfall([
    function (cb) {
        console.log('\nUpdating streams...'.cyan);
        loadConfig(cb);
    },
    function (config, cb) {
        mongoose.connect('mongodb://' + config.mongodb.host + ':' + config.mongodb.port + '/' + config.mongodb.dbname);
        mongoose.model('Stream', require('../models/stream').Stream);
        mongoose.model('Stream').find({}, cb);
    },
    function (streams, cb) {
        async.eachSeries(streams, function (stream, next) {
            stream.save(function (err) {
                console.log(stream.uuid);
                next(err);
            });
        }, cb);
    },
], function (err) {
    console.log('\n');
    if (err) {
        console.log('Update failed'.red, err);
        process.exit(code = 1);
    } else {
        console.log('Update complete'.green);
        process.exit(code = 0);
    }
});
