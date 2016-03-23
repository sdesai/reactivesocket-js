'use strict';

var assert = require('chai').assert;
var bunyan = require('bunyan');
var ws = require('ws');
var websocket_stream = require('websocket-stream');

var SerializeStream = require('../lib/streams/serializeStream');
var ParseStream = require('../lib/streams/parseStream.js');

var CONSTANTS = require('../lib/protocol/constants');
var ENCODING = 'UTF-8';
var DATA = require('./data');
var PORT = process.env.PORT || 1337;

describe('ws stream integration', function () {
    var LOG = bunyan.createLogger({
        name: 'rs client stream tests',
        level: process.env.LOG_LEVEL || bunyan.INFO,
        serializers: bunyan.stdSerializers
    });

    var WS_CLIENT_STREAM;
    var WS_SERVER;
    var RS_PARSE_STREAM = new ParseStream();
    var RS_SERIALIZE_STREAM = new SerializeStream({log: LOG});

    beforeEach(function (done) {
        RS_PARSE_STREAM = new ParseStream();
        WS_SERVER = new ws.Server('ws://localhost:' + PORT);
        WS_SERVER.on('listening', done);
        WS_SERVER.on('connection', function (socket) {
            socket.pipe(RS_PARSE_STREAM);
        });
    });

    it('server stream should get request frame from client', function (done) {

    });
});
