var CONSTANTS = require('./../../lib/protocol/constants');
var METADATA_LENGTH = CONSTANTS.METADATA_LENGTH;
var METADATA_FLAG = CONSTANTS.FLAGS.METADATA;

module.exports = function modifyBufferWithPayload(buffer, payload) {
    var bufferOffset = buffer.length;
    var dataLength = payload.data ? payload.data.length : 0;
    var metadataLength = payload.metadata ? payload.metadata.length : 0;

    // Calculates the length with the metadata length added, if needed
    var bufferWithPayloadLength = buffer.length + dataLength +
        metadataLength + (metadataLength > 0 && METADATA_LENGTH || 0);
    var bufferWithPayload = new Buffer(bufferWithPayloadLength).fill(0);

    // Copy the previous buffer into the new buffer
    buffer.copy(bufferWithPayload);

    // Writes new length into buffer
    bufferWithPayload.writeUInt32BE(bufferWithPayloadLength, 0);

    // If there is metadata, then we will write it and adjust the flags
    if (metadataLength > 0) {

        // Writes the META flag into the header.
        var flagsAndMeta = bufferWithPayload.readUInt16BE(6) | METADATA_FLAG;
        bufferWithPayload.writeUInt16BE(flagsAndMeta, 6);

        // Write the metadata length into the metadata length field.
        bufferWithPayload.writeUInt32BE(metadataLength, bufferOffset);
        bufferOffset += METADATA_LENGTH;

        // Writes metaData length
        bufferOffset += copyStringDataTo(bufferWithPayload,
                                         payload.metadata, bufferOffset);
    }

    if (dataLength > 0) {
        // Writes the data into the buffer with payload
        copyStringDataTo(bufferWithPayload, payload.data, bufferOffset);
    }

    return bufferWithPayload;
};

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
