'use strict';

var assert = require('assert-plus');

var encodePayload = require('./encodePayload');
var getFrameHeader = require('./getFrameHeader');
var metadata = require('./metadata');

var CONSTANTS = require('./../constants');
var FLAGS = CONSTANTS.FLAGS;
var LOG = require('./../../defaultLogger');
var TYPES = CONSTANTS.TYPES;
var VERSION = CONSTANTS.VERSION;

/**
 * @param {Number} keepaliveInterval The keep alive interval in ms.
 * @param {Number} maxLifetime The max life time in ms.
 * @param {Object} payloadEncoding The encoding of the payload metadata and
 * data
 * @param {String} payloadEncoding.metadata -
 * @param {String} payloadEncoding.data -
 *
 * @param {Object} [payload] - Any additional data to send with the setup frame
 * @param {String} payload.metadata -
 * @param {String} payload.data -
 * @returns {Buffer} The frame.
 */
module.exports = function getSetupFrame(keepaliveInterval, maxLifetime,
                                        payloadEncoding, payload) {
    assert.number(keepaliveInterval, 'keepaliveInterval');
    assert.number(maxLifetime, 'maxLifetime');
    assert.object(payloadEncoding, 'payloadEncoding');
    assert.string(payloadEncoding.metadata, 'payloadEncoding.metadata');
    assert.string(payloadEncoding.data, 'payloadEncoding.data');
    assert.optionalObject(payload, 'payload');

    if (payload) {
        assert.optionalString(payload.metadata, 'payload.metadata');
        assert.optionalString(payload.data, 'payload.data');
    }

    LOG.debug({
        keepaliveInterval: keepaliveInterval,
        maxLifetime: maxLifetime,
        payloadEncoding: payloadEncoding,
        payload: payload
    }, 'getSetupFrame: entering');
    // Setup buffer
    var setupBuf = new Buffer(12).fill(0);
    var offset = 0;
    setupBuf.writeUInt32BE(VERSION, offset);
    offset += 4;
    setupBuf.writeUInt32BE(keepaliveInterval, offset);
    offset += 4;
    setupBuf.writeUInt32BE(maxLifetime, offset);

    var metaLength = payloadEncoding.metadata.length;
    var dataLength = payloadEncoding.data.length;

    // Encoding payload information
    // 2 bytes for the payload encoding length + the payload lengths
    var payloadEncodingBuffer = new Buffer(1 + metaLength +
                                           1 + dataLength).fill(0);
    var encodingOffset = 1;

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

    // If there is metadata, then we need to encode the flag
    if (payload && payload.metadata) {
        metadata.flagMetadata(frameHeaderBuf);
    }

    var buf = Buffer.concat([
        frameHeaderBuf, setupBuf, payloadEncodingBuffer, encodedPayload]);

    LOG.debug({setupFrame: buf}, 'returning setup Frame');
    return buf;
};
