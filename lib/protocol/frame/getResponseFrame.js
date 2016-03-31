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
 * @param {Object} frame -
 * @param {Number} frame.streamId -
 * @param {Object} frame.payload The payload of the frame.
 * @param {Boolean} [isCompleted] - If the this response is the last response
 * for this setup - request flow.
 * @returns {Buffer} The encoded frame.
 */
function getResponseFrame(frame) {
    assert.object(frame, 'frame');
    assert.number(frame.streamId, 'frame.streamId');
    assert.object(frame.payload, 'frame.payload');
    assert.optionalBool(frame.isCompleted, 'frame.isCompleted');

    LOG.debug({frame: frame},
              'getResponseFrame: entering');

    var payloadBuf = encodePayload(frame.payload);
    var flags = frame.isCompleted && FLAGS.COMPLETE || FLAGS.NONE;

    var headerBuf = getFrameHeader({
        payloadLength: payloadBuf.length,
        type: TYPES.RESPONSE,
        flags: flags,
        streamId: frame.streamId
    });

    // Attach the metadata flag if there is a metadata payload
    if (frame.payload && frame.payload.metadata) {
        metadata.flagMetadata(headerBuf);
    }

    var buf = Buffer.concat([headerBuf, payloadBuf]);

    LOG.debug({buffer: buf}, 'returning response Frame');

    return buf;
}

module.exports = getResponseFrame;
