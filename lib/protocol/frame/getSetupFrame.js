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
 * @param {Object} opts -
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
module.exports = function getSetupFrame(opts) {
    assert.object(opts, 'opts');
    assert.number(opts.keepaliveInterval, 'keepaliveInterval');
    assert.number(opts.maxLifetime, 'maxLifetime');
    assert.object(opts.payloadEncoding, 'payloadEncoding');
    assert.string(opts.payloadEncoding.metadata, 'payloadEncoding.metadata');
    assert.string(opts.payloadEncoding.data, 'payloadEncoding.data');
    assert.optionalObject(opts.payload, 'payload');

    if (opts.payload) {
        assert.optionalString(opts.payload.metadata, 'payload.metadata');
        assert.optionalString(opts.payload.data, 'payload.data');
    }

    LOG.debug({frame: opts}, 'getSetupFrame: entering');
    // Setup buffer
    var setupBuf = new Buffer(12).fill(0);
    var offset = 0;
    setupBuf.writeUInt32BE(VERSION, offset);
    offset += 4;
    setupBuf.writeUInt32BE(opts.keepaliveInterval, offset);
    offset += 4;
    setupBuf.writeUInt32BE(opts.maxLifetime, offset);

    var metaLength = opts.payloadEncoding.metadata.length;
    var dataLength = opts.payloadEncoding.data.length;

    // Encoding payload information
    // 2 bytes for the payload encoding length + the payload lengths
    var payloadEncodingBuffer = new Buffer(1 + metaLength +
                                           1 + dataLength).fill(0);
    var encodingOffset = 1;

    // Metadata and encoding type
    payloadEncodingBuffer.writeUInt8(metaLength, 0);
    payloadEncodingBuffer.write(opts.payloadEncoding.metadata, encodingOffset);
    encodingOffset += metaLength;

    // data and encoding type
    payloadEncodingBuffer.writeUInt8(dataLength, encodingOffset);
    payloadEncodingBuffer.write(opts.payloadEncoding.data, encodingOffset + 1);

    // Payload encoding
    var encodedPayload;

    if (opts.payload) {
        encodedPayload = encodePayload(opts.payload);
    } else {
        encodedPayload = new Buffer(0);
    }

    // Setup Frame Header, stream ID is always 0 for the setup frame
    var frameHeaderBuf = getFrameHeader(payloadEncodingBuffer.length +
                                        setupBuf.length + encodedPayload.length,
                                        TYPES.SETUP, FLAGS.NONE, 0);

    // If there is metadata, then we need to encode the flag
    if (opts.payload && opts.payload.metadata) {
        metadata.flagMetadata(frameHeaderBuf);
    }

    var buf = Buffer.concat([
        frameHeaderBuf, setupBuf, payloadEncodingBuffer, encodedPayload]);

    LOG.debug({setupFrame: buf}, 'returning setup Frame');
    return buf;
};
