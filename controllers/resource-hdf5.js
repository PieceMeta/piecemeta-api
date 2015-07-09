'use strict';

var hdf5Handler = require('../lib/util/hdf5-response');

module.exports = function (config, model) {
    return {
        find: function (req, res, next) {
            var query = {};
            query = require('../lib/util/query-mapping')(query, req, config);
            model(config.system).find(query, handleResponse(res, next));
        },
        get: function (req, res, next) {
            model(config.system).get(constructUuidPath(req), handleResponse(res, next));
        },
        post: function (req, res, next) {
            var data = req.body;
            data.contributor_uuid = req.user.uuid;
            model(config.system).create(data, handleResponse(res, next));
        },
        put: function (req, res, next) {
            model(config.system).update(constructUuidPath(req), req.body, handleResponse(res, next));
        },
        del: function (req, res, next) {
            model(config.system).remove(constructUuidPath(req), handleResponse(res, next));
        }
    };
};

function constructUuidPath(req) {
    var uuid_path = '';
    if (req.params.package_uuid) {
        uuid_path += req.params.package_uuid + '/';
    }
    if (req.params.channel_uuid) {
        uuid_path += req.params.channel_uuid + '/';
    }
    uuid_path += req.params.uuid;
    return uuid_path;
}

function handleResponse(res, next) {
    return function hdfResHandler(err, data) {
        if (err) {
            console.error(err.stack);
            res.send(hdf5Handler.handleError(err));
            return next();
        }
        res.send(200, data);
    };
}
