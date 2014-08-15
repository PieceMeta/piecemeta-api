var restify = require('restify'),
    mongoose = require('mongoose'),
    dataSequences = require('./resources/data-sequences');


// Database

mongoose.connect('mongodb://127.0.0.1:27017/piecemeta-api');
mongoose.model('DataSequenceModel', require('./models/data-sequence').DataSequenceModel);


// Server config

var server = restify.createServer();
server.use(restify.CORS());
server.use(restify.gzipResponse());
server.use(restify.authorizationParser());
server.use(restify.dateParser());
server.use(restify.bodyParser());


//  Resources
//

//  DataSequences

server.get('/data_sequences', dataSequences.list);
server.get('/data_sequences/:id', dataSequences.get);
server.post('/data_sequences', dataSequences.post);


// Start server

server.listen(8080, function () {
    'use strict';
    console.log('%s listening at %s', server.name, server.url);
});
