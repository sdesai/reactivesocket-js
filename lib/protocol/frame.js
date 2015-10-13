'use strict';

var bunyan = require('bunyan');
var WebSocket = require('ws');

var LOG = bunyan.createLogger({
    name: 'reactive-socket',
    level: 'debug',
    src: true
});

var FRAME_LENGTH = 0xFFFFFFFD; // frame length is restricted to 31 bits.

var FRAME_HEADER_LENGTH = 12;

var TYPES = {
    RESERVED: 0x0000,
    SETUP: 0x0001,
    LEASE: 0x0002,
    KEEPALIVE: 0x0003,
    REQUEST_RESPONSE: 0x0004,
    REQUEST_FNF: 0x005,
    REQUEST_STREAM: 0x0006,
    REQUEST_SUB: 0x0007,
    REQUEST_CHANNEL: 0x0008,
    REQUEST_N: 0x0009,
    CANCEL: 0x000A,
    RESPONSE: 0x000B,
    ERROR: 0x000C,
    METADATA_PUSH: 0x000D,
    NEXT: 0x000E,
    COMPLETE: 0x000F,
    NEXT_COMPLETE: 0x0010,
    EXT: 0xFFFF
};

var ERROR_CODES = {
    //RESERVED: 0x00000000,
    INVALID_SETUP: 0x0000001,
    UNSUPPORTED_SETUP: 0x00000002,
    REJECTED_SETUP: 0x00000003,
    CONNECTION_ERROR: 0x00000011,
    APPLICATION_ERROR: 0x00000021,
    REJECTED: 0x00000022,
    CANCELED: 0x00000023,
    INVALID: 0x0000024,
    RESERVED: 0xFFFFFFFF
};

var FLAGS = {
    NONE: 0x0000,
    IGNORE: 0x8000, // 0b10000000
    METADATA: 0x4000, // 0b01000000
    LEASE: 0x2000, // 0b00100000
    STRICT: undefined,
    FOLLOWS: 0x2000, // 0b00100000
    COMPLETE: 0x1000 // 0b00010000
};


module.exports = {
    ERROR_CODES: ERROR_CODES,
    FLAGS: FLAGS,
    TYPES: TYPES,
    FRAME_LENGTH: FRAME_LENGTH,
    encodePayload: encodePayload,
    getErrorFrame: getErrorFrame,
    getFrameHeader: getFrameHeader,
    getReqResFrame: getReqResFrame,
    getSetupFrame: getSetupFrame,
    getSubscriptionFrame: getSubscriptionFrame
};

/**
 * @param {Number} keepaliveInterval The keep alive interval in ms.
 * @param {Number} maxLifetime The max life time in ms.
 *
 * @returns {Buffer} The frame.
 */
function getSetupFrame(keepaliveInterval, maxLifetime) {
    // Setup Frame Header, stream ID is always 0 for the setup frame
    var setupBuf = new Buffer(12);
    var frameHeaderBuf = getFrameHeader(setupBuf.length, TYPES.SETUP,
                                        FLAGS.NONE, 0);
    var offset = 0;
    // Version
    setupBuf.writeUInt32BE(0, offset);
    offset+=4;
    // Keep Alive Interval
    setupBuf.writeUInt32BE(keepaliveInterval, offset);
    offset+=4;
    // Max life time
    setupBuf.writeUInt32BE(maxLifetime, offset);

    var buf = Buffer.concat([frameHeaderBuf, setupBuf]);
    LOG.debug({setupFrame: buf}, 'returning setup Frame');
    return buf;
}

/**
 * @param {Number} streamId Stream ID, must be even for clients, and odd for
 * server.
 * @param {Object} payload The payload of the frame.
 *
 * @returns {Buffer} The encoded frame.
 */
function getReqResFrame(streamId, payload) {
    var payloadBuf = encodePayload(payload);

    var flags = FLAGS.NONE;
    if (payload.metadata) {
        flags |= FLAGS.METADATA;
    }

    var headerBuf = getFrameHeader(payloadBuf.length, TYPES.REQUEST_RESPONSE,
                                   flags, streamId);

    var buf = Buffer.concat([headerBuf, payloadBuf]);

    LOG.debug({reqResFrame: headerBuf}, 'returning reqRes Frame');
    return buf;
}

/**
 * Encodes a payload into a buffer
 * @param {Object} payload The payload.
 * @param {String} payload.metadata The metadata.
 * @param {String} payload.data The data.
 *
 * @returns {Buffer} The encoded payload frame.
 */
function encodePayload(payload) {
    var mdLength = payload.metadata.length + 4;
    var length = mdLength + payload.data.length;
    var offset = 0;
    var buf = new Buffer(length);

    buf.writeUInt32BE(mdLength, offset);
    offset += 4;
    buf.write(payload.metadata, offset);
    offset += payload.metadata.length;
    buf.write(payload.data, offset);

    return buf;
}

//TODO: Test this
function getErrorFrame(streamId, eCode, payload) {
    var payloadBuf = encodePayload(payload);
    var frameHeaderBuf = getFrameHeader(payloadBuf.length,
                                        TYPES.ERROR, FLAGS.NONE, streamId);
    var errorHeaderBuf = new Buffer(4);
    errorHeaderBuf.writeUInt32BE(eCode, 0);

    var buf = Buffer.concat([frameHeaderBuf, errorHeaderBuf, payloadBuf]);
    return buf;
}

function getSubscriptionFrame(initReqNum, payload, streamId) {
    var payloadBuf = encodePayload(payload);

    var flags = FLAGS.NONE;
    if (payload.metadata) {
        flags |= FLAGS.METADATA;
    }

    var frameHeaderBuf = getFrameHeader(payloadBuf.length, TYPES.REQUEST_SUB,
                                        flags, streamId);
    var initReqNumBuf = new Buffer(4);
    initReqNumBuf.writeUInt32BE(initReqNum, 0);

    var buf = Buffer.concat([frameHeaderBuf, initReqNumBuf, payloadBuf]);

    LOG.debug({frame: buf}, 'getSubscriptionFrame: exiting');
    return buf;
}

function getFrameHeader(payloadLength, type, flags, streamId) {
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
        case TYPES.REQUEST_CHANNEL:
        case TYPES.REQUEST_N:
        case TYPES.ERROR:
            frameLength += 4
            break;
        default:
            break;
    }

    frameLength += payloadLength;
    LOG.debug({frameLength: frameLength}, 'getFrameHeader');

    var buf = new Buffer(12);
    var offset = 0;
    buf.writeUInt32BE(frameLength, offset);
    offset+=4;
    buf.writeUInt16BE(type, offset);
    offset+=2;
    buf.writeUInt16BE(flags, offset);
    offset+=2;
    buf.writeUInt32BE(streamId, offset);

    LOG.debug({header: buf}, 'getFrameHeader: exiting');
    return buf;
}

function parseHeaderLength(buf, offset) {
    var bufLength = buf.length;
    var length = buf.readUInt32BE(0 || offset);

    if (bufLength !== length) {
        throw new Error('Header length does not match buffer length');
    }

    return length;
}

function parseType(buf) {
    return buf.readUInt16BE(4);
}

function parseFlags(buf) {
    // TODO: interpret flags
    return buf.readUInt16BE(6);
}

function parseStreamId(buf) {
    return buf.readUInt32BE(8);
}

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

function parse(buf, offset) {
    var frame = {
        header: parseHeader(buf),
        payload: {}
    };
    switch (frame.header.type) {
        case TYPES.ERROR:
            frame.header.errorCode = parseErrorCode(buf)
            break;
        case TYPES.RESPONSE:
        case TYPES.NEXT:
        case TYPES.COMPLETE:
        case TYPES.NEXT_COMPLETE:
            frame.payload = parseResponse(buf, frame.header.flags, offset + 12);
            break;

        default:
            throw new Error('got unknown type ' + frame.header.type);
    }

    LOG.debug({frame: frame}, 'parsed frame');
    return frame;
}

function parseErrorCode(buf) {
    var code = buf.readUInt32BE(12);
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
            LOG.info({errCode: code}, 'parsed error code');
            break;
        default:
            throw new Error('got unknown error code ' + code);
    }

    return code;
}

function parseResponse(buf, flags, offset) {
    var hasMetadata = responseHasMetadata(flags);
    var response = parsePayload(buf, offset, hasMetadata);

    return response;
}

//TODO: make arg ordering constistent or use object
function parsePayload(buf, offset, hasMetadata) {
    var payload = {};
    // TODO: rename to more succinct name
    var myOffset = offset;
    if (hasMetadata) {
        var mdLength = buf.readUInt32BE(offset);
        myOffset = myOffset +  mdLength;
        payload.metadata = buf.slice(offset + 4, myOffset);
    }
    payload.data = buf.slice(myOffset);
    LOG.info({payload: payload}, 'parsed payload');
    return payload;
}

function responseHasMetadata(flags) {
    return ((flags & 0x4000) === 0x4000); // 0b01000000 Metadata
}


/// Mainline
var ws = new WebSocket('ws://10.16.183.109:8888');

var setupFrame = getSetupFrame(12345678, 87654321);
var reqResFrame = getReqResFrame(2, {
    metadata: 'foobar',
    data: 'Hello Steve!'
});

var subFrame = getSubscriptionFrame(10, {
    metadata: 'subscribe!',
    data: 'hello steve!'
}, 2);

console.log('XXX', subFrame.toString());
console.log('XXX', subFrame);

ws.on('open', function open() {
    LOG.info('opened ws');
    ws.send(setupFrame, {binary: true}, function (err) {
        LOG.info({err: err}, 'sent setup');
        //ws.send(reqResFrame, {binary: true}, function (e2) {
        ws.send(subFrame, {binary: true}, function (e2) {
            LOG.info({err: e2}, 'sent');
        });
    });
});

ws.on('close', function () {
    console.log('closed');
});

ws.on('message', function (msg) {
    console.log('raw msg', msg);
    var frame = parse(msg, 0);
    console.log(frame);
    console.log('data', frame.payload.data.toString());
    console.log('metadata', frame.payload.metadata);
});
