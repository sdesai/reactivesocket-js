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
 * @param {Number} streamId -
 * @param {Object} [payload] - Any additional data to send with the setup frame
 * @param {String} payload.metadata -
 * @param {String} payload.data -
 *
 * @returns {Buffer} The encoded frame.
 */
function getReqResFrame(streamId, payload) {
    assert.number(streamId, 'streamId');
    assert.optionalObject(payload, 'payload');
    // XXX is payload really optional for req res?
    if (payload) {
        assert.optionalString(payload.metadata, 'payload.metadata');
        assert.optionalString(payload.data, 'payload.data');
    }

    LOG.debug({streamId: streamId, payload: payload},
         'getReqResFrame: entering');

    var payloadBuf;

    if (payload) {
        payloadBuf = encodePayload(payload);
    } else {
        payloadBuf = new Buffer(0);
    }

    //XXX should probably set flags here?
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
