'use strict';

var CONSTANTS = require('./../lib/protocol/constants');
var ERROR_CODES = CONSTANTS.ERROR_CODES;
var FLAGS = CONSTANTS.FLAGS;
var TYPES = CONSTANTS.TYPES;
var VERSION = CONSTANTS.VERSION;

// -------------------------- SETUP ------------------
var setupBuffer = new Buffer(24);

setupBuffer.writeUInt32BE(0x00000024, 0); // streamId 0
setupBuffer.writeUInt32BE(TYPES.SETUP << 16, 4); // type setup, no flags
setupBuffer.writeUInt32BE(0x00000000, 8); // streamId 0
setupBuffer.writeUInt32BE(VERSION & 0xFFFFFFFF, 12); // streamId 0
setupBuffer.writeUInt32BE(0x0000003FF, 16); // time between keep alive frames,
                                            // 1023ms
setupBuffer.writeUInt32BE(0x000000FFF, 20); // max lifetime, 4095ms

var encodingTypeBuffer = new Buffer(5);
encodingTypeBuffer.write('UTF-8');
var mimeLength = 'UTF-8'.length;
var lengthBuffer = new Buffer(1);
lengthBuffer.writeUInt8(mimeLength, 0);
setupBuffer = Buffer.concat([setupBuffer, lengthBuffer, encodingTypeBuffer, lengthBuffer,
                            encodingTypeBuffer]);


// TODO : VALIDATE ALL OF THESE ARE CORRECT
// -------------------------- ERROR ------------------
var errorBuffer = new Buffer(16);

errorBuffer.writeUInt32BE(0x00000000, 0);
errorBuffer.writeUInt32BE(TYPES.ERROR << 16, 4);
errorBuffer.writeUInt32BE(0x00000001, 8);
errorBuffer.writeUInt32BE(ERROR_CODES.INVALID_SETUP, 12);
// No metaData or error payload data

// -------------------------- LEASE ------------------
var leaseBuffer = new Buffer(20);

leaseBuffer.writeUInt32BE(0x00000000, 0);
leaseBuffer.writeUInt32BE(TYPES.LEASE << 16, 4);
leaseBuffer.writeUInt32BE(0x00000001, 8);
leaseBuffer.writeUInt32BE(0x00000FFF, 12); // time to live, 4095ms
leaseBuffer.writeUInt32BE(0x000007FF, 16); // Number of requests to send, 2047
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
    setupBuffer: setupBuffer,
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
