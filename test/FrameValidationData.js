'use strict';

var CONSTANTS = require('./../lib/protocol/constants');
var ERROR_CODES = CONSTANTS.ERROR_CODES;
var FLAGS = CONSTANTS.FLAGS;
var TYPES = CONSTANTS.TYPES;
var VERSION = CONSTANTS.VERSION;

// -------------------------- SETUP ------------------
var setupFrame = new Buffer(24);

setupFrame.writeUInt32BE(0x00000024, 0); // streamId 0
setupFrame.writeUInt32BE(TYPES.SETUP << 16, 4); // type setup, no flags
setupFrame.writeUInt32BE(0x00000000, 8); // streamId 0
setupFrame.writeUInt32BE(VERSION & 0xFFFFFFFF, 12); // streamId 0
setupFrame.writeUInt32BE(0x0000003FF, 16); // time between keep alive frames,
                                            // 1023ms
setupFrame.writeUInt32BE(0x000000FFF, 20); // max lifetime, 4095ms

var encodingTypeBuffer = new Buffer(5);
encodingTypeBuffer.write('UTF-8');
var mimeLength = 'UTF-8'.length;
var lengthBuffer = new Buffer(1);
lengthBuffer.writeUInt8(mimeLength, 0);
setupFrame = Buffer.concat([setupFrame, lengthBuffer, encodingTypeBuffer, lengthBuffer,
                            encodingTypeBuffer]);

var setupFrameOffset = setupFrame.length + CONSTANTS.METADATA_LENGTH;
var setupMetaData = 'super important metadata';
var setupData = 'super important data';
var setupFrameWithPayloadLength =
    setupFrame.length +
    setupData.length +
    setupMetaData.length +
    CONSTANTS.METADATA_LENGTH;
var setupFrameWithPayload = new Buffer(setupFrameWithPayloadLength).fill(0);
setupFrame.copy(setupFrameWithPayload);

// Writes new length into setup with frame payload
setupFrameWithPayload.writeUInt32BE(setupFrameWithPayloadLength, 0);

// Writes metaData length
setupFrameWithPayload.writeUInt32BE(setupMetaData.length, setupFrame.length);
setupFrameOffset += copyStringDataTo(setupFrameWithPayload,
                                     setupMetaData, setupFrameOffset);

// Writes data
copyStringDataTo(setupFrameWithPayload, setupData, setupFrameOffset);

// -------------------------- ERROR ------------------
var errorFrame = new Buffer(16);

errorFrame.writeUInt32BE(0x00000000, 0);
errorFrame.writeUInt32BE(TYPES.ERROR << 16, 4);
errorFrame.writeUInt32BE(0x00000004, 8);
errorFrame.writeUInt32BE(ERROR_CODES.INVALID_SETUP, 12);

var errorFrameOffset = errorFrame.length + CONSTANTS.METADATA_LENGTH;
var errorData = 'Bad Data';
var errorFrameWithPayloadLength =
    errorFrame.length + errorData.length + CONSTANTS.METADATA_LENGTH;
var errorFrameWithPayload = new Buffer(errorFrameWithPayloadLength).fill(0);
errorFrame.copy(errorFrameWithPayload);
errorFrameWithPayload.writeUInt32BE(errorFrameWithPayloadLength, 0);

// Copies the string data into the payload.data location.
copyStringDataTo(errorFrameWithPayload, errorData, errorFrameOffset);

// TODO : VALIDATE ALL OF THESE ARE CORRECT
// No metaData or error payload data
// -------------------------- LEASE ------------------
var leaseFrame = new Buffer(20);

leaseFrame.writeUInt32BE(0x00000000, 0);
leaseFrame.writeUInt32BE(TYPES.LEASE << 16, 4);
leaseFrame.writeUInt32BE(0x00000001, 8);
leaseFrame.writeUInt32BE(0x00000FFF, 12); // time to live, 4095ms
leaseFrame.writeUInt32BE(0x000007FF, 16); // Number of requests to send, 2047
// No metaData

// -------------------------- KEEP ALIVE ------------------
var keepaliveBuffer = new Buffer(12);

keepaliveBuffer.writeUInt32BE(0x00000000, 0);
keepaliveBuffer.writeUInt32BE(TYPES.KEEPALIVE << 16, 4);
keepaliveBuffer.writeUInt32BE(0x00000000, 8); // pertains to connection, sid 0
// no data

// -------------------------- REQUEST RESPONSE ------------------
var requestResponseBuffer = new Buffer(16);

requestResponseBuffer.writeUInt32BE(0x00000004, 0); // 4 bytes of data
requestResponseBuffer.writeUInt32BE(TYPES.REQUEST_RESPONSE << 16, 4);
requestResponseBuffer.writeUInt32BE(0x00000001, 8);
requestResponseBuffer.writeUInt32BE(0xAAAAAAAA, 12);

// -------------------------- REQUEST FIRE N FORGET ------------------
var requestFireNForgetBuffer = new Buffer(16);

requestFireNForgetBuffer.writeUInt32BE(0x00000004, 0);
requestFireNForgetBuffer.writeUInt32BE(TYPES.REQUEST_FNF << 16, 4);
requestFireNForgetBuffer.writeUInt32BE(0x00000001, 8);
requestFireNForgetBuffer.writeUInt32BE(0xAAAAAAAA, 12);

// -------------------------- REQUEST STREAM ------------------
var requestStreamBuffer = new Buffer(20);

requestStreamBuffer.writeUInt32BE(0x00000004, 0);
requestStreamBuffer.writeUInt32BE(TYPES.REQUEST_STREAM << 16, 4);
requestStreamBuffer.writeUInt32BE(0x00000001, 8);
requestStreamBuffer.writeUInt32BE(0x00000001, 12);
requestStreamBuffer.writeUInt32BE(0xAAAAAAAA, 16);

// -------------------------- REQUEST SUBSCRIPTION ------------------
var requestSubscriptionBuffer = new Buffer(20);

requestSubscriptionBuffer.writeUInt32BE(0x00000004, 0);
requestSubscriptionBuffer.writeUInt32BE(TYPES.REQUEST_ << 16, 4);
requestSubscriptionBuffer.writeUInt32BE(0x00000001, 8);
requestSubscriptionBuffer.writeUInt32BE(0x00000001, 12);
requestSubscriptionBuffer.writeUInt32BE(0xAAAAAAAA, 16);
// No metaData or error payload data


// -------------------------- REQUEST CHANNEL ------------------
var requestChannelBuffer = new Buffer(16);

requestChannelBuffer.writeUInt32BE(0x00000004, 0);
requestChannelBuffer.writeUInt32BE(TYPES.ERROR << 16, 4);
requestChannelBuffer.writeUInt32BE(0x00000001, 8);
requestChannelBuffer.writeUInt32BE(0xAAAAAAAA, 12);

// -------------------------- PAYLOAD ENCODING -----------------

module.exports = {
    setupFrame: setupFrame,
    setupFrameWithPayload: setupFrameWithPayload,
    errorFrame: errorFrameWithPayload
};

function setLeaseFlag(buffer, lease) {
    setFlag(buffer, FLAGS.LEASE);
}

// The setFlag function will set the flag to true / false at position (LSb)
// example:
// typeAndFlags: 0x00 00 00 00
// flag: true
// position: 0x0200
// out: 0x00 00 02 00
function setFlag(buffer, position) {
    var typeAndFlags = buffer.readUInt32BE(4);

    // Invert value to use XOR as flag setter
    buffer.writeUInt32BE(typeAndFlags | (0x1 << position), 4);
}

// returns length of copied data.
function copyStringDataTo(buffer, stringData, offset) {
    var i = 0;
    for (; i < stringData.length; ++i) {
        var charCode = stringData.charCodeAt(i);
        var at = offset + i;
        buffer.writeUInt8(charCode, at);
    }

    return i;
}
