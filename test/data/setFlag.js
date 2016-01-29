'use strict';

/**
 * Assumes that the passed in buffer is a completed buffer, or at least the
 * header buffer.
 *
 * @param {Buffer} buffer -
 * @param {Number} flagToSet - Should be no larger than 65535 (16 bits) or else
 * odd results will ensure
 *
 * @returns {Buffer} - Though this function mutates the buffer, for convience
 * it will return the buffer that was passed in.
 */
module.exports = function setFlag(buffer, flagToSet) {
    var flags = buffer.readUInt16BE(6) | flagToSet;
    buffer.writeUInt16BE(flags, 6);

    return buffer;
};
