'use strict';

var WebSocket = require('ws');


function Frame() {
    this._buffer = null;
}


var FRAME_LENGTH = 0xFFFFFFFD; // frame length is restricted to 31 bits.

var TYPES = {
    RESERVED: 0x0000,
    SETUP: 0x0001,
    SETUP_ERROR: 0x0002,
    LEASE: 0x0003,
    KEEPALIVE: 0x0004,
    REQUEST_RESPONSE: 0x0011,
    REQUEST_FNF: 0x0012,
    REQUEST_STREAM: 0x0013,
    REQUEST_SUB: 0x0014,
    REQUEST_N: 0x0015,
    CANCEL: 0x0016,
    RESPONSE: 0x0020,
    ERROR: 0x0021,
    METADATA_PUSH: 0x0031,
    EXT: 0xFFFF
};

var ERROR_CODES = {
    INVALID_SETUP: 0x001,
    UNSUPPORTED_SETUP: 0x0010,
    REJECTED_SETUP: 0x0100
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
    console.log(buf);
    return buf;
}

/**
 * @param {Number} id Stream ID, must be even for clients, and odd for server.
 *
 * @returns {Buffer} The frame.
 */
function getReqResFrame(id) {
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
    buf.writeUInt32BE(id, offset);
    offset+=4;

    console.log(buf);
    return buf;
}


var ws = new WebSocket('ws://10.16.183.109:8888');

var setupFrame = getSetupFrame(12345678, 87654321);
var reqResFrame = getReqResFrame(2);

ws.on('open', function open() {
    console.log('opened');
    ws.send(setupFrame, {binary: true}, function (err) {
        console.log('sent setup', err);
        ws.send(reqResFrame, {binary: true}, function (err) {
            console.log('sent reqres', err);
        });
    });
});

ws.on('close', function () {
    console.log('closed');
});

ws.on('message', function (msg) {
    console.log(msg);
});
