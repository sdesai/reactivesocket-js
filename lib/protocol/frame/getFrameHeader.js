var CONSTANTS = require('./../constants');
var LOG = require('./getDefaultLogger');

var FRAME_HEADER_LENGTH = CONSTANTS.FRAME_HEADER_LENGTH;
var TYPES = CONSTANTS.TYPES;

/**
 * Constructs the frame header.  The specification for the frame
 * header can be found here:
 * https://github.com/ReactiveSocket/reactivesocket/blob/master/Protocol.md#frame-header-format
 */
module.exports = function getFrameHeader(payloadLength, type, flags, streamId) {
    LOG.debug({
        payloadLength: payloadLength,
        type: type,
        flags: flags,
        streamId: streamId
    }, 'getFrameHeader: entering');

    var frameLength = FRAME_HEADER_LENGTH;

    switch (type) {
        case TYPES.REQUEST_STREAM:
        case TYPES.REQUEST_SUB:
        case TYPES.REQUEST_N:
        case TYPES.ERROR:
            frameLength += 4;
            break;
        case TYPES.REQUEST_CHANNEL:
        case TYPES.REQUEST_FNF:
            break;
        default:
            break;
    }

    frameLength += payloadLength;
    LOG.debug({frameLength: frameLength}, 'getFrameHeader');

    var buf = new Buffer(12);
    var offset = 0;
    buf.writeUInt32BE(frameLength, offset);
    offset += 4;
    buf.writeUInt16BE(type, offset);
    offset += 2;
    buf.writeUInt16BE(flags, offset);
    offset += 2;
    buf.writeUInt32BE(streamId, offset);

    LOG.debug({header: buf}, 'getFrameHeader: exiting');
    return buf;
}
