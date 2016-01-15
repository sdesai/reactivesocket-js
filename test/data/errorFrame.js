'use strict';

var addPayload = require('./addPayload');

var CONSTANTS = require('./../../lib/protocol/constants');

var ERROR_CODES = CONSTANTS.ERROR_CODES;
var ERROR_DATA = 'Bad Data';
var ERROR_META_DATA = 'MBad Data';
var TYPES = CONSTANTS.TYPES;

module.exports = {
    ERROR_DATA: ERROR_DATA,
    ERROR_META_DATA: ERROR_META_DATA,

    // the base frame
    errorFrame: errorFrame(),

    // Setup frame with just data
    errorFrameWithData: addPayload(errorFrame(), {
        data: ERROR_DATA
    }),

    // Ensures that the metadata is added to the error frame
    errorFrameWithMeta: addPayload(errorFrame(), {
        metadata: ERROR_META_DATA,
        data: ERROR_DATA
    })
};

function errorFrame() {
    var eFrame = new Buffer(16);

    eFrame.writeUInt32BE(0x00000000, 0);
    eFrame.writeUInt32BE(TYPES.ERROR << 16, 4);
    eFrame.writeUInt32BE(0x00000004, 8);
    eFrame.writeUInt32BE(ERROR_CODES.INVALID_SETUP, 12);

    return eFrame;
}
