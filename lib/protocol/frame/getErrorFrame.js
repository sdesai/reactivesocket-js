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
 * //TODO: MD and Data should really be buffers, since we don't encode. As a
 * convenience right now we assume utf8
 * @param {String} [frame.metadata=null] The metadata.
 * @param {String} [frame.data=null] The setup error data.
 *
 * @returns {Buffer} The encoded error frame.
 */
module.exports = function getErrorFrame(frame) {
    assert.object(frame, 'frame');
    assert.number(frame.streamId, 'frame.streamId');
    assert.number(frame.errorCode, 'frame.errorCode');
    assert.optionalNumber(frame.flags, 'frame.flags');
    assert.optionalString(frame.metadata, 'frame.metadata');
    assert.optionalString(frame.data, 'frame.data');

    LOG.debug({frame: frame}, 'getErrorFrame: entering');

    var mdDataBuf = encodePayload({
        data: frame.data,
        metadata: frame.metadata
    });
    var frameHeaderBuf = getFrameHeader({
        length: mdDataBuf.length,
        type: TYPES.ERROR,
        flags: frame.metadata ? FLAGS.METADATA : FLAGS.NONE,
        streamId: frame.streamId
    });

    // If there is metadata, then we need to encode the flag
    if (frame.metadata) {
        metadata.flagMetadata(frameHeaderBuf);
    }

    var errorCodeBuf = new Buffer(4).fill(0);
    errorCodeBuf.writeUInt32BE(frame.errorCode, 0);

    var buf = Buffer.concat([frameHeaderBuf, errorCodeBuf, mdDataBuf]);
    LOG.debug({buffer: buf}, 'getErrorFrame: exiting');
    return buf;
};
