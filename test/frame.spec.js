'use strict';

var CONSTANTS = require('./../lib/protocol/constants');
var FrameValidationData = require('./FrameValidationData');
var Frame = require('./../lib/protocol/frame');

var expect = require('chai').expect;
var friendlyHex = require('./friendlyHex');
var getFrameHeader = require('./../lib/protocol/frame/getFrameHeader');

describe('Frame', function () {
    it('getFrameHeader should produce correct frame headers.', function() {
        var header = getFrameHeader(256, 0xACAC, 0xBDBD, 4);
        var expectedHeader = new Buffer(12);

        // length should be payloadLength + 12 (frameHeaderLength)
        // which should be 0x100 + 0x00C
        expectedHeader.writeUInt32BE(0x10c, 0);
        expectedHeader.writeUInt32BE(0xacacbdbd, 4);
        expectedHeader.writeUInt32BE(0x00000004, 8);

        var headerHex = friendlyHex(header);
        var expectedHex = friendlyHex(expectedHeader);

        // compares the two
        expect(headerHex).to.equals(expectedHex);
    });

    it('Setup Frame -- should store metadata and data encoding.', function() {
        var expected = FrameValidationData.setupFrame;
        var actual = Frame.getSetupFrame(1023, 4095, {
            metadata: 'UTF-8',
            data: 'UTF-8'
        });

        var actualHex = friendlyHex(actual);
        var expectedHex = friendlyHex(expected);

        // compares the two
        expect(actualHex).to.equals(expectedHex);
    });

    it('Setup Frame -- should store payload and encoding.', function() {
        var setupMetaData = 'super important metadata';
        var setupData = 'super important data';
        var expected = FrameValidationData.setupFrameWithPayload;
        var actual = Frame.getSetupFrame(1023, 4095, {
            metadata: 'UTF-8',
            data: 'UTF-8'
        }, {
            metadata: setupMetaData,
            data: setupData
        });

        var actualHex = friendlyHex(actual);
        var expectedHex = friendlyHex(expected);

        // compares the two
        expect(actualHex).to.equals(expectedHex);
    });

    it('Error Frame -- should create bad setup frame error with payload.', function() {
        var errorCode = CONSTANTS.ERROR_CODES.INVALID_SETUP;
        var expected = FrameValidationData.errorFrame;
        var actual = Frame.getErrorFrame(4, errorCode, {
            data: 'Bad Data'
        });

        var actualHex = friendlyHex(actual);
        var expectedHex = friendlyHex(expected);

        // compares the two
        expect(actualHex).to.equals(expectedHex);
    });
});
