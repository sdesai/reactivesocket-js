'use strict';

//function Frame() {
    //this._buffer = null;
//}



//module.exports = {
    //Frame: Frame,
    //ERROR_CODES: ERROR_CODES,
    //FLAGS: FLAGS,
    //TYPES: TYPES,
    //FRAME_LENGTH: FRAME_LENGTH
//};

//var FRAME_LENGTH = 0xFFFFFFFD; // frame length is restricted to 31 bits.

//var TYPES = {
    //RESERVED: 0x0000,
    //SETUP: 0x0001,
    //SETUP_ERROR: 0x0002,
    //LEASE: 0x0003,
    //KEEPALIVE: 0x0004,
    //REQUEST_RESPONSE: 0x0011,
    //REQUEST_FNF: 0x0012,
    //REQUEST_STREAM: 0x0013,
    //REQUEST_SUB: 0x0014,
    //REQUEST_N: 0x0015,
    //CANCEL: 0x0016,
    //RESPONSE: 0x0020,
    //ERROR: 0x0021,
    //METADATA_PUSH: 0x0031,
    //EXT: 0xFFFF
//};

//var ERROR_CODES = {
    //INVALID_SETUP: 0x001,
    //UNSUPPORTED_SETUP: 0x0010,
    //REJECTED_SETUP: 0x0100
//};

//var FLAGS = {
    //IGNORE: 0x80, // 0b10000000
    //METADATA: 0X40, // 0b01000000
    //LEASE: 0x20, // 0b00100000
    //STRICT: undefined,
    //FOLLOWS: 0x20, // 0b00100000
    //COMPLETE: 0x10 // 0b00010000
//};

/**
 *
 */
//function parseFrame(buffer, cb) {

//}
/**
 * Assumes that Frame length is not set
 */
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

//function SetupErrorFrame() {

//}

//function LeaseFrame() {

//}

//function KeepaliveFrame () {

//}

//function RequestResponseFrame() {

//}

//function FireNForgetFrame() {

//}

//function StreamFrame() {

//}

//function RequestSubscriptionFrame() {

//}

//function RequestChannelFrame() {

//}

//function RequestNFrame() {

//}

//function CancelFrame() {

//}

//function ResponseFrame() {

//}

//function ErrorFrame() {

//}

//function MetadataPushFrame() {

//}

//function ExtensionFrame() {

//}
var WebSocket = require('ws');
var ws = new WebSocket('ws://10.16.183.109:8888');

ws.on('open', function open() {
    console.log('opened');
    ws.send(3, {binary: true}, function (err) {
        console.log('sent', err);
    });
});

ws.on('close', function () {
    console.log('closed');
});

ws.on('message', function (msg) {
    console.log(msg);
});
