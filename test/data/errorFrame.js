'use strict';
var modifyBufferWithPayload = require('./modifyBufferWithPayload');

var CONSTANTS = require('./../../lib/protocol/constants');

var ERROR_CODES = CONSTANTS.ERROR_CODES;
var ERROR_DATA = 'Bad Data';
var ERROR_META_DATA = 'MBad Data';
var METADATA_FLAG = CONSTANTS.FLAGS.METADATA;
var TYPES = CONSTANTS.TYPES;

module.exports = {
    ERROR_DATA: ERROR_DATA,
    ERROR_META_DATA: ERROR_META_DATA,

    // the base frame
    errorFrame: errorFrame(),

    // Setup frame with just data
    errorFrameWithData: modifyBufferWithPayload(errorFrame(), {
        data: ERROR_DATA
    }),

    // Ensures that the metadata is added to the error frame
    errorFrameWithMeta: modifyBufferWithPayload(errorFrame(), {
        metadata: ERROR_META_DATA,
        data: ERROR_DATA
    }),
};

function errorFrame() {
    var errorFrame = new Buffer(16);

    errorFrame.writeUInt32BE(0x00000000, 0);
    errorFrame.writeUInt32BE(TYPES.ERROR << 16, 4);
    errorFrame.writeUInt32BE(0x00000004, 8);
    errorFrame.writeUInt32BE(ERROR_CODES.INVALID_SETUP, 12);

    return errorFrame;
}
