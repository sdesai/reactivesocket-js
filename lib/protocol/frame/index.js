'use strict';

var WebSocket = require('ws');

var CONSTANTS = require('./../constants');
var LOG = require('./getDefaultLogger');
var encodePayload = require('./encodePayload');
var getErrorFrame = require('./getErrorFrame');
var getFrameHeader = require('./getFrameHeader');
var getSetupFrame = require('./getSetupFrame');

// Defined constants.
var ERROR_CODES = CONSTANTS.ERROR_CODES;
var FLAGS = CONSTANTS.FLAGS;
var TYPES = CONSTANTS.TYPES;
var VERSION = CONSTANTS.VERSION;
var FRAME_LENGTH = CONSTANTS.FRAME_LENGTH;

module.exports = {
    encodePayload: encodePayload,
    getChannelFrame: getChannelFrame,
    getErrorFrame: getErrorFrame,
    getFrameHeader: getFrameHeader,
    getReqResFrame: getReqResFrame,
    getSetupFrame: getSetupFrame,
    getSubscriptionFrame: getSubscriptionFrame,
    getRequestStreamFrame: getRequestStreamFrame,
    getFireNForgetFrame: getFireNForgetFrame,
    parseFrame: parse,

    // Purely for debugging purposes currently.
    // TODO: Have a general way in which a logger can be set
    _setLog: function(nextLog) {
        LOG = nextLog;
    }
};


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
 * @param {Number} streamId The Stream ID.
 * @param {Object} payload The payload.
 *
 * @returns {Buffer} The fnf frame.
 */
function getFireNForgetFrame(streamId, payload) {
    LOG.debug({streamId: streamId, payload: payload},
              'getFireNForgetFrame: entering');

    var flags = FLAGS.NONE;

    if (payload.metadata) {
        flags |= FLAGS.METADATA;
    }

    var payloadBuf = encodePayload(payload);
    var frameHeaderBuf = getFrameHeader(payloadBuf.length,
                                        TYPES.REQUEST_FNF, flags,
                                        streamId);

    var buf = Buffer.concat([frameHeaderBuf, payloadBuf]);
    LOG.debug({frame: buf, length: buf.length}, 'getFireNForgetFrame: exiting');
    return buf;
}



function getChannelFrame(streamId, initReqNum, payload) {
    LOG.debug({
        streamId: streamId,
        initReqNum: initReqNum,
        payload: payload
    }, 'getChannelFrame: entering');

    var flags = FLAGS.NONE;

    if (payload.metadata) {
        flags |= FLAGS.METADATA;
    }

    if (initReqNum) {
        flags |= FLAGS.REQUEST_N_PRESENT;
    }

    var payloadBuf = encodePayload(payload);
    var frameHeaderBuf;

    if (initReqNum) {
        var initReqNumBuf;
        initReqNumBuf = new Buffer(4);
        initReqNumBuf.writeUInt32BE(initReqNum);
        frameHeaderBuf = getFrameHeader(payloadBuf.length +
                                        initReqNumBuf.length,
                                        TYPES.REQUEST_CHANNEL, flags,
                                        streamId);
        frameHeaderBuf = Buffer.concat([frameHeaderBuf, initReqNumBuf]);


    } else {
        frameHeaderBuf = getFrameHeader(payloadBuf.length,
                                        TYPES.REQUEST_CHANNEL, flags,
                                        streamId);
    }

    var buf = Buffer.concat([frameHeaderBuf, payloadBuf]);
    LOG.debug({frame: buf}, 'getChannelFrame: exiting');
    return buf;
}

/**
 * @param {Number} initReqNum The initila number of requests.
 * @param {Object} payload The payload.
 * @param {Number} streamId The Stream ID.
 *
 * @returns {Buffer} The encoded subscription frame.
 */
function getSubscriptionFrame(initReqNum, payload, streamId) {
    return getStreamableFrame(initReqNum, payload, streamId,
                              TYPES.REQUEST_SUB);
}

/**
 * @param {Number} initReqNum The initila number of requests.
 * @param {Object} payload The payload.
 * @param {Number} streamId The Stream ID.
 *
 * @returns {Buffer} The encoded request stream frame.
 */
function getRequestStreamFrame(initReqNum, payload, streamId) {
    return getStreamableFrame(initReqNum, payload, streamId,
                              TYPES.REQUEST_STREAM);
}

// Internal
function getStreamableFrame(initReqNum, payload, streamId, type) {
    LOG.debug({
        initReqNum: initReqNum, payload: payload, streamId: streamId, type: type
    }, 'getStreamableFrame: entering');
    var payloadBuf = encodePayload(payload);

    var flags = FLAGS.NONE;

    if (payload.metadata) {
        flags |= FLAGS.METADATA;
    }

    var frameHeaderBuf = getFrameHeader(payloadBuf.length, type, flags,
                                        streamId);
    var initReqNumBuf = new Buffer(4);
    initReqNumBuf.writeUInt32BE(initReqNum, 0);

    var buf = Buffer.concat([frameHeaderBuf, initReqNumBuf, payloadBuf]);

    LOG.debug({frame: buf}, 'getStreamableFrame: exiting');
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

/**
 * @param {Buffer} buf The header buffer
 *
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

function parse(buf, offset) {
    LOG.debug({buffer: buf, offset: offset}, 'parse: entering');

    if (!offset) {
        offset = 0;
    }

    var frame = {
        header: parseHeader(buf),
        payload: {}
    };

    switch (frame.header.type) {
        case TYPES.ERROR:
            frame.header.errorCode = parseErrorCode(buf);
            break;
        case TYPES.RESPONSE:
        case TYPES.NEXT:
        case TYPES.COMPLETE:
        case TYPES.NEXT_COMPLETE:
        case TYPES.REQUEST_CHANNEL:
            frame.payload = parseResponse(buf, frame.header.flags, offset + 12);
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
            LOG.debug({errCode: code}, 'parsed error code');
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


///// Mainline
//var ws = new WebSocket('ws://10.16.183.109:8888');

//var setupFrame = getSetupFrame(12345678, 87654321, {
    //metadata: 'UTF-8',
    //data: 'UTF-8'
//});

//var fireNForgetFrame = getFireNForgetFrame(2, {
    //metadata: 'hello',
    //data: 'steve'
//});

////var channelFrame = getChannelFrame(2, 128, {
////metadata: 'hello',
////data: 'steve!'
////});
////var reqResFrame = getReqResFrame(2, {
////metadata: 'foobar',
////data: 'Hello Steve!'
////});

////var subFrame = getSubscriptionFrame(10, {
////metadata: 'subscribe!',
////data: 'hello steve!'
////}, 2);

////var reqStreamFrame = getRequestStreamFrame(10, {
////metadata: 'subscribe!',
////data: 'hello steve!'
////}, 2);

//ws.on('open', function open() {
    //LOG.info('opened ws');
    //ws.send(setupFrame, {binary: true}, function (err) {
        //LOG.info({err: err}, 'sent setup');
        ////ws.send(reqResFrame, {binary: true}, function (e2) {
        ////ws.send(subFrame, {binary: true}, function (e2) {
        ////ws.send(reqStreamFrame, {binary: true}, function (e2) {
        ////ws.send(channelFrame, {binary: true}, function (e2) {
        //ws.send(fireNForgetFrame, {binary: true}, function (e2) {
            //LOG.info({err: e2}, 'sent data');
        //});
    //});
//});

//ws.on('close', function () {
    //console.log('closed');
//});

//var msgCount = 0;
//ws.on('message', function (msg) {
    //console.log('raw msg', msg);
    //console.log('count', msgCount++);
    //var frame = parse(msg, 0);
    //console.log(frame);
    //console.log('data', frame.payload.data);
    //console.log('metadata', frame.payload.metadata);
//});
