'use strict';

var dbURI = 'mongodb://localhost/piecemeta-api-test',
    access_tokens = require('../../controllers/access-tokens'),
    should = require('chai').should(),
    sinon = require('sinon'),
    async = require('async'),
    mongoose = require('mongoose'),
    clearDB = require('mocha-mongoose')(dbURI);

var user, api_key;

describe("AccessToken controller", function () {
    describe("POST method", function () {
        it("returns AccessToken for ApiKey", function (done) {
            var req = {
                params: {
                    key: api_key.key,
                    secret: api_key.secret
                }
            };
            var res = {
                send: sinon.spy()
            };
            access_tokens.post(req, res, function () {
                res.send.args[0][0].should.equal(201);
                done();
            });
        });

        it("returns AccessToken for email / password", function (done) {
            var req = {
                params: {
                    email: user.email,
                    password: 'asdfasdf'
                }
            };
            var res = {
                send: sinon.spy()
            };
            access_tokens.post(req, res, function () {
                res.send.args[0][0].should.equal(201);
                done();
            });
        });

        it("returns AccessToken for Single Access Token (returns 401 on second attempt)", function (done) {
            var req = {
                params: {
                    single_access_token: user.single_access_token
                }
            };
            var res = {
                send: sinon.spy()
            };
            access_tokens.post(req, res, function () {
                res.send.args[0][0].should.equal(201);
                access_tokens.post(req, res, function () {
                    res.send.args[1][0].statusCode.should.equal(401);
                    done();
                });
            });
        });

        it("returns 401 (Invalid credentials) for wrong ApiKey", function (done) {
            var req = {
                params: {
                    key: 'asdf',
                    secret: 'asdf'
                }
            };
            var res = {
                send: sinon.spy()
            };
            access_tokens.post(req, res, function () {
                res.send.args[0][0].statusCode.should.equal(401);
                done();
            });
        });

        it("returns 401 (Invalid credentials) for wrong email / password", function (done) {
            var req = {
                params: {
                    email: 'asdf',
                    password: 'asdf'
                }
            };
            var res = {
                send: sinon.spy()
            };
            access_tokens.post(req, res, function () {
                res.send.args[0][0].statusCode.should.equal(401);
                done();
            });
        });


        beforeEach(function (done) {
            async.waterfall([
                function (cb) {
                    if (!mongoose.connection.db) {
                        mongoose.connect(dbURI, cb);
                    } else {
                        cb(null);
                    }
                },
                function (cb) {
                    mongoose.model('AccessToken', require('../../models/mongoose/access-token').AccessToken);
                    mongoose.model('ApiKey', require('../../models/mongoose/api-key').ApiKey);
                    mongoose.model('User', require('../../models/mongoose/user').User);
                    cb(null);
                },
                function (cb) {
                    mongoose.model('User').create({ name: 'John Doe', email: 'test@asdf.asdf', password: 'asdfasdf' }, cb);
                },
                function (result, cb) {
                    user = result;
                    mongoose.model('ApiKey').create({ user_uuid: user.uuid }, cb);
                },
                function (result, cb) {
                    api_key = result;
                    cb(null);
                }
            ], function (err) {
                done(err);
            });
        });
    });
});
