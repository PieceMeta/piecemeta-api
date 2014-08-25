(function () {
    'use strict';

    var restify = require('restify'),
        preflightEnabler = require('se7ensky-restify-preflight'),
        mongoose = require('mongoose'),
        Settings = require('settings'),
        sysConfig = new Settings(require('./config')),
        users = require('./resources/users'),
        sessions = require('./resources/sessions'),
        dataSequences = require('./resources/data-sequences'),
        dataPackages = require('./resources/data-packages'),
        dataChannels = require('./resources/data-channels'),
        dataStreams = require('./resources/data-streams');

    // Database

    mongoose.connect('mongodb://' + sysConfig.mongodb.host + ':' + sysConfig.mongodb.port + '/' + sysConfig.mongodb.database);
    mongoose.model('DataSequenceModel', require('./models/data-sequence').DataSequenceModel);
    mongoose.model('DataPackageModel', require('./models/data-package').DataPackageModel);
    mongoose.model('DataChannelModel', require('./models/data-channel').DataChannelModel);
    mongoose.model('DataStreamModel', require('./models/data-stream').DataStreamModel);
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
                var signature = sha1(user.api_secret + req.method + req.url + (req.body ? JSON.stringify(req.body) : ''));
                if (user && req.headers.signature === signature) {
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
    server.put('/users/:id', users.put);
    server.post('/users', users.post);

    //  Sessions

    server.post('/sessions', sessions.post);

    //  DataSequences

    server.get('/data_sequences', dataSequences.list);
    server.get('/data_sequences/:id', dataSequences.get);
    server.post('/data_sequences', dataSequences.post);

    // DataPackages

    server.get('/data_packages', dataPackages.list);
    server.post('/data_packages', dataPackages.post);
    server.get('/data_packages/:id', dataPackages.get);

    // DataChannels

    server.get('/data_packages/:data_package_id/channels', dataChannels.list);
    server.post('/data_packages/:data_package_id/channels', dataChannels.post);
    server.get('/data_packages/:data_package_id/channels/:id', dataChannels.get);
    server.put('/data_packages/:data_package_id/channels/:id', dataChannels.put);

    // DataStreams

    server.get('/data_packages/:data_package_id/channels/:data_channel_id/streams', dataStreams.list);
    server.post('/data_packages/:data_package_id/channels/:data_channel_id/streams', dataStreams.post);
    server.get('/data_packages/:data_package_id/channels/:data_channel_id/streams/:id', dataStreams.get);


    // Start server

    server.listen(sysConfig.http_port, function () {
        console.log('%s listening at %s', server.name, server.url);
    });
}());