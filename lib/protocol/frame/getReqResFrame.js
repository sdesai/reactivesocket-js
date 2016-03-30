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
 * @param {Object} [frame.payload] - Any additional data to send with the setup
 * frame
 * @param {String} frame.payload.metadata -
 * @param {String} frame.payload.data -
 * @param {string} [frame.flag=FLAGS.NONE] -
 *
 * @returns {Buffer} The encoded frame.
 */
function getReqResFrame(frame) {
    assert.object(frame, 'frame');
    assert.number(frame.streamId, 'frame.streamId');
    assert.optionalNumber(frame.flags, 'frame.flags');
    assert.optionalObject(frame.payload, 'frame.payload');
    // XXX is payload really optional for req res?
    if (frame.payload) {
        assert.optionalString(frame.payload.metadata, 'frame.payload.metadata');
        assert.optionalString(frame.payload.data, 'frame.payload.data');
    }

    LOG.debug({frame: frame}, 'getReqResFrame: entering');

    var payloadBuf;

    if (frame.payload) {
        payloadBuf = encodePayload(frame.payload);
    } else {
        payloadBuf = new Buffer(0);
    }

    var flags = frame.flags || FLAGS.NONE;

    var headerBuf = getFrameHeader(payloadBuf.length, TYPES.REQUEST_RESPONSE,
                                   flags, frame.streamId);

    // Attach the metadata flag if there is a metadata payload
    if (frame.payload && frame.payload.metadata) {
        metadata.flagMetadata(headerBuf);
    }

    var buf = Buffer.concat([headerBuf, payloadBuf]);

    LOG.debug({buffer: buf}, 'returning reqRes Frame');

    return buf;
}

module.exports = getReqResFrame;
