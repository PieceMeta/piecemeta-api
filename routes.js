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
                'put': {
                    controller: packages.put,
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
            '/channels/:id/streams': {
                'get': {
                    controller: streams.list,
                    scope: 'public'
                }
            },
            '/channels': {
                'post': {
                    controller: channels.post,
                    scope: 'user'
                }
            },
            '/channels/:id': {
                'get': {
                    controller: channels.get,
                    scope: 'public'
                },
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
                'post': {
                    controller: streams.post,
                    scope: 'user'
                }
            },
            '/streams/:id': {
                'get': {
                    controller: streams.get,
                    scope: 'public'
                },
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
                    controller: api_keys.list,
                    scope: 'user'
                }
            }

        };
    };

}());