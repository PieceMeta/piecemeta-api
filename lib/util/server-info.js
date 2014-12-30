(function () {
    'use strict';

    var serverInfo = null;

    module.exports.getServerInfo = function () {
        return serverInfo;
    };

    module.exports.loadInfo = function (callback) {
        var mongoose = require('mongoose');
        mongoose.model('ApiServer').findOne({ secret: { '$ne': null }}, function (err, apiServer) {
            serverInfo = apiServer;
            if (typeof callback === 'function') {
                callback(err, apiServer);
            }
        });
    };
})();