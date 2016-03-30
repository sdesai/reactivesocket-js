'use strict';

var assert = require('chai').assert;
var bunyan = require('bunyan');
var streamBuffers = require('stream-buffers');

var compareFrames = require('./common/compareFrames');
var getReqResFrame = require('../lib/protocol/frame/getReqResFrame');
var setFlag = require('./data/setFlag');

var SerializeStream = require('../lib/streams/serializeStream');
var ParseStream = require('../lib/streams/parseStream.js');

var CONSTANTS = require('../lib/protocol/constants');
var ENCODING = 'UTF-8';
var DATA = require('./data');

describe('rs client stream', function () {
    var LOG = bunyan.createLogger({
        name: 'rs client stream tests',
        level: process.env.LOG_LEVEL || bunyan.INFO,
        serializers: bunyan.stdSerializers
    });
    var TRANSPORT_BUF = new streamBuffers.WritableStreamBuffer();
    var S_STREAM = new SerializeStream({
        log: LOG
    });
    S_STREAM.pipe(TRANSPORT_BUF);

    it('should serialize request frame', function () {
        S_STREAM.write({
            type: CONSTANTS.TYPES.REQUEST_RESPONSE,
            streamId: DATA.STREAM_ID,
            payload: {
                data: DATA.REQ_RES_DATA,
                metadata: DATA.REQ_RES_META
            }
        });

        compareFrames(DATA.reqResFrameWithMeta, TRANSPORT_BUF.getContents());
    });
    it('should serialize setup frame', function () {
        S_STREAM.write({
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
        });

        compareFrames(DATA.setupFrameWithMeta, TRANSPORT_BUF.getContents());
    });
    it('should serialize error frame', function () {
        S_STREAM.write({
            type: CONSTANTS.TYPES.ERROR,
            streamId: DATA.STREAM_ID,
            errorCode: CONSTANTS.ERROR_CODES.INVALID_SETUP,
            payload: {
                data: DATA.ERROR_DATA,
                metadata: DATA.ERROR_META_DATA
            }
        });

        compareFrames(DATA.errorFrameWithMeta, TRANSPORT_BUF.getContents());
    });
    it('should serialize response frame', function () {
        var expected = setFlag(DATA.responseFrameWithMeta,
                               CONSTANTS.FLAGS.COMPLETE);
        S_STREAM.write({
            type: CONSTANTS.TYPES.RESPONSE,
            streamId: DATA.STREAM_ID,
            payload: {
                data: DATA.RES_DATA,
                metadata: DATA.RES_META
            },
            isCompleted: true
        });

        compareFrames(expected, TRANSPORT_BUF.getContents());
    });
    it('should parse buffer into frame', function (done) {
        var expected = {
            header: { length: 68, type: 4, flags: 16384, streamId: 4 },
            payload: {
                metadata: 'Some Request Response ',
                data: 'Meta{"arg1":"yes","arg2":"no"}'
            }
        };
        var parseStream = new ParseStream();
        parseStream.on('data', function (frame) {
            assert.deepEqual(expected, frame,
                             'parsed frame should match expected');
            done();
        });
        parseStream.write(getReqResFrame({
            streamId: DATA.STREAM_ID,
            payload: {
                data: DATA.REQ_RES_DATA,
                metadata: DATA.REQ_RES_META
            }
        }));
    });
});
