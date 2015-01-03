(function () {
    'use strict';

    module.exports = function (callback) {
        var mongoose = require('mongoose'),
            config = require('../lib/config'),
            tracker = require('../lib/tracker');
        config.load(function (err) {
            if (err) {
                console.log(err);
                return;
            }
            mongoose.connect('mongodb://' + config.get.mongodb.host + ':' + config.get.mongodb.port + '/' + config.get.mongodb.database);
            mongoose.model('ApiServer', require('../models/tracker/api-server').ApiServer);
            mongoose.model('Tracker', require('../models/tracker/tracker').Tracker);
            tracker.updateTrackers(function (err) {
                callback(err, process.pid);
            });
        });
    };

})();