var errorFrame = require('./errorFrame');
var setupFrame = require('./setupFrame');

module.exports = {
    ERROR_DATA: errorFrame.ERROR_DATA,
    ERROR_META_DATA: errorFrame.ERROR_META_DATA,

    SETUP_DATA: setupFrame.SETUP_DATA,
    SETUP_KEEP_ALIVE: setupFrame.SETUP_KEEP_ALIVE,
    SETUP_MAX_LIFE: setupFrame.SETUP_MAX_LIFE,
    SETUP_META_DATA: setupFrame.SETUP_META_DATA,

    // All the data uses stream id 4
    STREAM_ID: 4,

    // --------------------------------------------
    //  Error frame
    // --------------------------------------------
    errorFrame: errorFrame.errorFrame,
    errorFrameWithData: errorFrame.errorFrameWithData,
    errorFrameWithMeta: errorFrame.errorFrameWithMeta,

    // --------------------------------------------
    //  Setup frame
    // --------------------------------------------
    setupFrame: setupFrame.setupFrame,
    setupFrameWithData: setupFrame.setupFrameWithData,
    setupFrameWithMeta: setupFrame.setupFrameWithMeta
};



//// TODO : VALIDATE ALL OF THESE ARE CORRECT
//// TODO : VALIDATE ALL OF THESE ARE CORRECT
//// TODO : VALIDATE ALL OF THESE ARE CORRECT
//// TODO : VALIDATE ALL OF THESE ARE CORRECT
//// TODO : VALIDATE ALL OF THESE ARE CORRECT
//// TODO : VALIDATE ALL OF THESE ARE CORRECT

//// -------------------------- REQUEST RESPONSE ------------------
//var requestResponseBuffer = new Buffer(16);

//requestResponseBuffer.writeUInt32BE(0x00000004, 0); // 4 bytes of data
//requestResponseBuffer.writeUInt32BE(TYPES.REQUEST_RESPONSE << 16, 4);
//requestResponseBuffer.writeUInt32BE(0x00000004, 8);
//requestResponseBuffer.writeUInt32BE(0xAAAAAAAA, 12);

//var requestResponsePayload = {
    //data: JSON.stringify({arg:1})
//};
//// No metaData or error payload data
//// -------------------------- LEASE ------------------
//var leaseFrame = new Buffer(20);

//leaseFrame.writeUInt32BE(0x00000000, 0);
//leaseFrame.writeUInt32BE(TYPES.LEASE << 16, 4);
//leaseFrame.writeUInt32BE(0x00000001, 8);
//leaseFrame.writeUInt32BE(0x00000FFF, 12); // time to live, 4095ms
//leaseFrame.writeUInt32BE(0x000007FF, 16); // Number of requests to send, 2047
//// No metaData

//// -------------------------- KEEP ALIVE ------------------
//var keepaliveBuffer = new Buffer(12);

//keepaliveBuffer.writeUInt32BE(0x00000000, 0);
//keepaliveBuffer.writeUInt32BE(TYPES.KEEPALIVE << 16, 4);
//keepaliveBuffer.writeUInt32BE(0x00000000, 8); // pertains to connection, sid 0
//// no data

//// -------------------------- REQUEST FIRE N FORGET ------------------
//var requestFireNForgetBuffer = new Buffer(16);

//requestFireNForgetBuffer.writeUInt32BE(0x00000004, 0);
//requestFireNForgetBuffer.writeUInt32BE(TYPES.REQUEST_FNF << 16, 4);
//requestFireNForgetBuffer.writeUInt32BE(0x00000001, 8);
//requestFireNForgetBuffer.writeUInt32BE(0xAAAAAAAA, 12);

//// -------------------------- REQUEST STREAM ------------------
//var requestStreamBuffer = new Buffer(20);

//requestStreamBuffer.writeUInt32BE(0x00000004, 0);
//requestStreamBuffer.writeUInt32BE(TYPES.REQUEST_STREAM << 16, 4);
//requestStreamBuffer.writeUInt32BE(0x00000001, 8);
//requestStreamBuffer.writeUInt32BE(0x00000001, 12);
//requestStreamBuffer.writeUInt32BE(0xAAAAAAAA, 16);

//// -------------------------- REQUEST SUBSCRIPTION ------------------
//var requestSubscriptionBuffer = new Buffer(20);

//requestSubscriptionBuffer.writeUInt32BE(0x00000004, 0);
//requestSubscriptionBuffer.writeUInt32BE(TYPES.REQUEST_ << 16, 4);
//requestSubscriptionBuffer.writeUInt32BE(0x00000001, 8);
//requestSubscriptionBuffer.writeUInt32BE(0x00000001, 12);
//requestSubscriptionBuffer.writeUInt32BE(0xAAAAAAAA, 16);
//// No metaData or error payload data


//// -------------------------- REQUEST CHANNEL ------------------
//var requestChannelBuffer = new Buffer(16);

//requestChannelBuffer.writeUInt32BE(0x00000004, 0);
//requestChannelBuffer.writeUInt32BE(TYPES.ERROR << 16, 4);
//requestChannelBuffer.writeUInt32BE(0x00000001, 8);
//requestChannelBuffer.writeUInt32BE(0xAAAAAAAA, 12);

//// -------------------------- PAYLOAD ENCODING -----------------

//module.exports = {
    //// The data to setup
    //SETUP_DATA: setupFrame.SETUP_DATA,
    //SETUP_META_DATA: setupFrame.SETUP_META_DATA,

    //// the error frame test.
    //errorFrame: errorFrameWithPayload,

    //// The setup frame constants.
    //setupFrame: setupFrame.setupFrame,
    //setupFrameWithData: setupFrame.setupFrameWithData,
    //setupFrameWithMeta: setupFrame.setupFrameWithMeta
//};

//function setLeaseFlag(buffer, lease) {
    //setFlag(buffer, FLAGS.LEASE);
//}

//// The setFlag function will set the flag to true / false at position (LSb)
//// example:
//// typeAndFlags: 0x00 00 00 00
//// flag: true
//// position: 0x0200
//// out: 0x00 00 02 00
//function setFlag(buffer, position) {
    //var typeAndFlags = buffer.readUInt32BE(4);

    //// Invert value to use XOR as flag setter
    //buffer.writeUInt32BE(typeAndFlags | (0x1 << position), 4);
//}
