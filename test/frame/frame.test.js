'use strict';

var _ = require('lodash');
var assert = require('chai').assert;

var compareFrames = require('../common/compareFrames');
var frame = require('../../lib/protocol/frame');

var DATA = require('../data');
var CONSTANTS = require('../../lib/protocol/constants');
var ENCODING = 'UTF-8';

describe('header', function () {
    it('getFrameHeader should produce correct frame headers.', function () {
        var actual = frame.getFrameHeader({
            length: 256,
            type: 0xACAC,
            flags: 0xBDBD,
            streamId: 4
        });
        var expected = new Buffer(12);

        // length should be payloadLength + 12 (frameHeaderLength)
        // which should be 0x100 + 0x00C
        expected.writeUInt32BE(0x10c, 0);
        expected.writeUInt32BE(0xacacbdbd, 4);
        expected.writeUInt32BE(0x00000004, 8);

        compareFrames(expected, actual);
    });
    it('encode/parse', function () {
        var seedFrame = {
            length: 0, // 0 since we have no additional frame
            type: CONSTANTS.TYPES.REQUEST_RESPONSE,
            flags: CONSTANTS.FLAGS.METADATA,
            streamId: 4
        };

        var expectedParsedFrame = {
            header: {
                length: 12, // 12 becuase this is the length of the actual frame
                flags: seedFrame.flags,
                type: seedFrame.type,
                streamId: seedFrame.streamId
            }
        }

        var actualFrame = frame.parseFrame(frame.getFrameHeader(seedFrame));
        assert.deepEqual(expectedParsedFrame, actualFrame);
    });
});

describe('setup', function () {
    it('should store metadata and data encoding.', function () {
        var expected = DATA.setupFrame;
        var actual = frame.getSetupFrame({
            keepalive: DATA.SETUP_KEEP_ALIVE,
            maxLifetime: DATA.SETUP_MAX_LIFE,
            metadataEncoding: ENCODING,
            dataEncoding: ENCODING
        });
        compareFrames(expected, actual);
    });

    //it('should store payload and encoding.', function () {
        //var setupMetaData = DATA.SETUP_META_DATA;
        //var setupData = DATA.SETUP_DATA;
        //var expected = DATA.setupFrameWithMeta;
        //var actual = frame.getSetupFrame({
            //keepalive: DATA.SETUP_KEEP_ALIVE,
            //maxLifetime: DATA.SETUP_MAX_LIFE,
            //metadataEncoding: ENCODING,
            //dataEncoding: ENCODING,
            //payload: {
                //metadata: setupMetaData,
                //data: setupData
            //}
        //});

        //compareFrames(expected, actual);
    //});

    it('encode/decode', function () {
        var seedFrame = {
            keepalive: getRandomInt(0, Math.pow(2, 32)),
            maxLifetime: getRandomInt(0, Math.pow(2, 32)),
            metadataEncoding: 'somerandomencoding',
            dataEncoding: 'someotherrandomencoding',
            metadata: 'We\'re just two lost souls swimming in a fish bowl',
            data: 'year after year'
        };
        var actualFrame = frame.parseFrame(frame.getSetupFrame(seedFrame));
        assert.isObject(actualFrame.header);
        assert.equal(actualFrame.header.streamId, 0,
                     'setup frame id must be 0');
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.SETUP);
        assert.deepEqual(actualFrame.setup, _.omit(seedFrame, 'data',
                                                   'metadata'));
        assert.deepEqual(actualFrame.data, seedFrame.data);
        assert.deepEqual(actualFrame.metadata, seedFrame.metadata);
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

    it('encode/decode', function () {
        var seedFrame = {
            streamId: getRandomInt(0, Math.pow(2, 32)),
            errorCode: getRandomInt(0, Math.pow(2, 16)),
            payload: {
                data: 'Running over the same old ground',
                metadata: 'What have we found'
            }
        }

        var actualFrame = frame.parseFrame(frame.getErrorFrame(seedFrame));

        console.log(seedFrame);
        console.log(actualFrame);
    });
});

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
