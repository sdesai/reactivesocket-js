'use strict';

var assert = require('assert-plus');

var CONSTANTS = require('./../constants');
var FRAME_HEADER_LENGTH = CONSTANTS.FRAME_HEADER_LENGTH;
var LOG = require('./../../defaultLogger');
var TYPES = CONSTANTS.TYPES;

/**
 * Constructs the frame header.  The specification for the frame
 * header can be found here:
 * https://github.com/ReactiveSocket/reactivesocket/blob/master/Protocol.md#frame-header-format
 * @param {Number} payloadLength -
 * @param {Number} type -
 * @param {Number} flags -
 * @param {Number} streamId -
 * @returns {Buffer} The frame header
 */
function getFrameHeader(payloadLength, type, flags, streamId) {
    assert.number(payloadLength, 'payloadLength');
    assert.number(type, 'type');
    assert.number(flags, 'flags');
    assert.number(streamId, 'streamId');

    LOG.debug({
        payloadLength: payloadLength,
        type: type,
        flags: flags,
        streamId: streamId
    }, 'getFrameHeader: entering');

    //TODO: Not supposed to set this with framed transport?
    var frameLength = FRAME_HEADER_LENGTH;

    switch (type) {
        case TYPES.REQUEST_STREAM:
        case TYPES.REQUEST_SUB:
        case TYPES.REQUEST_N:
        case TYPES.ERROR:
            frameLength += 4;
            break;
        case TYPES.REQUEST_CHANNEL:
        case TYPES.REQUEST_FNF:
            break;
        default:
            break;
    }

    frameLength += payloadLength;
    LOG.debug({frameLength: frameLength}, 'getFrameHeader');

    var buf = new Buffer(12).fill(0);
    var offset = 0;
    buf.writeUInt32BE(frameLength, offset);
    offset += 4;
    buf.writeUInt16BE(type, offset);
    offset += 2;
    buf.writeUInt16BE(flags, offset);
    offset += 2;
    buf.writeUInt32BE(streamId, offset);

    LOG.debug({header: buf}, 'getFrameHeader: exiting');
    return buf;
}

module.exports = getFrameHeader;
