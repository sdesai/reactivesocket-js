'use strict';

var assert = require('chai').assert;
var bunyan = require('bunyan');
var once = require('once');
var ws = require('ws');

var ParseStream = require('../lib/streams/parseStream.js');
var SerializeStream = require('../lib/streams/serializeStream');
var WSStream = require('../lib/streams/transports/WSStream.js');

var PORT = process.env.PORT || 1337;

var CONSTANTS = require('../lib/protocol/constants');
var DATA = require('./data');
var ENCODING = 'UTF-8';

// setup frame
var CLIENT_FRAME = {
    type: CONSTANTS.TYPES.SETUP,
    keepaliveInterval: DATA.SETUP_KEEP_ALIVE,
    maxLifetime: DATA.SETUP_MAX_LIFE,
    payloadEncoding: {
        metadata: ENCODING,
        data: ENCODING
    },
    payload: {
        metadata: DATA.SETUP_META_DATA,
        data: DATA.SETUP_DATA
    }
};

// response frame
var SERVER_FRAME = {
    type: CONSTANTS.TYPES.RESPONSE,
    streamId: DATA.STREAM_ID,
    payload: {
        data: 'Remember when you were young, you shone like the sun.',
        metadata: DATA.RES_META
    },
    isCompleted: true
};

describe('RS WS Integ Tests', function () {
    var LOG = bunyan.createLogger({
        name: 'rs client stream tests',
        level: process.env.LOG_LEVEL || bunyan.INFO,
        serializers: bunyan.stdSerializers
    });
    LOG.addSerializers({
        buffer: function (buf){ return buf.toString() }
    });

    var WS_SERVER;
    var WS_CLIENT;
    var WS_SERVER_STREAM;
    var WS_CLIENT_STREAM;

    beforeEach(function (done) {
        WS_SERVER = new ws.Server({port: PORT});
        WS_SERVER.on('listening', done);
    });

    afterEach(function () {
        // We really should not end this until we know the server is closed.
        // Unfortunately ws does not provide an API to let us know that the
        // server has been closed.
        // This might introduce race conditions between tests.
        WS_CLIENT.close();
        WS_SERVER.close();
    });

    it('ws client/server serialize/parse frames', function (done) {
        var endCount = 0;
        var asserted = 0;
        done = once(done);
        WS_SERVER.on('connection', function (socket) {
            WS_SERVER_STREAM = new WSStream({
                log: LOG,
                ws: socket
            });

            var serializeStream = new SerializeStream({log: LOG});
            var parseStream = new ParseStream({log: LOG});
            serializeStream.pipe(WS_SERVER_STREAM);
            WS_SERVER_STREAM.pipe(parseStream);


            // can't use once here since we need to listen for the 'end' event.
            // the stream is in paused mode until there is a readable listener
            // so we must continue to listen.
            parseStream.on('readable', function () {
                var frame = parseStream.read();
                if (!frame) {
                    return;
                }
                assert.isObject(frame);
                assert.isObject(frame.setup);
                assert.deepEqual(frame.setup.encoding,
                                 CLIENT_FRAME.payloadEncoding);
                assert.deepEqual(frame.setup.keepaliveInterval,
                                 CLIENT_FRAME.keepaliveInterval);
                assert.deepEqual(frame.setup.maxLife, CLIENT_FRAME.maxLifetime);
                assert.deepEqual(frame.payload, CLIENT_FRAME.payload);
                asserted++;
                serializeStream.write(SERVER_FRAME);
            });

            parseStream.on('end', function () {
                endCount++;
                if (endCount === 2) {
                    assert.equal(asserted, 2, 'did not assert all values');
                    done();
                }
            });
        });

        WS_CLIENT = new ws('ws://localhost:' + PORT);
        WS_CLIENT.on('open', function () {
            WS_CLIENT_STREAM = new WSStream({
                log: LOG,
                ws: WS_CLIENT
            });
            var rssStream = new SerializeStream({log: LOG});
            var rspStream = new ParseStream({log: LOG});
            rssStream.pipe(WS_CLIENT_STREAM);
            WS_CLIENT_STREAM.pipe(rspStream);
            // note that readable gets fired when the stream ends, since the
            // producer pushes a null string, even tho the stream is supposed
            // end
            rspStream.on('readable', function () {
                var frame = rspStream.read();
                if (!frame) {
                    return;
                }
                assert.isObject(frame);
                assert.deepEqual(frame.header.streamId, SERVER_FRAME.streamId);
                assert.deepEqual(frame.header.type, SERVER_FRAME.type);
                assert.deepEqual(frame.payload, SERVER_FRAME.payload);
                asserted++;
                WS_CLIENT.close();
            });

            rspStream.on('end', function () {
                endCount++;
                if (endCount === 2) {
                    assert.equal(asserted, 2, 'did not assert all values');
                    done();
                }
            });

            rssStream.write(CLIENT_FRAME);
        });
    });
});
