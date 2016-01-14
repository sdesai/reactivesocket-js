'use strict';

var modifyBufferWithPayload = require('./modifyBufferWithPayload');

var CONSTANTS = require('./../../lib/protocol/constants');

var SETUP_KEEP_ALIVE = 0x0000003FF;
var SETUP_MAX_LIFE = 0x000000FFF;
var SETUP_DATA = 'super important data';
var SETUP_META_DATA = 'super important metadata';
var TYPES = CONSTANTS.TYPES;
var VERSION = CONSTANTS.VERSION;

// Exports the types of setup frames.
module.exports = {
    // The data to setup
    SETUP_DATA: SETUP_DATA,
    SETUP_KEEP_ALIVE: SETUP_KEEP_ALIVE,
    SETUP_MAX_LIFE: SETUP_MAX_LIFE,
    SETUP_META_DATA: SETUP_META_DATA,

    // Creates the setupFrame
    setupFrame: setupFrame(),

    // Setup frame with just data
    setupFrameWithData: modifyBufferWithPayload(setupFrame(), {
        data: SETUP_DATA
    }),

    // Ensures that the metadata is added to the setup frame
    setupFrameWithMeta: modifyBufferWithPayload(setupFrame(), {
        metadata: SETUP_META_DATA,
        data: SETUP_DATA
    })
};

function setupFrame() {
    var sFrame = new Buffer(24);

    sFrame.writeUInt32BE(0x00000024, 0); // streamId 0
    sFrame.writeUInt32BE(TYPES.SETUP << 16, 4); // type setup, no flags
    sFrame.writeUInt32BE(0x00000000, 8); // streamId 0
    sFrame.writeUInt32BE(VERSION & 0xFFFFFFFF, 12); // streamId 0
    sFrame.writeUInt32BE(SETUP_KEEP_ALIVE, 16);
    sFrame.writeUInt32BE(SETUP_MAX_LIFE, 20);

    var encodingTypeBuffer = new Buffer(5);
    encodingTypeBuffer.write('UTF-8');
    var mimeLength = 'UTF-8'.length;
    var lengthBuffer = new Buffer(1);
    lengthBuffer.writeUInt8(mimeLength, 0);
    sFrame = Buffer.concat([sFrame, lengthBuffer, encodingTypeBuffer,
                           lengthBuffer, encodingTypeBuffer]);

    return sFrame;
}
