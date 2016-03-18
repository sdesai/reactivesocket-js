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
 * @param {Number} streamId The stream ID.
 * @param {Number} eCode The error code.
 * @param {Object} payload The payload.
 *
 * @returns {Buffer} The encoded error frame.
 */
module.exports = function getErrorFrame(streamId, eCode, payload) {
    assert.number(streamId, 'streamId');
    assert.number(streamId, 'eCode');
    assert.object(payload, 'payload');

    LOG.debug({streamId: streamId, eCode: eCode, payload: payload},
              'getErrorFrame: entering');

    var payloadBuf = encodePayload(payload);
    var frameHeaderBuf = getFrameHeader(payloadBuf.length,
                                        TYPES.ERROR, FLAGS.NONE, streamId);

    // If there is metadata, then we need to encode the flag
    if (payload && payload.metadata) {
        metadata.flagMetadata(frameHeaderBuf);
    }

    var errorHeaderBuf = new Buffer(4).fill(0);
    errorHeaderBuf.writeUInt32BE(eCode, 0);

    var buf = Buffer.concat([frameHeaderBuf, errorHeaderBuf, payloadBuf]);
    LOG.debug({frame: buf}, 'getErrorFrame: exiting');
    return buf;
};
