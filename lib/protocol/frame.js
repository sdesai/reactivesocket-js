'use strict';

var bunyan = require('bunyan');

var WebSocket = require('ws');


function Frame() {
    this._buffer = null;
}

var LOG = bunyan.createLogger({
    name: 'reactive-socket',
    level: 'debug',
    src: true
});

var FRAME_LENGTH = 0xFFFFFFFD; // frame length is restricted to 31 bits.

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
    IGNORE: 0x80, // 0b10000000
    METADATA: 0X40, // 0b01000000
    LEASE: 0x20, // 0b00100000
    STRICT: undefined,
    FOLLOWS: 0x20, // 0b00100000
    COMPLETE: 0x10 // 0b00010000
};


module.exports = {
    Frame: Frame,
    ERROR_CODES: ERROR_CODES,
    FLAGS: FLAGS,
    TYPES: TYPES,
    FRAME_LENGTH: FRAME_LENGTH
};

//function SetupFrame(buffer, cb) {
    //var frame = {
        //header: {

        //},
        //payload: {
            //metadata: null,
            //data: null
        //}
    //};

    //// Frame Header
    //frame.header.type = TYPES.SETUP;

    //var flags = null; //depends on input from buffer
    //var streamId = 0;
    //var version = null; // 4 bytes from buffer
    //var keepaliveInterval = null; // 4 bytes
    //var maxLifetime = null; // 4 bytes
    //var metaMIMELength = null; // 1 byte
    //var metaMIMEType = null; // Max 256
    //var dataMIMELength = null; // 1 byte
    //var dataMIMEType = null; // Max 256

    //// Data
    //// Metadata -- Optional
    //var metaLength = null; // 4 bytes -- based on flags
    //var metaPayload = null; //
    //var payload = null;
//}

/**
 * @param {Number} keepaliveInterval The keep alive interval in ms.
 * @param {Number} maxLifetime The max life time in ms.
 *
 * @returns {Buffer} The frame.
 */
function getSetupFrame(keepaliveInterval, maxLifetime) {
    // Setup Frame Header
    var buf = new Buffer(24);
    var offset = 0;
    // length
    buf.writeUInt32BE(20, offset);
    offset+=4;
    // type
    buf.writeUInt16BE(1, offset);
    offset+=2;
    // flags
    buf.writeUInt16BE(0, offset);
    offset+=2;
    // stream ID Always 0 for setup frame
    buf.writeUInt32BE(0, offset);
    offset+=4;
    // Version
    buf.writeUInt32BE(0, offset);
    offset+=4;
    // Keep Alive Interval
    buf.writeUInt32BE(keepaliveInterval, offset);
    offset+=4;
    // Max life time
    buf.writeUInt32BE(maxLifetime, offset);
    LOG.debug({setupFrame: buf}, 'returning setup Frame');
    return buf;
}

/**
 * @param {Number} id Stream ID, must be even for clients, and odd for server.
 *
 * @returns {Buffer} The frame.
 */
function getReqResFrame(streamId) {
    var buf = new Buffer(12);
    var offset = 0;
    // length
    buf.writeUInt32BE(12, offset);
    offset+=4;
    // type
    buf.writeUInt16BE(4, offset);
    offset+=2;
    // flags
    buf.writeUInt16BE(0, offset);
    offset+=2;
    // stream ID
    buf.writeUInt32BE(streamId, offset);
    offset+=4;

    LOG.debug({reqResFrame: buf}, 'returning reqRes Frame');
    return buf;
}

function getErrorFrame(eType, streamId, eCode) {
    var buf = new Buffer(16);
    var offset = 0;

    // length
    buf.writeUInt32BE(16, offset);
    offset+=4;
    // type
    buf.writeUInt16BE(eType, offset);
    offset+=2;
    // flags
    buf.writeUInt16BE(0, offset);
    offset+=2;
    // stream ID
    buf.writeUInt32BE(streamId, offset);
    offset+=4;
    // error code
    buf.writeUInt32BE(eCode, offset);
    offset+=4;

    console.log(buf);
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
            console.log('XXX', offset);
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
    console.log('XXX PR', offset);
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

function reqResFrame(buf) {

}

var ws = new WebSocket('ws://10.16.183.109:8888');

var setupFrame = getSetupFrame(12345678, 87654321);
var reqResFrame = getReqResFrame(2);

ws.on('open', function open() {
    LOG.info('opened ws');
    ws.send(setupFrame, {binary: true}, function (err) {
        LOG.info({err: err}, 'sent setup');
        ws.send(reqResFrame, {binary: true}, function (e2) {
            LOG.info({err: e2}, 'sent reqRes');
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
    console.log('metadata', frame.payload.metadata.toString());
});
