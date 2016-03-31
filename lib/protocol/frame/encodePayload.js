'use strict';

var assert = require('assert-plus');

var LOG = require('./../../defaultLogger');
var METADATA_LENGTH = require('./../constants').METADATA_LENGTH;

/**
 * Encodes a payload into a buffer
 * @param {object} payload The payload.
 * @param {string} [payload.metadata=null] The metadata.
 * @param {string} [payload.data=null] The data.
 *
 * @returns {Buffer} The encoded payload frame.
 */
module.exports = function encodePayload(payload) {
    assert.object(payload, 'payload');
    assert.optionalString(payload.metadata, 'payload.metadata');
    assert.optionalString(payload.data, 'payload.data');

    LOG.debug({payload: payload}, 'encodePayload: entering');
    var mdLength = (payload.metadata && payload.metadata.length || 0);
    var dataLength  = (payload.data && payload.data.length || 0);

    // The length is the metadata length + metadata length field length (4) and
    // the length of the payload data.
    var length = mdLength + dataLength;

    // The length of the buffer has to be altered if we need to include the
    // metadata length field or not.
    if (mdLength > 0) {
        length += METADATA_LENGTH;
    }

    var buf = new Buffer(length).fill(0);

    if (length === 0) {
        LOG.debug({buffer: buf, length: buf.length}, 'encodePayload: exiting');
        return buf;
    }
    var offset = 0;

    // writes the metadata payload and incs the offset with the
    // length of the metadata
    if (payload.metadata) {

        // Writes the length of the metadata no matter what.
        buf.writeUInt32BE(mdLength, offset);
        offset += METADATA_LENGTH;

        bufferWrite(buf, payload.metadata, offset);
        offset += mdLength;
    }

    // Finally, writes the data payload at the offset.
    if (payload.data) {
        bufferWrite(buf, payload.data, offset);
    }

    LOG.debug({buffer: buf, length: buf.length}, 'encodePayload: exiting');
    return buf;
};

function bufferWrite(targetBuffer, sourceBuffer, targetOffset) {
    var type = typeof sourceBuffer;

    if (type === 'string') {
        targetBuffer.write(sourceBuffer, targetOffset);
        return;
    }

    sourceBuffer.copy(targetBuffer, targetOffset, 0);
}
