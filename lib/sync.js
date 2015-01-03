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
                        api_key: {
                            key: pushSubscription.api_key,
                            secret: pushSubscription.api_secret
                        }
                    }, cb);
            },
            function (client, cb) {
                mongoose.model('Package').find({}, cb);
            },
            function (packages, cb) {
                var subresources = [];
                async.each(packages, function (item, next) {
                    mongoose.model('Channel').find({ package_uuid: item.uuid }, function (err, channels) {
                        subresources = subresources.concat(channels);
                        createOrUpdateRemoteResource(item.uuid, item, 'packages', next);
                    });
                }, function (err) {
                    cb(err, subresources);
                });
            },
            function (channels, cb) {
                var subresources = [];
                async.each(channels, function (item, next) {
                    mongoose.model('Stream').find({ channel_uuid: item.uuid }, function (err, streams) {
                        subresources = subresources.concat(streams);
                        createOrUpdateRemoteResource(item.uuid, item, 'channels', next);
                    });
                }, function (err) {
                    cb(err, subresources);
                });
            },
            function (streams, cb) {
                async.each(streams, function (item, next) {
                    createOrUpdateRemoteResource(item.uuid, item, 'streams', next);
                }, cb);
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
                            fetchAndCreateResource(resource + '/' + item.uuid, model, item, cb);
                        }
                    });
                },
                function (item, cb) {
                    if (subresource) {
                        apiClient.resource(resource + '/' + item.uuid + '/' + subresource).action('get', null, cb);
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

    function createOrUpdateRemoteResource(uuid, data, resource, callback) {
        async.waterfall([
            function (cb) {
                apiClient.resource(resource).action('get', { uuid: uuid }, function (err, remoteObject) {
                    if (err) {
                        if (err.code === 404) {
                            cb(null, null);
                        } else {
                            cb(err, null);
                        }
                        return;
                    }
                    cb(null, remoteObject);
                });
            }, function (remoteObject, cb) {
                if (remoteObject) {
                    if (remoteObject.updated !== data.updated) {
                        apiClient.resource(resource + '/' + uuid).action('put', data, cb);
                    }
                } else {
                    apiClient.resource(resource).action('post', data, cb);
                }
            }
        ], function (err, remoteObject) {
            if (typeof callback === 'function') {
                callback(err, remoteObject);
            }
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

    function submitPushSubscription(api_server_uuid, callback) {
        var serverConfig = require('../lib/config');
        async.waterfall([
            function (cb) {
                mongoose.model('ApiServer').find({ uuid: api_server_uuid }, cb);
            },
            function (api_server, cb) {
                mongoose.model('ApiKey').find({
                    device_uuid: api_server.uuid
                }, function (err, api_key) {
                    cb(err, api_server, api_key);
                });
            },
            function (api_server, api_key, cb) {
                if (api_key) {
                    cb(null, api_server, api_key);
                } else {
                    mongoose.model('ApiKey').create({
                        device_uuid: api_server.uuid,
                        scopes: ['push']
                    }, function (err, api_key) {
                        cb(err, api_server, api_key);
                    });
                }
            },
            function (api_server, api_key, cb) {
                var clientConfig = {
                    host: (api_server.secure ? 'https://' : 'http://') + api_server.host + (api_server.port ? ':' + api_server.port : ''),
                    contentType: 'application/json'
                };
                var client = require('piecemeta-apiclient')(clientConfig);
                client.resource('push_subscriptions').action('post', {
                    api_server_uuid: serverConfig.get.api_server.uuid,
                    api_key: api_key.key,
                    api_secret: api_key.secret
                }, function (err) {
                    cb(err, api_server);
                });
            }
        ], function (err, response) {
            callback(err, response);
        });
    }

})();