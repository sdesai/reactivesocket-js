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
// encoding for meta and data. see: https://tools.ietf.org/html/rfc2045#page-14
var MIME_ENCODING = 'ASCII';
var LOG = require('./../../defaultLogger');
var META_DATA_LENGTH = 4;
var TYPES = CONSTANTS.TYPES;


/**
 * @param {Buffer} buf -
 * @param {String} [encoding=null] - The encoding of the frame. Since the
 * encoding is specified in the setup frame, we must pass it in after the setup
 * frame has been parsed.
 * @returns {ReactiveFrame}
 */
function parse(buf, encoding) {
    LOG.debug({buffer: buf}, 'parse: entering');

    var offset = 0;
    var frame = {
        header: parseHeader(buf)
    };
    // check for empty payload. A frame that is just the header has a length of
    // 12. Hence we just return the header frame. However, since the length is
    // optional, then we check if the buffer is also 8 -- since that denotes a
    // frame that is only a header without length
    if ((frame.header.length && frame.header.length === 12) ||
        buf.length === 8) {
        LOG.debug({frame: frame}, 'parse: exiting');
        return frame;
    }

    switch (frame.header.type) {
        case TYPES.ERROR:
            frame.header.errorCode = parseErrorCode(buf);
            break;
        case TYPES.SETUP:
            frame.setup = parseSetupFrame(buf);
            var payload = parseResponse(
                buf, frame.header.flags, frame.setup._offset);
            frame.metadata = payload.metadata;
            frame.data = payload.data;
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

    if (frame && frame.setup && frame.setup._offset) {
        delete frame.setup._offset;
    }
    LOG.debug({frame: frame}, 'parse: exiting');
    return frame;
}

module.exports = parse;

// private functions

/**
 * TODO: how do we know if the length is optional?
 * plucks the header length from the header.
 * @private
 * @param {Buffer} buf -
 * @returns {Number}
 * @throws {Error} If the header does not match the length we throw an
 * error.
 */
function parseHeaderLength(buf) {
    var bufLength = buf.length;
    var length = buf.readUInt32BE(HEADER_LENGTH_START);

    if (bufLength !== length) {
        throw new Error('Header length ' + length +
                        ' does not match buffer length ' + bufLength);
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
            // TODO: do we really want to throw an error here? probably we just ignore
            // an error code that we don't know.
            //throw new Error('got unknown error code ' + code);
            break;
    }

    return code;
}

/**
 * @returns {Object} The parsed response object
 */

function parseResponse(buf, flags, offset, encoding) {
    var hasMetadata = metadata.hasMetadata(flags);
    var response = parsePayload(buf, offset, hasMetadata, encoding);

    return response;
}

/**
 * @returns {Object} The parsed payload as an object of strings.
 */

function parsePayload(buf, offset, hasMetadata, encoding) {
    var payload = {};
    var myOffset = offset;

    if (hasMetadata) {
        var mdLength = buf.readUInt32BE(offset);
        myOffset += mdLength + META_DATA_LENGTH;
        payload.metadata = buf.slice(offset + META_DATA_LENGTH,
                                     myOffset).toString(encoding);
    }

    payload.data = buf.slice(myOffset).toString(encoding);
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
    var keepalive = buffer.readUInt32BE(16);
    var maxLifetime = buffer.readUInt32BE(20);
    var encodingOffset = 24;

    var metadataEncodingLength = buffer.readUInt8(encodingOffset++);
    //TODO: what is the encoding of these buffers? We currently assume UTF-8
    //for all metadata
    var metadataEncoding = buffer.slice(encodingOffset, encodingOffset +
                                        metadataEncodingLength)
                                        .toString(MIME_ENCODING);

    encodingOffset += metadataEncodingLength;

    var dataEncodingLength = buffer.readUInt8(encodingOffset++);
    var dataEncoding = buffer.slice(encodingOffset,
                                    encodingOffset + dataEncodingLength)
                                    .toString(MIME_ENCODING);

    encodingOffset += dataEncodingLength;

    return {
        metadataEncoding: metadataEncoding,
        dataEncoding: dataEncoding,
        keepalive: keepalive,
        maxLifetime: maxLifetime,

        // To continue to be able to parse output.
        // this is internal and deleted on the way out of parse
        _offset: encodingOffset
    };
}
