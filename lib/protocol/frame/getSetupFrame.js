'use strict';

var assert = require('assert-plus');

var encodePayload = require('./encodePayload');
var getFrameHeader = require('./getFrameHeader');
var metadata = require('./metadata');

var CONSTANTS = require('./../constants');
var FLAGS = CONSTANTS.FLAGS;
var LOG = require('./../../defaultLogger');
var TYPES = CONSTANTS.TYPES;
// encoding for meta and data. see: https://tools.ietf.org/html/rfc2045#page-14
var MIME_ENCODING = 'ASCII';
var VERSION = CONSTANTS.VERSION;

/**
 * @param {Object} frame -
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
    assert.number(frame.keepalive, 'frame.keepalive');
    assert.number(frame.maxLifetime, 'frame.maxLifetime');
    assert.string(frame.metadataEncoding, 'frame.metadataEncoding');
    assert.string(frame.dataEncoding, 'frame.dataEncoding');
    assert.optionalString(frame.metadata, 'frame.metadata');
    assert.optionalString(frame.data, 'frame.data');

    LOG.debug({frame: frame}, 'getSetupFrame: entering');
    // Setup buffer
    var setupBuf = new Buffer(12).fill(0);
    var offset = 0;
    setupBuf.writeUInt32BE(VERSION, offset);
    offset += 4;
    setupBuf.writeUInt32BE(frame.keepalive, offset);
    offset += 4;
    setupBuf.writeUInt32BE(frame.maxLifetime, offset);

    var metaLength = frame.metadataEncoding.length;
    var dataLength = frame.dataEncoding.length;

    // Encoding payload information
    // 2 bytes for the payload encoding length + the payload lengths
    var payloadEncodingBuffer = new Buffer(1 + metaLength +
                                           1 + dataLength).fill(0);
    var encodingOffset = 1;

    // Metadata and encoding type
    payloadEncodingBuffer.writeUInt8(metaLength, 0);
    payloadEncodingBuffer.write(frame.metadataEncoding, encodingOffset,
                                MIME_ENCODING);
    encodingOffset += metaLength;

    // data and encoding type
    payloadEncodingBuffer.writeUInt8(dataLength, encodingOffset);
    payloadEncodingBuffer.write(frame.dataEncoding, encodingOffset + 1,
                                MIME_ENCODING);

    // Payload encoding
    var encodedPayload;

    if (frame.data || frame.metadata) {
        encodedPayload = encodePayload({
            metadata: frame.metadata,
            data: frame.data
        });
    } else {
        encodedPayload = new Buffer(0);
    }

    // Setup Frame Header, stream ID is always 0 for the setup frame
    // TODO: we're note setting flags right now
    var frameHeaderBuf = getFrameHeader({
        length: payloadEncodingBuffer.length + setupBuf.length +
            encodedPayload.length,
        type: TYPES.SETUP,
        flags: FLAGS.NONE,
        streamId: 0
    });

    // If there is metadata, then we need to encode the flag
    if (frame.metadata) {
        metadata.flagMetadata(frameHeaderBuf);
    }

    var buf = Buffer.concat([
        frameHeaderBuf, setupBuf, payloadEncodingBuffer, encodedPayload]);

    LOG.debug({buffer: buf}, 'returning setup Frame');
    return buf;
};
