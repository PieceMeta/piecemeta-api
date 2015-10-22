(function () {
    'use strict';

    var users = require('./controllers/users'),
        access_tokens = require('./controllers/access-tokens'),
        res = require('./controllers/resource-lmdb'),
        streams = require('./controllers/streams');

    module.exports = function (config) {
        if (typeof config !== 'object') {
            config = {get: {}};
        }
        return {
            '/packages': {
                'get': {
                    controller: res({resource: 'Package', action: 'find'}),
                    scope: 'public'
                },
                'post': {
                    controller: res({resource: 'Package', action: 'post'}),
                    scope: 'user'
                }
            },
            '/packages/:uuid': {
                'get': {
                    controller: res({resource: 'Package', action: 'get'}),
                    scope: 'public'
                },
                'put': {
                    controller: res({resource: 'Package', action: 'put'}),
                    scope: 'user',
                    cache_related: ['/packages']
                },
                'delete': {
                    controller: res({resource: 'Package', action: 'del'}),
                    overrideVerb: 'del',
                    scope: 'user',
                    cache_related: ['/packages']
                }
            },
            '/packages/:uuid/channels': {
                'get': {
                    controller: res({resource: 'Channel', query: {id_mapping: 'package_uuid'}, action: 'find'}),
                    scope: 'public'
                }
            },
            '/channels/:uuid/streams': {
                'get': {
                    controller: streams({
                        resource: 'Stream',
                        query: {id_mapping: 'channel_uuid'},
                        select: '-frames',
                        action: 'find'
                    }).find,
                    scope: 'public'
                }
            },
            '/channels': {
                'post': {
                    controller: res({resource: 'Channel', action: 'post'}),
                    scope: 'user'
                }
            },
            '/channels/:uuid': {
                'get': {
                    controller: res({resource: 'Channel', action: 'get'}),
                    scope: 'public'
                },
                'put': {
                    controller: res({resource: 'Channel', action: 'get'}),
                    scope: 'user',
                    cache_related: ['/packages/:uuid/channels']
                },
                'delete': {
                    controller: res({resource: 'Channel', action: 'del'}),
                    overrideVerb: 'del',
                    scope: 'user',
                    cache_related: ['/packages/:uuid/channels']
                }
            },
            '/streams': {
                'post': {
                    controller: streams({action:'post'}).post,
                    scope: 'user'
                }
            },
            '/streams/:uuid/frames': {
                'get': {
                    controller: streams({action: 'get'}).get,
                    scope: 'public'
                }
            },
            '/streams/:uuid/meta': {
                'get': {
                    controller: res({resource: 'Stream', action: 'get'}),
                    scope: 'public'
                }
            },
            '/streams/:uuid': {
                'get': {
                    controller: res({resource: 'Stream', action: 'get'}),
                    scope: 'public'
                },
                'put': {
                    controller: res({resource: 'Stream', action: 'put'}),
                    scope: 'user',
                    cache_related: ['/channels/:uuid/streams']
                },
                'delete': {
                    controller: res({resource: 'Stream', action: 'del'}),
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
                    controller: res({resource: 'User', action: 'del'}),
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
                    controller: res({ resource: 'ApiKey', query: { user_mapping: 'user_uuid', action: 'find' }}),
                    scope: 'user'
                }
            }
        };
    };

}());