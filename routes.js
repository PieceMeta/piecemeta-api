(function () {
    'use strict';

    var packages = require('./controllers/packages'),
        channels = require('./controllers/channels'),
        streams = require('./controllers/streams'),
        users = require('./controllers/users'),
        access_tokens = require('./controllers/access_tokens'),
        api_keys = require('./controllers/api_keys');

    module.exports = function () {
        return {
            '/packages': {
                'get': {
                    controller: packages.list,
                    scope: 'public'
                },
                'post': {
                    controller: packages.post,
                    scope: 'user'
                }
            },
            '/packages/:id': {
                'get': {
                    controller: packages.get,
                    scope: 'public'
                },
                'delete': {
                    controller: packages.del,
                    overrideVerb: 'del',
                    scope: 'public'
                }
            },
            '/packages/:id/channels': {
                'get': {
                    controller: channels.list,
                    scope: 'public'
                }
            },
            '/packages/:package_id/channels/:id/streams': {
                'get': {
                    controller: streams.list,
                    scope: 'public'
                }
            },
            '/channels': {
                'get': {
                    controller: channels.get,
                    scope: 'public'
                },
                'post': {
                    controller: channels.post,
                    scope: 'user'
                }
            },
            '/channels/:id': {
                'put': {
                    controller: channels.put,
                    scope: 'user'
                },
                'delete': {
                    controller: channels.del,
                    overrideVerb: 'del',
                    scope: 'user'
                }
            },
            '/streams': {
                'get': {
                    controller: streams.get,
                    scope: 'public'
                },
                'post': {
                    controller: streams.post,
                    scope: 'user'
                }
            },
            '/streams/:id': {
                'put': {
                    controller: streams.put,
                    scope: 'user'
                },
                'delete': {
                    controller: streams.del,
                    overrideVerb: 'del',
                    scope: 'user'
                }
            },
            '/users': {
                'post': {
                    controller: users.post,
                    scope: 'admin'
                }
            },
            '/users/:id': {
                'get': {
                    controller: users.get,
                    scope: 'public'
                },
                'put': {
                    controller: streams.post,
                    scope: 'user'
                },
                'delete': {
                    controller: streams.del,
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
                    controller: api_keys.list,
                    scope: 'user'
                }
            }

        };
    };

}());