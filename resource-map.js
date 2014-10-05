(function () {
    'use strict';

    var packages = require('./controllers/packages'),
        channels = require('./controllers/channels'),
        streams = require('./controllers/streams'),
        users = require('./controllers/users'),
        access_tokens = require('./controllers/access_tokens');

    module.exports = function () {
        return [
            {
                '/packages': [
                    {
                        type: 'get',
                        controller: packages.list,
                        scope: 'public'
                    },
                    {
                        type: 'post',
                        controller: packages.post,
                        scope: 'user'
                    }
                ],
                '/packages/:id': [
                    {
                        type: 'get',
                        controller: packages.get,
                        scope: 'public'
                    }
                ]
            },
            {
                '/channels': [
                    {
                        type: 'get',
                        controller: channels.list,
                        scope: 'public'
                    },
                    {
                        type: 'post',
                        controller: channels.post,
                        scope: 'user'
                    }
                ],
                '/channels/:id': [
                    {
                        type: 'get',
                        controller: channels.get,
                        scope: 'public'
                    },
                    {
                        type: 'put',
                        controller: channels.put,
                        scope: 'user'
                    },
                    {
                        type: 'del',
                        controller: channels.remove,
                        scope: 'user'
                    }
                ]
            },
            {
                '/streams': [
                    {
                        type: 'get',
                        controller: streams.list,
                        scope: 'public'
                    },
                    {
                        type: 'post',
                        controller: streams.post,
                        scope: 'user'
                    }
                ],
                '/streams/:id': [
                    {
                        type: 'get',
                        controller: streams.get,
                        scope: 'public'
                    }
                ]
            },
            {
                '/users': [
                    {
                        type: 'post',
                        controller: users.post,
                        scope: 'root'
                    }
                ],
                '/users/:id': [
                    {
                        type: 'get',
                        controller: users.get,
                        scope: 'public'
                    },
                    {
                        type: 'put',
                        controller: users.put,
                        scope: 'user'
                    }
                ],
                '/users/me/tokens': [
                    {
                        type: 'post',
                        controller: access_tokens.post,
                        scope: 'public'
                    }
                ]
            }

        ];
    };

}());