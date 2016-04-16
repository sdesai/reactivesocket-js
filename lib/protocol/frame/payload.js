'use strict';

var assert = require('assert-plus');

var LOG = require('./../../defaultLogger');
var METADATA_LENGTH = require('./../constants').METADATA_LENGTH;

module.exports = {
    encodePayload: encodePayload,
    decodePayload: decodePayload
};


/**
 * Encodes a payload into a buffer
 * @param {object} payload The payload.
 * @param {string} [payload.metadata=null] The metadata.
 * @param {string} [payload.data=null] The data.
 * @param {string} metadataEncoding -
 * @param {string} dataEncoding -
 *
 * @returns {Buffer} The encoded payload frame.
 */
function encodePayload(payload, metadataEncoding, dataEncoding) {
    assert.object(payload, 'payload');
    assert.optionalString(payload.metadata, 'payload.metadata');
    assert.optionalString(payload.data, 'payload.data');
    assert.string(dataEncoding, 'dataEncoding');
    assert.string(metadataEncoding, 'metadataEncoding');

    LOG.debug({payload: payload}, 'encodePayload: entering');

    var mdBuf;

    if (payload.metadata) {
        mdBuf = new Buffer(payload.metadata, metadataEncoding);
    } else {
        mdBuf = new Buffer(0);
    }

    var dataBuf;

    if (payload.data) {
        dataBuf = new Buffer(payload.data, dataEncoding);
    } else {
        dataBuf = new Buffer(0);
    }

    // The length is the metadata length + metadata length field length (4) and
    // the length of the payload data.
    var length = mdBuf.length + dataBuf.length;

    // The length of the buffer has to be altered if we need to include the
    // metadata length field or not.
    if (mdBuf.length > 0) {
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
        buf.writeUInt32BE(mdBuf.length + METADATA_LENGTH, offset);
        offset += METADATA_LENGTH;

        mdBuf.copy(buf, offset);
        offset += mdBuf.length;
    }

    // Finally, writes the data payload at the offset.
    if (payload.data) {
        dataBuf.copy(buf, offset);
    }

    LOG.debug({buffer: buf, length: buf.length}, 'encodePayload: exiting');
    return buf;
}

function decodePayload(frame, metadataEncoding, dataEncoding) {
    var payload = {};

    if (frame.data) {
        payload.data = frame.data.toString(dataEncoding);
    }

    if (frame.metadata) {
        payload.metadata = frame.metadata.toString(metadataEncoding);
    }

    return payload;
}
