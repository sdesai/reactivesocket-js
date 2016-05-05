'use strict';

var assert = require('assert-plus');

var encodePayload = require('./payload').encodePayload;
var getFrameHeader = require('./getFrameHeader');

var CONSTANTS = require('./../constants');
var FLAGS = CONSTANTS.FLAGS;
var LOG = require('./../../logger');
var TYPES = CONSTANTS.TYPES;

/**
 * @param {Object} frame - The frame to be encoded as buffer
 * @param {Number} frame.streamId The stream ID.
 * @param {Number} frame.errorCode The error code.
 * @param {string} [frame.flag=FLAGS.NONE] - Set flags such as complete and
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
    assert.string(frame.metadataEncoding, 'frame.metadataEncoding');
    assert.string(frame.dataEncoding, 'frame.dataEncoding');
    assert.optionalNumber(frame.flags, 'frame.flags');
    assert.optionalString(frame.metadata, 'frame.metadata');
    assert.optionalString(frame.data, 'frame.data');

    LOG.debug({frame: frame}, 'getErrorFrame: entering');

    var payloadBuf = encodePayload({
        data: frame.data,
        metadata: frame.metadata
    }, frame.metadataEncoding, frame.dataEncoding);
    var frameHeaderBuf = getFrameHeader({
        length: payloadBuf.length,
        type: TYPES.ERROR,
        flags: frame.metadata ? FLAGS.METADATA : FLAGS.NONE,
        streamId: frame.streamId
    });

    // If there is metadata, then we need to encode the flag
    var flags = frame.metadata ? FLAGS.METADATA | FLAGS.NONE : FLAGS.NONE;

    if (frame.flags) {
        flags = flags | frame.flags;
    }

    var errorCodeBuf = new Buffer(4).fill(0);
    errorCodeBuf.writeUInt32BE(frame.errorCode, 0);

    var buf = Buffer.concat([frameHeaderBuf, errorCodeBuf, payloadBuf]);
    LOG.debug({buffer: buf}, 'getErrorFrame: exiting');
    return buf;
};
