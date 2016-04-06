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
 * @param {Object} frame - The header frame
 * @param {Number} frame.length - length of frame excluding header
 * @param {Number} frame.type -
 * @param {Number} frame.flags -
 * @param {Number} frame.streamId -
 * @returns {Buffer} The frame header
 */
function getFrameHeader(frame) {
    LOG.debug({frame: frame}, 'getFrameHeader: entering');

    assert.object(frame);
    assert.number(frame.length, 'frame.length');
    assert.number(frame.type, 'frame.type');
    assert.number(frame.flags, 'frame.flags');
    assert.number(frame.streamId, 'frame.streamId');


    //TODO: Not supposed to set this with framed transport?
    var frameLength = FRAME_HEADER_LENGTH;

    switch (frame.type) {
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

    frameLength += frame.length;
    LOG.debug({frameLength: frameLength}, 'getFrameHeader');

    var buf = new Buffer(12).fill(0);
    var offset = 0;
    buf.writeUInt32BE(frameLength, offset);
    offset += 4;
    buf.writeUInt16BE(frame.type, offset);
    offset += 2;
    buf.writeUInt16BE(frame.flags, offset);
    offset += 2;
    buf.writeUInt32BE(frame.streamId, offset);

    LOG.debug({buffer: buf}, 'getFrameHeader: exiting');
    return buf;
}

module.exports = getFrameHeader;
