'use strict';

var FrameValidationData = require('./FrameValidationData');
var Frame = require('./../lib/protocol/frame');
var expect = require('chai').expect;
var getFrameHeader = require('./../lib/protocol/frame/getFrameHeader');
var friendlyHex = require('./friendlyHex');

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

    it('Setup frame -- should store metadata and data encoding.', function() {
        var expected = FrameValidationData.setupBuffer.toString('hex');
        var actual = Frame.getSetupFrame(1023, 4095, {
            metadata: 'UTF-8',
            data: 'UTF-8'
        }).toString('hex');

        expect(actual).to.equals(expected);
    });
});
