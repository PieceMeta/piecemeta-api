(function () {
    'use strict';

    var async = require('async'),
        mongoose = require('mongoose'),
        apiClient = null;

    module.exports.pushUpdate = function (pushSubscription, callback) {
        async.waterfall([
            function (cb) {
                createApiClient(
                    pushSubscription.api_server_uuid,
                    {
                        api_key: pushSubscription.api_key,
                        access_token: pushSubscription.access_token
                    }, cb);
            },
            function (client, cb) {
                apiClient = client;
                apiClient.resource('packages').action('get', null, cb);
            },
            function (packages, cb) {
                updateResourceFromRemoteData(packages, 'packages', 'channels', 'PackageModel', cb);
            }, function (channels, cb) {
                updateResourceFromRemoteData(channels, 'channels', 'streams', 'ChannelModel', cb);
            }, function (streams, cb) {
                updateResourceFromRemoteData(streams, 'streams', null, 'StreamModel', cb);
            }
        ], function (err) {
            if (typeof callback === 'function') {
                callback(err);
            }
        });
    };

    module.exports.pullUpdate = function (apiServerUUID, callback) {
        async.waterfall([
            function (cb) {
                createApiClient(apiServerUUID, null, cb);
            },
            function (client, cb) {
                apiClient = client;
                apiClient.resource('packages').action('get', null, cb);
            },
            function (packages, cb) {
                updateResourceFromRemoteData(packages, 'packages', 'channels', 'PackageModel', cb);
            }, function (channels, cb) {
                updateResourceFromRemoteData(channels, 'channels', 'streams', 'ChannelModel', cb);
            }, function (streams, cb) {
                updateResourceFromRemoteData(streams, 'streams', null, 'StreamModel', cb);
            }
        ], function (err) {
            if (typeof callback === 'function') {
                callback(err);
            }
        });
    };

    function createApiClient(apiServerUUID, credentials, callback) {
        async.waterfall([
            function (cb) {
                mongoose.model('ApiServerModel').findOne({ uuid: apiServerUUID }, cb);
            },
            function (apiServer, cb) {
                if (typeof apiServer !== 'object') {
                    cb(new Error('Server unknown'));
                    return;
                }
                var clientConfig = {
                    host: (apiServer.secure ? 'https://' : 'http://') + apiServer.host + (apiServer.port ? ':' + apiServer.port : ''),
                    contentType: 'application/json'
                };
                if (credentials) {
                    clientConfig.api_key = credentials.api_key;
                    clientConfig.access_token = credentials.access_token;
                }
                apiClient = require('piecemeta-apiclient')(clientConfig);
                cb(null, apiClient);
            }
        ], function (err, apiClient) {
            if (typeof callback === 'function') {
                callback(err, apiClient);
            }
        });
    }

    function updateResourceFromRemoteData(data, resource, subresource, model, callback) {
        var subresourceList = [];
        async.each(data, function (item, next) {
            async.waterfall([
                function (cb) {
                    mongoose.model(model).findOne({ uuid: item.uuid }, function (err, local) {
                        if (local) {
                            cb(null, null);
                        } else {
                            fetchAndCreateResource(resource + '/' + item.uuid, 'ChannelModel', item, cb);
                        }
                    });
                },
                function (item, cb) {
                    if (subresource) {
                        apiClient.resource('channels/' + item.uuid + '/streams').action('get', null, cb);
                    } else {
                        cb(null, null);
                    }
                },
                function (subresources, cb) {
                    if (subresources) {
                        subresourceList = subresourceList.concat(subresources);
                    }
                    cb(null);
                }
            ], function (err) {
                next(err);
            });
        }, function (err) {
            callback(err);
        });
    }

    function fetchAndCreateResource(uuid, resource, model, callback) {
        async.waterfall([
            function (cb) {
                apiClient.resource(resource).action('get', { uuid: uuid }, cb);
            }, function (remoteObject, cb) {
                mongoose.model(model).create(remoteObject, cb);
            }
        ], function (err, localObject) {
            if (typeof callback === 'function') {
                callback(err, localObject);
            }
        });
    }

})();