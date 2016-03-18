'use strict';

var metadata = require('./metadata');

var CONSTANTS = require('./../constants');
var ERROR_CODES = CONSTANTS.ERROR_CODES;
var ERROR_CODE_START = 12;
var HEADER_FLAGS_START = 6;
var HEADER_LENGTH = 12;
var HEADER_LENGTH_START = 0;
var HEADER_STREAM_ID_START = 8;
var HEADER_TYPE_START = 4;
var LOG = require('./../../defaultLogger');
var META_DATA_LENGTH = 4;
var TYPES = CONSTANTS.TYPES;

module.exports = parse;

/**
 * plucks the header length from the header.  If the header length and the
 * length of the buffer do not match, we through errors.
 * @private
 * @param {Buffer} buf -
 * @returns {Number}
 * @throws {Error} If the header does not match the length we throw and
 * exception
 */
function parseHeaderLength(buf) {
    var bufLength = buf.length;
    var length = buf.readUInt32BE(HEADER_LENGTH_START);

    if (bufLength !== length) {
        throw new Error('Header length does not match buffer length');
    }

    return length;
}

function parseType(buf) {
    return buf.readUInt16BE(HEADER_TYPE_START);
}

function parseFlags(buf) {
    // TODO: interpret flags
    return buf.readUInt16BE(HEADER_FLAGS_START);
}

function parseStreamId(buf) {
    return buf.readUInt32BE(HEADER_STREAM_ID_START);
}

/**
 * @private
 * @param {Buffer} buf The header buffer
 * @returns {Object} header The header object
 */
function parseHeader(buf) {
    var header = {
        length: parseHeaderLength(buf),
        type: parseType(buf),
        flags: parseFlags(buf),
        streamId: parseStreamId(buf)
    };
    LOG.debug({header: header}, 'raw header');
    return header;
}

/**
 * @param {Buffer} buf -
 * @returns {ReactiveFrame}
 */
function parse(buf) {
    LOG.debug({buffer: buf}, 'parse: entering');

    var offset = 0;
    var frame = {
        header: parseHeader(buf)
    };

    switch (frame.header.type) {
        case TYPES.ERROR:
            frame.header.errorCode = parseErrorCode(buf);
            break;
        case TYPES.SETUP:
            frame.setup = parseSetupFrame(buf);
            frame.payload = parseResponse(
                buf, frame.header.flags, frame.setup._offset);
            break;
        case TYPES.RESPONSE:
        case TYPES.REQUEST_RESPONSE:
        case TYPES.NEXT:
        case TYPES.COMPLETE:
        case TYPES.NEXT_COMPLETE:
        case TYPES.REQUEST_CHANNEL:
            frame.payload = parseResponse(buf, frame.header.flags,
                                          offset + HEADER_LENGTH);
            break;
        case TYPES.REQUEST_N:
            break;

        default:
            throw new Error('got unknown type ' + frame.header.type);
    }

    LOG.debug({frame: frame}, 'parse: exiting');
    return frame;
}

function parseErrorCode(buf) {
    var code = buf.readUInt32BE(ERROR_CODE_START);
    LOG.debug({code: code}, 'parsing error code');

    switch (code) {
        case ERROR_CODES.INVALID_SETUP:
        case ERROR_CODES.UNSUPPORTED_SETUP:
        case ERROR_CODES.REJECTED_SETUP:
        case ERROR_CODES.CONNECTION_ERROR:
        case ERROR_CODES.APPLICATION_ERROR:
        case ERROR_CODES.REJECTED:
        case ERROR_CODES.CANCELED:
        case ERROR_CODES.INVALID:
        case ERROR_CODES.RESERVED:
            LOG.debug({errCode: code}, 'parsed error code');
            break;
        default:
            throw new Error('got unknown error code ' + code);
    }

    return code;
}

function parseResponse(buf, flags, offset) {
    var hasMetadata = metadata.hasMetadata(flags);
    var response = parsePayload(buf, offset, hasMetadata);

    return response;
}

function parsePayload(buf, offset, hasMetadata) {
    var payload = {};
    var myOffset = offset;

    if (hasMetadata) {
        var mdLength = buf.readUInt32BE(offset);
        myOffset += mdLength;
        payload.metadata = buf.slice(offset + META_DATA_LENGTH, myOffset);
    }

    payload.data = buf.slice(myOffset);
    LOG.debug({payload: payload}, 'parsed payload');

    return payload;
}

/**
 * Parses out the setup frame as it has extra data, before the metadata and
 * data.
 *
 * @param {Buffer} buffer -
 * @returns {Object}
 */
function parseSetupFrame(buffer) {
    var keepAliveInterval = buffer.readUInt32BE(16);
    var maxLife = buffer.readUInt32BE(20);
    var mimeOffset = 24;

    var metadataMimeLength = buffer.readUInt8(mimeOffset++);
    var metadataMime = buffer.
        slice(mimeOffset, mimeOffset + metadataMimeLength).
        toString();

    mimeOffset += metadataMimeLength;

    var dataMimeLength = buffer.readUInt8(mimeOffset++);
    var dataMime = buffer.
        slice(mimeOffset, mimeOffset + metadataMimeLength).
        toString();

    mimeOffset += dataMimeLength;

    return {
        encoding: {
            metadata: metadataMime,
            data: dataMime
        },

        keepAliveInterval: keepAliveInterval,
        maxLife: maxLife,

        // To continue to be able to parse output.
        _offset: mimeOffset
    };
}
