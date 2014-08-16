(function () {
    'use strict';

    var restify = require('restify'),
        preflightEnabler = require('se7ensky-restify-preflight'),
        mongoose = require('mongoose'),
        users = require('./resources/users'),
        sessions = require('./resources/sessions'),
        dataSequences = require('./resources/data-sequences');

    // Database

    mongoose.connect('mongodb://127.0.0.1:27017/piecemeta-api');
    mongoose.model('DataSequenceModel', require('./models/data-sequence').DataSequenceModel);
    mongoose.model('UserModel', require('./models/user').UserModel);


    // Server config

    var server = restify.createServer();
    server.use(restify.CORS({
        credentials: true,
        origins: ['*'],
        allow_headers: ['Authorization', 'Key', 'Signature']
    }));
    server.use(restify.fullResponse());
    preflightEnabler(server, { headers: ['Key', 'Signature'] });
    server.use(restify.gzipResponse());
    server.use(restify.authorizationParser());
    server.use(restify.dateParser());
    server.use(restify.bodyParser());

    server.use(function (req, res, next) {
        req.user = null;
        if (req.authorization.basic) {
            mongoose.model('UserModel').findOne({
                email: req.authorization.basic.username
            },
            function (err, user) {
                if (err) {
                    console.log('auth error', err);
                    return next();
                }
                if (user && user.isValidPassword(req.authorization.basic.password)) {
                    req.user = user;
                }
                next();
            });
        } else if (req.headers.key && req.headers.signature) {
            var sha1 = require('sha1');
            mongoose.model('UserModel').findOne({
                api_key: req.headers.key
            },
            function (err, user) {
                if (err) {
                    console.log('auth error', err);
                    return next();
                }
                var sigstring = user.api_secret + req.method + req.route.path + JSON.stringify(req.params);
                if (req.headers.signature === sha1(sigstring)) {
                    req.user = user;
                }
                next();
            });
        } else {
            next();
        }
    });


    //  Resources
    //

    //  Users

    server.get('/users', users.list);
    server.get('/users/:id', users.get);
    server.post('/users', users.post);

    //  Sessions

    server.post('/sessions', sessions.post);

    //  DataSequences

    server.get('/data_sequences', dataSequences.list);
    server.get('/data_sequences/:id', dataSequences.get);
    server.post('/data_sequences', dataSequences.post);


    // Start server

    server.listen(8080, function () {
        console.log('%s listening at %s', server.name, server.url);
    });
}());