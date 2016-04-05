'use strict';

var _ = require('lodash');
var assert = require('chai').assert;
var bunyan = require('bunyan');

var Ws = require('ws');

var Connection = require('../../lib/connection/connection');
var WSStream = require('../../lib/streams/transports/WSStream.js');

var ERROR_CODES = require('../../lib/protocol/constants').ERROR_CODES;

var PORT = process.env.PORT || 1337;

var EXPECTED_REQ = {
    data: 'so much trouble in the world',
    metadata: 'can\'t nobody feel your pain'
};

var EXPECTED_RES = {
    data: 'The world\'s changin everyday, times moving fast',
    metadata: 'My girl said I need a raise, how long will she last?'
};

var EXPECTED_APPLICATION_ERROR = {
    errorCode: ERROR_CODES.APPLICATION_ERROR,
    metadata: 'You gave them all those old time stars',
    data: 'Through wars of worlds - invaded by Mars'
};

describe('connection', function () {
    var LOG = bunyan.createLogger({
        name: 'connection tests',
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
                        type: 'client',
                        metadataEncoding: 'utf-8',
                        dataEncoding: 'utf-8'
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
    });

    after(function (done) {
        var doneCount = 0;
        SERVER_CON.on('close', function () {
            doneCount++;

            if (doneCount === 2) {
                done();
            }
        });
        CLIENT_CON.on('close', function () {
            doneCount++;

            if (doneCount === 2) {
                done();
            }
        });
        WS_CLIENT.close();
        WS_SERVER.close();
    });

    it('extra setup frame', function (done) {
        SERVER_CON.once('setup-error', function (err) {
            done();
        });

        CLIENT_CON.setup({
            metadata: 'You reached for the secret too soon',
            data: 'you cried for the moon.'
        }, function () {});
    });

    it('req/res', function (done) {
        SERVER_CON.once('request', function (stream) {
            assert.deepEqual(stream.getRequest(), EXPECTED_REQ);
            stream.response(_.cloneDeep(EXPECTED_RES));
        });

        var response = CLIENT_CON.request(_.cloneDeep(EXPECTED_REQ));

        response.once('response', function (res) {
            assert.deepEqual(res.getResponse(), EXPECTED_RES);
            done();
        });
    });

    it('req/res once more', function (done) {
        SERVER_CON.once('request', function (stream) {
            assert.deepEqual(stream.getRequest(), EXPECTED_REQ);
            stream.response(_.cloneDeep(EXPECTED_RES));
        });

        var response = CLIENT_CON.request(_.cloneDeep(EXPECTED_REQ));

        response.once('response', function (res) {
            assert.deepEqual(res.getResponse(), EXPECTED_RES);
            done();
        });
    });

    it('req/err', function (done) {
        SERVER_CON.once('request', function (stream) {
            assert.deepEqual(stream.getRequest(), EXPECTED_REQ);
            stream.error(_.cloneDeep(EXPECTED_APPLICATION_ERROR));
        });

        var response = CLIENT_CON.request(_.cloneDeep(EXPECTED_REQ));

        response.once('application-error', function (err) {
            assert.deepEqual(_.omit(err, 'header', 'metadataEncoding',
                                    'dataEncoding'),
                                    EXPECTED_APPLICATION_ERROR);
            done();
        });
    });

});
