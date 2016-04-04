'use strict';

var assert = require('assert-plus');

var encodePayload = require('./payload').encodePayload;
var getFrameHeader = require('./getFrameHeader');

var CONSTANTS = require('./../constants');
var FLAGS = CONSTANTS.FLAGS;
var LOG = require('./../../defaultLogger');
var TYPES = CONSTANTS.TYPES;

/**
 * @param {Object} frame -
 * @param {Number} flags -
 * @param {Number} frame.version The version of the protocol.
 * @param {Number} frame.keepalive The keep alive interval in ms.
 * @param {Number} frame.maxLifetime The max life time in ms.
 * @param {Object} frame.metadataEncoding The encoding of the metadata
 * @param {Object} frame.dataEncoding The encoding of the data
 * @param {Object} [frame.data] - Any additional data to send with the setup
 * frame
 * @param {String} [frame.metadata] -
 * @returns {Buffer} The frame.
 */
module.exports = function getSetupFrame(frame) {
    assert.object(frame, 'frame');
    assert.number(frame.version, 'frame.version');
    assert.number(frame.keepalive, 'frame.keepalive');
    assert.number(frame.maxLifetime, 'frame.maxLifetime');
    assert.string(frame.metadataEncoding, 'frame.metadataEncoding');
    assert.string(frame.dataEncoding, 'frame.dataEncoding');
    assert.optionalNumber(frame.flags, 'frame.flags');
    assert.optionalString(frame.metadata, 'frame.metadata');
    assert.optionalString(frame.data, 'frame.data');

    LOG.debug({frame: frame}, 'getSetupFrame: entering');
    // Setup buffer
    var setupBuf = new Buffer(12).fill(0);
    var offset = 0;
    setupBuf.writeUInt32BE(frame.version, offset);
    offset += 4;
    setupBuf.writeUInt32BE(frame.keepalive, offset);
    offset += 4;
    setupBuf.writeUInt32BE(frame.maxLifetime, offset);

    var metaLength = frame.metadataEncoding.length;
    var dataLength = frame.dataEncoding.length;

    // Encoding information
    // 2 bytes for the encoding length + the md and data lengths
    var encodingBuffer = new Buffer(1 + metaLength +
                                           1 + dataLength).fill(0);
    var encodingOffset = 1;

    // Metadata and encoding type
    encodingBuffer.writeUInt8(metaLength, 0);
    encodingBuffer.write(frame.metadataEncoding, encodingOffset,
                                CONSTANTS.MIME_ENCODING);
    encodingOffset += metaLength;

    // data and encoding type
    encodingBuffer.writeUInt8(dataLength, encodingOffset);
    encodingBuffer.write(frame.dataEncoding, encodingOffset + 1,
                                CONSTANTS.MIME_ENCODING);

    // data + metadata
    var payloadBuf;

    if (frame.data || frame.metadata) {
        payloadBuf = encodePayload({
            metadata: frame.metadata,
            data: frame.data
        }, frame.metadataEncoding, frame.dataEncoding);
    } else {
        payloadBuf = new Buffer(0);
    }

    var flags = frame.metadata ? FLAGS.METADATA | FLAGS.NONE : FLAGS.NONE;

    if (frame.flags) {
        flags = flags | frame.flags;
    }
    // Setup Frame Header, stream ID is always 0 for the setup frame
    var headerBuf = getFrameHeader({
        length: encodingBuffer.length + setupBuf.length +
            payloadBuf.length,
        type: TYPES.SETUP,
        flags: flags,
        streamId: 0
    });

    var buf = Buffer.concat([
        headerBuf, setupBuf, encodingBuffer, payloadBuf]);

    LOG.debug({buffer: buf}, 'getSetupFrame: exiting');
    return buf;
};
