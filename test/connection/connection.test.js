'use strict';

var _ = require('lodash');
var assert = require('chai').assert;
var bunyan = require('bunyan');

var Ws = require('ws');

var Connection = require('../../lib/connection/connection');
var WSStream = require('../../lib/streams/transports/WSStream.js');

var PORT = process.env.PORT || 1337;


describe('connection', function () {
    var LOG = bunyan.createLogger({
        name: 'connetion tests',
        level: process.env.LOG_LEVEL || bunyan.INFO,
        serializers: bunyan.stdSerializers
    });
    var SERVER_CON;
    var CLIENT_CON;
    var WS_SERVER;
    var WS_CLIENT;
    var WS_SERVER_STREAM;
    var WS_CLIENT_STREAM;

    before(function (done) {
        WS_SERVER = new Ws.Server({port: PORT});
        WS_SERVER.on('listening', function () {
            done();
        });
    });

    beforeEach(function (done) {
        this.timeout(50000);
        WS_SERVER.once('connection', function (socket) {
            WS_SERVER_STREAM = new WSStream({
                log: LOG,
                ws: socket
            });

            SERVER_CON = new Connection({
                log: LOG,
                transport: {
                    stream: WS_SERVER_STREAM
                },
                type: 'server'
            });

            SERVER_CON.on('ready', function () {
                CLIENT_CON = new Connection({
                    log: LOG,
                    transport: {
                        stream: WS_CLIENT_STREAM
                    },
                    type: 'client'
                });

                CLIENT_CON.on('ready', done);
            });
        });

        WS_CLIENT = new Ws('ws://localhost:' + PORT);
        WS_CLIENT.on('open', function () {
            WS_CLIENT_STREAM = new WSStream({
                log: LOG,
                ws: WS_CLIENT
            });
        });
    });

    afterEach(function () {
        //WS_CLIENT.close();
    });

    after(function () {
        WS_CLIENT.close();
        WS_SERVER.close();
    });

    it ('req/res', function (done) {
        var expectedReq = {
            data: 'so much trouble in the world',
            metadata: 'can\'t nobody feel your pain'
        };

        var expectedRes = {
            data: 'The world\'s changin everyday, times moving fast',
            metadata: 'My girl said I need a raise, how long will she last?'
        };

        SERVER_CON.on('request', function(req) {
            assert.deepEqual(req.request, expectedReq);
            req.response(expectedRes);
        });

        var response = CLIENT_CON.request(expectedReq);

        response.on('response', function (res) {
            assert.deepEqual(res, res);
            done();
        });
    });

    it('req/res once more', function (done) {
        var expectedReq = {
            data: 'so much trouble in the world',
            metadata: 'can\'t nobody feel your pain'
        };

        var expectedRes = {
            data: 'The world\'s changin everyday, times moving fast',
            metadata: 'My girl said I need a raise, how long will she last?'
        };

        SERVER_CON.on('request', function(req) {
            assert.deepEqual(req.request, expectedReq);
            req.response(expectedRes);
        });

        var response = CLIENT_CON.request(expectedReq);

        response.on('response', function (res) {
            assert.deepEqual(res, res);
            done();
        });

    });
});
