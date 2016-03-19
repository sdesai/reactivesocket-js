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
 * @param {Object} [frame.payload=null] The payload.
 *
 * @returns {Buffer} The encoded error frame.
 */
module.exports = function getErrorFrame(frame) {
    assert.object(frame, 'frame');
    assert.number(frame.streamId, 'frame.streamId');
    assert.number(frame.errorCode, 'frame.errorCode');
    assert.optionalNumber(frame.flags, 'frame.flags');
    assert.optionalObject(frame.payload, 'frame.payload');

    LOG.debug({frame: frame}, 'getErrorFrame: entering');

    var payloadBuf = encodePayload(frame.payload);
    var frameHeaderBuf = getFrameHeader(payloadBuf.length,
                                        TYPES.ERROR,
                                        frame.flags || FLAGS.NONE,
                                        frame.streamId);

    // If there is metadata, then we need to encode the flag
    if (frame.payload && frame.payload.metadata) {
        metadata.flagMetadata(frameHeaderBuf);
    }

    var errorHeaderBuf = new Buffer(4).fill(0);
    errorHeaderBuf.writeUInt32BE(frame.errorCode, 0);

    var buf = Buffer.concat([frameHeaderBuf, errorHeaderBuf, payloadBuf]);
    LOG.debug({frame: buf}, 'getErrorFrame: exiting');
    return buf;
};
