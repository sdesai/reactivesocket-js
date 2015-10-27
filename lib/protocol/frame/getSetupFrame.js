var CONSTANTS = require('./../constants');
var getFrameHeader = require('./getFrameHeader');
var LOG = require('./getDefaultLogger');

var ERROR_CODES = CONSTANTS.ERROR_CODES;
var FLAGS = CONSTANTS.FLAGS;
var TYPES = CONSTANTS.TYPES;
var VERSION = CONSTANTS.VERSION;
var FRAME_LENGTH = CONSTANTS.FRAME_LENGTH;
var FRAME_HEADER_LENGTH = CONSTANTS.FRAME_HEADER_LENGTH;

/**
 * @param {Number} keepaliveInterval The keep alive interval in ms.
 * @param {Number} maxLifetime The max life time in ms.
 * @param {Object} payloadEncoding The encoding of the payload metadata and data
 * @param {String} payloadEncoding.metadata -
 * @param {String} payloadEncoding.data -
 *
 * @returns {Buffer} The frame.
 */
module.exports = function getSetupFrame(keepaliveInterval, maxLifetime, payloadEncoding,
                       payload) {
    // Setup buffer
    var setupBuf = new Buffer(12);
    var offset = 0;
    setupBuf.writeUInt32BE(VERSION, offset);
    offset += 4;
    setupBuf.writeUInt32BE(keepaliveInterval, offset);
    offset += 4;
    setupBuf.writeUInt32BE(maxLifetime, offset);

    // Encoding payload information
    // 2 bytes for the payload encoding length + the payload lengths
    var payloadEncodingBuffer = new Buffer(1 + payloadEncoding.metadata.length +
                                           1 + payloadEncoding.data.length);
    var encodingOffset = 1;
    var metaLength = payloadEncoding.metadata.length;
    var dataLength = payloadEncoding.data.length;

    // Metadata and encoding type
    payloadEncodingBuffer.writeUInt8(metaLength, 0);
    payloadEncodingBuffer.write(payloadEncoding.metadata, encodingOffset);
    encodingOffset += metaLength;

    // data and encoding type
    payloadEncodingBuffer.writeUInt8(dataLength, encodingOffset);
    payloadEncodingBuffer.write(payloadEncoding.data, encodingOffset + 1);

    // Payload encoding
    var encodedPayload;
    if (payload) {
        encodedPayload = encodePayload(payload);
    } else {
        encodedPayload = new Buffer(0);
    }

    // Setup Frame Header, stream ID is always 0 for the setup frame
    var frameHeaderBuf = getFrameHeader(payloadEncodingBuffer.length +
                                        setupBuf.length + encodedPayload.length,
                                        TYPES.SETUP, FLAGS.NONE, 0);

    var buf = Buffer.concat([frameHeaderBuf, setupBuf, payloadEncodingBuffer]);
    LOG.debug({setupFrame: buf}, 'returning setup Frame');
    return buf;
}
