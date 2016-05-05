'use strict';

var assert = require('assert-plus');

var LOG = require('./../../logger');
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

    var length = 0;

    var mdBuf;

    if (payload.metadata) {
        mdBuf = new Buffer(payload.metadata, metadataEncoding);
        // #33 the length of the metadata includes the md length field
        length += METADATA_LENGTH;
        length += mdBuf.length;
    } else {
        mdBuf = new Buffer(0);
    }

    var dataBuf;

    if (payload.data) {
        dataBuf = new Buffer(payload.data, dataEncoding);
        length += dataBuf.length;
    } else {
        dataBuf = new Buffer(0);
    }


    var buf = new Buffer(length).fill(0);

    if (length === 0) {
        LOG.debug({buffer: buf, length: buf.length}, 'encodePayload: exiting');
        return buf;
    }

    var offset = 0;

    if (payload.metadata) {
        // #33 length must include the length of the length field(4) and data.
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

/**
 * Decodes the payload of a frame.
 * @param {object} frame The frame
 * @param {string} metadataEncoding The metadataencoding
 * @param {string} dataEncoding The data encoding
 *
 * @returns {object} The decoded metadata and data object
 */
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
