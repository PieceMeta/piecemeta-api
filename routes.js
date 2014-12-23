(function () {
    'use strict';

    var users = require('./controllers/users'),
        access_tokens = require('./controllers/access-tokens'),
        res = require('./controllers/resource-common');

    module.exports = function () {
        return {
            '/api_servers': {
                'get': {
                    controller: res({ resource: 'ApiServer' }).find,
                    scope: 'admin'
                },
                'post': {
                    controller: res({ resource: 'ApiServer' }).post,
                    scope: 'admin'
                }
            },
            '/api_servers/:id': {
                'get': {
                    controller: res({ resource: 'ApiServer' }).get,
                    scope: 'admin'
                },
                'put': {
                    controller: res({ resource: 'ApiServer' }).put,
                    scope: 'admin',
                    cache_related: ['/api_servers']
                },
                'delete': {
                    controller: res({ resource: 'ApiServer' }).del,
                    overrideVerb: 'del',
                    scope: 'admin',
                    cache_related: ['/api_servers']
                }
            },
            '/collections': {
                'get': {
                    controller: res({ resource: 'Collection' }).find,
                    scope: 'public'
                },
                'post': {
                    controller: res({ resource: 'Collection' }).post,
                    scope: 'user'
                }
            },
            '/collections/:id': {
                'get': {
                    controller: res({ resource: 'Collection' }).get,
                    scope: 'public'
                },
                'put': {
                    controller: res({ resource: 'Collection' }).put,
                    scope: 'user',
                    cache_related: ['/collections']
                },
                'delete': {
                    controller: res({ resource: 'Collection' }).del,
                    overrideVerb: 'del',
                    scope: 'user',
                    cache_related: ['/collections']
                }
            },
            '/packages': {
                'get': {
                    controller: res({ resource: 'Package' }).find,
                    scope: 'public'
                },
                'post': {
                    controller: res({ resource: 'Package' }).post,
                    scope: 'user'
                }
            },
            '/packages/:id': {
                'get': {
                    controller: res({ resource: 'Package' }).get,
                    scope: 'public'
                },
                'put': {
                    controller: res({ resource: 'Package' }).put,
                    scope: 'user',
                    cache_related: ['/packages']
                },
                'delete': {
                    controller: res({ resource: 'Package' }).del,
                    overrideVerb: 'del',
                    scope: 'user',
                    cache_related: ['/packages']
                }
            },
            '/packages/:id/channels': {
                'get': {
                    controller: res({ resource: 'Channel', query: { id_mapping: 'package_id' } }).find,
                    scope: 'public'
                }
            },
            '/channels/:id/streams': {
                'get': {
                    controller: res({ resource: 'Stream', query: { id_mapping: 'channel_id' } }).find,
                    scope: 'public'
                }
            },
            '/channels': {
                'post': {
                    controller: res({ resource: 'Channel' }).post,
                    scope: 'user'
                }
            },
            '/channels/:id': {
                'get': {
                    controller: res({ resource: 'Channel' }).get,
                    scope: 'public'
                },
                'put': {
                    controller: res({ resource: 'Channel' }).put,
                    scope: 'user',
                    cache_related: ['/packages/:id/channels']
                },
                'delete': {
                    controller: res({ resource: 'Channel' }).del,
                    overrideVerb: 'del',
                    scope: 'user',
                    cache_related: ['/packages/:id/channels']
                }
            },
            '/push_subscriptions': {
                'get': {
                    controller: res({ resource: 'PushSubscription' }).find,
                    scope: 'admin'
                },
                'post': {
                    controller: res({ resource: 'PushSubscription' }).post,
                    scope: 'admin'
                }
            },
            '/push_subscriptions/:id': {
                'get': {
                    controller: res({ resource: 'PushSubscription' }).get,
                    scope: 'admin'
                },
                'put': {
                    controller: res({ resource: 'PushSubscription' }).put,
                    scope: 'admin',
                    cache_related: ['/push_subscriptions']
                },
                'delete': {
                    controller: res({ resource: 'PushSubscription' }).del,
                    overrideVerb: 'del',
                    scope: 'admin',
                    cache_related: ['/push_subscriptions']
                }
            },
            '/streams': {
                'post': {
                    controller: res({ resource: 'Stream' }).post,
                    scope: 'user'
                }
            },
            '/streams/:id': {
                'get': {
                    controller: res({ resource: 'Stream' }).get,
                    scope: 'public'
                },
                'put': {
                    controller: res({ resource: 'Stream' }).put,
                    scope: 'user',
                    cache_related: ['/channels/:id/streams']
                },
                'delete': {
                    controller: res({ resource: 'Stream' }).del,
                    overrideVerb: 'del',
                    scope: 'user',
                    cache_related: ['/channels/:id/streams']
                }
            },
            '/trackers': {
                'get': {
                    controller: res({ resource: 'Tracker' }).find,
                    scope: 'admin'
                },
                'post': {
                    controller: res({ resource: 'Tracker' }).post,
                    scope: 'admin'
                }
            },
            '/trackers/:id': {
                'get': {
                    controller: res({ resource: 'Tracker' }).get,
                    scope: 'admin'
                },
                'put': {
                    controller: res({ resource: 'Tracker' }).put,
                    scope: 'admin',
                    cache_related: ['/trackers']
                },
                'delete': {
                    controller: res({ resource: 'Tracker' }).del,
                    overrideVerb: 'del',
                    scope: 'admin',
                    cache_related: ['/trackers']
                }
            },
            '/users': {
                'post': {
                    controller: users.post,
                    scope: 'public'
                }
            },
            '/users/:id': {
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
                    controller: res({ resource: 'ApiKey', query: { user_mapping: 'user_id' } }).find,
                    scope: 'user'
                }
            }

        };
    };

}());