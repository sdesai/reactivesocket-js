'use strict';

var assert = require('assert-plus');

var encodePayload = require('./encodePayload');
var getFrameHeader = require('./getFrameHeader');
var metadata = require('./metadata');

var CONSTANTS = require('./../constants');
var FLAGS = CONSTANTS.FLAGS;
var LOG = require('./../../defaultLogger');
var TYPES = CONSTANTS.TYPES;

/**
 * @param {Object} frame - The frame to be encoded as buffer
 * @param {Number} frame.streamId The stream ID.
 * @param {Number} frame.errorCode The error code.
 * @param {Number} [frame.flags=null] The flag.
 * @param {Object} [frame.data=null] The metadata & setup error data.
 *
 * @returns {Buffer} The encoded error frame.
 */
module.exports = function getErrorFrame(frame) {
    assert.object(frame, 'frame');
    assert.number(frame.streamId, 'frame.streamId');
    assert.number(frame.errorCode, 'frame.errorCode');
    assert.optionalNumber(frame.flags, 'frame.flags');
    assert.optionalObject(frame.payload, 'frame.payload');

    if (frame.payload) {
        assert.optionalString(frame.payload.metadata, 'payload.metadata');
        assert.optionalString(frame.payload.data, 'payload.data');
    }

    LOG.debug({frame: frame}, 'getErrorFrame: entering');

    var payloadBuf = encodePayload(frame.payload);
    var frameHeaderBuf = getFrameHeader({
        payloadLength: payloadBuf.length,
        type: TYPES.ERROR,
        flags: frame.flags || FLAGS.NONE,
        streamId: frame.streamId
    });

    // If there is metadata, then we need to encode the flag
    if (frame.payload && frame.payload.metadata) {
        metadata.flagMetadata(frameHeaderBuf);
    }

    var errorHeaderBuf = new Buffer(4).fill(0);
    errorHeaderBuf.writeUInt32BE(frame.errorCode, 0);

    var buf = Buffer.concat([frameHeaderBuf, errorHeaderBuf, payloadBuf]);
    LOG.debug({buffer: buf}, 'getErrorFrame: exiting');
    return buf;
};
