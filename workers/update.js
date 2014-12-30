(function () {
    'use strict';

    module.exports = function (callback) {
        console.log('update');
        var mongoose = require('mongoose'),
            Settings = require('settings'),
            config = new Settings(require('../config')),
            tracker = require('../lib/tracker-client');
        mongoose.connect('mongodb://' + config.mongodb.host + ':' + config.mongodb.port + '/' + config.mongodb.database);
        mongoose.model('ApiServer', require('../models/tracker/api-server').ApiServer);
        mongoose.model('Tracker', require('../models/tracker/tracker').Tracker);
        tracker.updateTrackers(function (err) {
            callback(err, process.pid);
        });
    };

})();