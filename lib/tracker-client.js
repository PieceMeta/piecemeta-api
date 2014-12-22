(function () {
    'use strict';

    module.exports.updateTrackers = function (callback) {
        var request = require('request'),
            async = require('async'),
            mongoose = require('mongoose');
        async.waterfall([
            function (cb) {
                mongoose.model('ApiServer').findOne({ secret: {'$ne': null } }, cb);
            },
            function (serverInfo, cb) {
                mongoose.model('Tracker').find({}, function (err, trackers) {
                    cb(err, trackers, serverInfo);
                });
            },
            function (trackers, serverInfo, cb) {
                async.eachSeries(trackers, function (tracker, next) {
                    var trackerURL = ( tracker.secure ? 'https://' : 'http://' ) + tracker.host + ':' + tracker.port;
                    if (tracker.secret) {
                        request.put({ url: trackerURL + '/' + tracker.uuid + '/servers.json', json: serverInfo }, function (err, res, body) {
                            if (err) {
                                console.log('update server error', err, body);
                            }
                            next();
                        });
                    } else {
                        request.post({ url: trackerURL + '/servers.json', json: serverInfo }, function (err, res, body) {
                            if (err) {
                                console.log('register server error', err, body);
                            }
                            next();
                        });
                    }
                }, function (err) {
                    cb(err);
                });
            }
        ], function (err) {
            if (typeof callback === 'function') {
                callback(err);
            }
        });
    };

})();