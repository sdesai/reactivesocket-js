'use strict';

var compareFrames = require('../common/compareFrames');
var data = require('../data');
var frame = require('../../lib/protocol/frame');
var getFrameHeader = require('../../lib/protocol/frame/getFrameHeader');

var CONSTANTS = require('../../lib/protocol/constants');
var ENCODING = 'UTF-8';

describe('header', function () {
    it('getFrameHeader should produce correct frame headers.', function() {
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
    it('should store metadata and data encoding.', function() {
        var expected = data.setupFrame;
        var actual = frame.getSetupFrame(
            data.SETUP_KEEP_ALIVE,
            data.SETUP_MAX_LIFE, {
                metadata: ENCODING,
                data: ENCODING
            });
        compareFrames(expected, actual);
    });

    it('setup frame -- should store payload and encoding.', function() {
        var setupMetaData = data.SETUP_META_DATA;
        var setupData = data.SETUP_DATA;
        var expected = data.setupFrameWithMeta;
        var actual = frame.getSetupFrame(
            data.SETUP_KEEP_ALIVE,
            data.SETUP_MAX_LIFE, {
                metadata: ENCODING,
                data: ENCODING
            }, {
                metadata: setupMetaData,
                data: setupData
            });

        compareFrames(expected, actual);
    });
});

describe('error', function () {
    it('should create bad setup frame error with payload.', function() {
        var errorCode = CONSTANTS.ERROR_CODES.INVALID_SETUP;
        var expected = data.errorFrameWithData;
        var actual = frame.getErrorFrame(data.STREAM_ID, errorCode, {
            data: data.ERROR_DATA
        });

        compareFrames(expected, actual);
    });

    it('should create bad setup frame error with meta payload.',
       function() {
           var errorCode = CONSTANTS.ERROR_CODES.INVALID_SETUP;
           var expected = data.errorFrameWithMeta;
           var actual = frame.getErrorFrame(data.STREAM_ID, errorCode, {
               data: data.ERROR_DATA,
               metadata: data.ERROR_META_DATA
           });

           compareFrames(expected, actual);
       });
});

