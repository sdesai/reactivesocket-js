'use strict';

var assert = require('assert-plus');

var encodePayload = require('./payload').encodePayload;
var getFrameHeader = require('./getFrameHeader');

var CONSTANTS = require('./../constants');
var FLAGS = CONSTANTS.FLAGS;
var LOG = require('./../../logger');
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
    assert.string(frame.metadataEncoding, 'frame.metadataEncoding');
    assert.string(frame.dataEncoding, 'frame.dataEncoding');
    assert.optionalNumber(frame.flags, 'frame.flags');
    assert.optionalString(frame.metadata, 'frame.metadata');
    assert.optionalString(frame.data, 'frame.data');

    LOG.debug({frame: frame}, 'getReqResFrame: entering');

    var payloadBuf;

    if (frame.metadata || frame.data) {
        payloadBuf = encodePayload({
            data: frame.data,
            metadata: frame.metadata
        }, frame.metadataEncoding, frame.dataEncoding);
    } else {
        payloadBuf = new Buffer(0);
    }

    var flags = frame.metadata ? FLAGS.METADATA | FLAGS.NONE : FLAGS.NONE;

    if (frame.flags) {
        flags = flags | frame.flags;
    }

    var headerBuf = getFrameHeader({
        length: payloadBuf.length,
        type: TYPES.REQUEST_RESPONSE,
        flags: flags,
        streamId: frame.streamId
    });

    var buf = Buffer.concat([headerBuf, payloadBuf]);

    LOG.debug({buffer: buf}, 'getReqResFrame: exiting');

    return buf;
}

module.exports = getReqResFrame;
