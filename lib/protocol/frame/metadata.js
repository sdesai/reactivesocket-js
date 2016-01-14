'use strict';

var CONSTANTS = require('./../constants');
var METADATA_FLAG = CONSTANTS.FLAGS.METADATA;

/**
 * Flags the metadata flag in the flag section of the header to 1 (true).
 * @param {Buffer} buffer -
 * @returns {undefined}
 */
function flagMetadata(buffer) {

    // Reads and sets to true the metadata flag.
    var bufferFlags = buffer.readUInt32BE(4) | METADATA_FLAG;
    buffer.writeUInt32BE(bufferFlags, 4);
}

/**
 * If the flag set passed in has the metadata flag set to true (1).
 *
 * @param {Number} flags -
 * @returns {undefined}
 */
function responseHasMetadata(flags) {
    return ((flags & METADATA_FLAG) === METADATA_FLAG);
}

module.exports.flagMetadata = flagMetadata;
module.exports.hasMetadata = responseHasMetadata;
