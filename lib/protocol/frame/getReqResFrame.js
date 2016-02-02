'use strict';

var CONSTANTS = require('./../constants');
var LOG = require('./../../defaultLogger');

var getFrameHeader = require('./getFrameHeader');
var encodePayload = require('./encodePayload');
var metadata = require('./metadata');

var FLAGS = CONSTANTS.FLAGS;
var TYPES = CONSTANTS.TYPES;

/**
 * @param {Number} streamId -
 * @param {Object} payload The payload of the frame.
 *
 * @returns {Buffer} The encoded frame.
 */
function getReqResFrame(streamId, payload) {

    LOG.debug({streamId: streamId, payload: payload},
              'getReqResFrame: entering');

    var payloadBuf = encodePayload(payload);
    var flags = FLAGS.NONE;

    var headerBuf = getFrameHeader(payloadBuf.length, TYPES.REQUEST_RESPONSE,
                                   flags, streamId);

    // Attach the metadata flag if there is a metadata payload
    if (payload && payload.metadata) {
        metadata.flagMetadata(headerBuf);
    }

    var buf = Buffer.concat([headerBuf, payloadBuf]);

    LOG.debug({reqResFrame: buf}, 'returning reqRes Frame');

    return buf;
}

module.exports = getReqResFrame;
