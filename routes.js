(function () {
    'use strict';

    var users = require('./controllers/users'),
        access_tokens = require('./controllers/access-tokens'),
        res = require('./controllers/resource-common'),
        hdf5res = require('./controllers/resource-hdf5'),
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
                    controller: hdf5res({system: config.get, query: {}}, require('./models/hdf5/package')).find,
                    scope: 'public'
                },
                'post': {
                    controller: hdf5res({system: config.get}, require('./models/hdf5/package')).post,
                    scope: 'user'
                }
            },
            '/packages/:uuid': {
                'get': {
                    controller: hdf5res({system: config.get}, require('./models/hdf5/package')).get,
                    scope: 'public'
                },
                'put': {
                    controller: hdf5res({system: config.get}, require('./models/hdf5/package')).put,
                    scope: 'user',
                    cache_related: ['/packages']
                },
                'delete': {
                    controller: hdf5res({system: config.get}, require('./models/hdf5/package')).del,
                    overrideVerb: 'del',
                    scope: 'user'
                }
            },
            '/packages/:uuid/channels': {
                'get': {
                    controller: hdf5res({system: config.get, query: {id_mapping: 'package_uuid'}}, require('./models/hdf5/channel')).find,
                    scope: 'public'
                }
            },
            '/channels/:uuid/streams': {
                'get': {
                    controller: hdf5res({system: config.get, query: {id_mapping: 'package_uuid'}}, require('./models/hdf5/stream')).find,
                    scope: 'public'
                }
            },
            '/channels': {
                'post': {
                    controller: hdf5res({system: config.get}, require('./models/hdf5/channel')).post,
                    scope: 'user'
                }
            },
            '/channels/:uuid': {
                'get': {
                    controller: hdf5res({system: config.get}, require('./models/hdf5/channel')).get,
                    scope: 'public'
                },
                'put': {
                    controller: hdf5res({system: config.get}, require('./models/hdf5/channel')).put,
                    scope: 'user'
                },
                'delete': {
                    controller: hdf5res({system: config.get}, require('./models/hdf5/channel')).del,
                    overrideVerb: 'del',
                    scope: 'user'
                }
            },
            '/streams': {
                'post': {
                    controller: hdf5res({system: config.get}, require('./models/hdf5/stream')).post,
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
                    controller: hdf5res({system: config.get}, require('./models/hdf5/stream')).get,
                    scope: 'public'
                },
                'put': {
                    controller: hdf5res({system: config.get}, require('./models/hdf5/stream')).put,
                    scope: 'user'
                },
                'delete': {
                    controller: hdf5res({system: config.get}, require('./models/hdf5/stream')).del,
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