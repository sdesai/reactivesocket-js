'use strict';

var assert = require('assert-plus');

var encodePayload = require('./encodePayload');
var getFrameHeader = require('./getFrameHeader');

var CONSTANTS = require('./../constants');
var FLAGS = CONSTANTS.FLAGS;
var LOG = require('./../../defaultLogger');
var TYPES = CONSTANTS.TYPES;

/**
 * @param {Object} frame -
 * @param {Number} frame.streamId -
 * @param {String} [frame.metadata=null] The metadata.
 * @param {String} [frame.data=null] The setup error data.
 * @param {string} [frame.flag=FLAGS.NONE] - Set flags such as complete and
 * follows here.
 * @returns {Buffer} The encoded frame.
 */
function getResponseFrame(frame) {
    assert.object(frame, 'frame');
    assert.number(frame.streamId, 'frame.streamId');
    assert.optionalNumber(frame.flags, 'frame.flags');
    assert.optionalString(frame.metadata, 'frame.metadata');
    assert.optionalString(frame.data, 'frame.data');

    LOG.debug({frame: frame}, 'getResponseFrame: entering');

    var payloadBuf;

    if (frame.metadata || frame.data) {
        payloadBuf = encodePayload({
            data: frame.data,
            metadata: frame.metadata
        });
    } else {
        payloadBuf = new Buffer(0);
    }

    var flags = frame.metadata ? FLAGS.METADATA | FLAGS.NONE : FLAGS.NONE;

    if (frame.flags) {
        flags = flags | frame.flags;
    }

    var headerBuf = getFrameHeader({
        length: payloadBuf.length,
        type: TYPES.RESPONSE,
        flags: flags,
        streamId: frame.streamId
    });

    var buf = Buffer.concat([headerBuf, payloadBuf]);

    LOG.debug({buffer: buf}, 'getResponseFrame: exiting');

    return buf;
}

module.exports = getResponseFrame;
