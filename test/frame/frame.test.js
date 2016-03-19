'use strict';

var compareFrames = require('../common/compareFrames');
var DATA = require('../data');
var frame = require('../../lib/protocol/frame');
var getFrameHeader = require('../../lib/protocol/frame/getFrameHeader');

var CONSTANTS = require('../../lib/protocol/constants');
var ENCODING = 'UTF-8';

describe('header', function () {
    it('getFrameHeader should produce correct frame headers.', function () {
        var actual = getFrameHeader(256, 0xACAC, 0xBDBD, 4);
        var expected = new Buffer(12);

        // length should be payloadLength + 12 (frameHeaderLength)
        // which should be 0x100 + 0x00C
        expected.writeUInt32BE(0x10c, 0);
        expected.writeUInt32BE(0xacacbdbd, 4);
        expected.writeUInt32BE(0x00000004, 8);

        compareFrames(expected, actual);
    });
});

describe('setup', function () {
    it('should store metadata and data encoding.', function () {
        var expected = DATA.setupFrame;
        var actual = frame.getSetupFrame({
            keepaliveInterval: DATA.SETUP_KEEP_ALIVE,
            maxLifetime: DATA.SETUP_MAX_LIFE,
            payloadEncoding: {
                metadata: ENCODING,
                data: ENCODING
            }
        });
        compareFrames(expected, actual);
    });

    it('setup frame -- should store payload and encoding.', function () {
        var setupMetaData = DATA.SETUP_META_DATA;
        var setupData = DATA.SETUP_DATA;
        var expected = DATA.setupFrameWithMeta;
        var actual = frame.getSetupFrame({
            keepaliveInterval: DATA.SETUP_KEEP_ALIVE,
            maxLifetime: DATA.SETUP_MAX_LIFE,
            payloadEncoding: {
                metadata: ENCODING,
                data: ENCODING
            },
            payload: {
                metadata: setupMetaData,
                data: setupData
            }
        });

        compareFrames(expected, actual);
    });
});

describe('error', function () {
    it('should create bad setup frame error with payload.data', function () {
        var errorCode = CONSTANTS.ERROR_CODES.INVALID_SETUP;
        var expected = DATA.errorFrameWithData;
        var actual = frame.getErrorFrame({
            streamId: DATA.STREAM_ID,
            errorCode: errorCode,
            payload: {
                data: DATA.ERROR_DATA
            }
        });

        compareFrames(expected, actual);
    });

    it('should create bad setup frame error with payload.',
       function () {
           var errorCode = CONSTANTS.ERROR_CODES.INVALID_SETUP;
           var expected = DATA.errorFrameWithMeta;
           var actual = frame.getErrorFrame({
               streamId: DATA.STREAM_ID,
               errorCode: errorCode,
               payload: {
                   data: DATA.ERROR_DATA,
                   metadata: DATA.ERROR_META_DATA
               }
           });

           compareFrames(expected, actual);
       });
});

