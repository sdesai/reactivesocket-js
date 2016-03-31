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
 * //TODO: MD and Data should really be buffers, since we don't encode. As a
 * convenience right now we assume utf8
 * @param {String} [frame.metadata=null] The metadata.
 * @param {String} [frame.data=null] The setup error data.
 * @param {string} [frame.flag=FLAGS.NONE] -
 *
 * @returns {Buffer} The encoded frame.
 */
function getReqResFrame(frame) {
    assert.object(frame, 'frame');
    assert.number(frame.streamId, 'frame.streamId');
    assert.optionalNumber(frame.flags, 'frame.flags');
    assert.optionalString(frame.metadata, 'frame.metadata');
    assert.optionalString(frame.data, 'frame.data');

    LOG.debug({frame: frame}, 'getReqResFrame: entering');

    var payloadBuf;

    if (frame.metadata || frame.data) {
        payloadBuf = encodePayload({
            data: frame.data,
            metadata: frame.metadata
        });
    } else {
        payloadBuf = new Buffer(0);
    }

    var flags = frame.metadata ? FLAGS.METADATA || FLAGS.NONE : FLAGS.NONE;

    if (frame.flags) {
        flags = flags || frame.flags;
    }

    var headerBuf = getFrameHeader({
        length: payloadBuf.length,
        type: TYPES.REQUEST_RESPONSE,
        flags: flags,
        streamId: frame.streamId
    });

    // Attach the metadata flag if there is a metadata payload
    if (frame.payload && frame.payload.metadata) {
        metadata.flagMetadata(headerBuf);
    }

    var buf = Buffer.concat([headerBuf, payloadBuf]);

    LOG.debug({buffer: buf}, 'getReqResFrame: exiting');

    return buf;
}

module.exports = getReqResFrame;
