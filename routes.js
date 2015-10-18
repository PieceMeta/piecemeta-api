(function () {
    'use strict';

    var users = require('./controllers/users'),
        access_tokens = require('./controllers/access-tokens'),
        res = require('./controllers/resource-lmdb'),
        streams = require('./controllers/streams'),
        exports = require('./controllers/exports');

    module.exports = function (config) {
        if (typeof config !== 'object') {
            config = {get: {}};
        }
        return {
            '/exports/:uuid': {
                'get': {
                    controller: exports.get,
                    scope: 'public',
                    nocache: true
                }
            },
            '/packages': {
                'get': {
                    controller: res({resource: 'Package'}).find,
                    scope: 'public'
                },
                'post': {
                    controller: res({resource: 'Package'}).post,
                    scope: 'user'
                }
            },
            '/packages/:uuid': {
                'get': {
                    controller: res({resource: 'Package'}).get,
                    scope: 'public'
                },
                'put': {
                    controller: res({resource: 'Package'}).put,
                    scope: 'user',
                    cache_related: ['/packages']
                },
                'delete': {
                    controller: res({resource: 'Package'}).del,
                    overrideVerb: 'del',
                    scope: 'user',
                    cache_related: ['/packages']
                }
            },
            '/packages/:uuid/channels': {
                'get': {
                    controller: res({resource: 'Channel', query: {id_mapping: 'package_uuid'}}).find,
                    scope: 'public'
                }
            },
            '/channels/:uuid/streams': {
                'get': {
                    controller: streams({
                        resource: 'Stream',
                        query: {id_mapping: 'channel_uuid'},
                        select: '-frames'
                    }).find,
                    scope: 'public'
                }
            },
            '/channels': {
                'post': {
                    controller: res({resource: 'Channel'}).post,
                    scope: 'user'
                }
            },
            '/channels/:uuid': {
                'get': {
                    controller: res({resource: 'Channel'}).get,
                    scope: 'public'
                },
                'put': {
                    controller: res({resource: 'Channel'}).put,
                    scope: 'user',
                    cache_related: ['/packages/:uuid/channels']
                },
                'delete': {
                    controller: res({resource: 'Channel'}).del,
                    overrideVerb: 'del',
                    scope: 'user',
                    cache_related: ['/packages/:uuid/channels']
                }
            },
            '/streams': {
                'post': {
                    controller: streams({}).post,
                    scope: 'user'
                }
            },
            '/streams/:uuid/frames': {
                'get': {
                    controller: streams({select: 'uuid channel_uuid user_uuid frames frameCount'}).get,
                    scope: 'public'
                }
            },
            '/streams/:uuid/meta': {
                'get': {
                    controller: res({resource: 'Stream', select: '-frames'}).get,
                    scope: 'public'
                }
            },
            '/streams/:uuid': {
                'get': {
                    controller: streams({}).get,
                    scope: 'public'
                },
                'put': {
                    controller: res({resource: 'Stream'}).put,
                    scope: 'user',
                    cache_related: ['/channels/:uuid/streams']
                },
                'delete': {
                    controller: res({resource: 'Stream'}).del,
                    overrideVerb: 'del',
                    scope: 'user',
                    cache_related: ['/channels/:uuid/streams']
                }
            },
            '/users': {
                'post': {
                    controller: users.post,
                    scope: 'public'
                }
            },
            '/users/:uuid': {
                'get': {
                    controller: users.get,
                    scope: 'public'
                },
                'put': {
                    controller: users.put,
                    scope: 'user'
                },
                'delete': {
                    controller: users.del,
                    overrideVerb: 'del',
                    scope: 'user'
                }
            },
            '/users/me/access_tokens': {
                'post': {
                    controller: access_tokens.post,
                    scope: 'public'
                }
            },
            '/users/me/api_keys': {
                'get': {
                    controller: res({ resource: 'ApiKey', query: { user_mapping: 'user_uuid' } }).find,
                    scope: 'user'
                }
            }
        };
    };

}());