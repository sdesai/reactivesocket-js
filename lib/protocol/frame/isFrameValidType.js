'use strict';

var TYPES = require('./../constants');

/**
 * @param {Number} type -
 * @returns {Boolean}
 */
module.exports = function isValidFrameType(type) {
    var value = false;

    switch (type) {
        case TYPES.RESERVED:
        case TYPES.SETUP:
        case TYPES.LEASE:
        case TYPES.KEEPALIVE:
        case TYPES.REQUEST_RESPONSE:
        case TYPES.REQUEST_FNF:
        case TYPES.REQUEST_STREAM:
        case TYPES.REQUEST_SUB:
        case TYPES.REQUEST_CHANNEL:
        case TYPES.REQUEST_N:
        case TYPES.CANCEL:
        case TYPES.RESPONSE:
        case TYPES.ERROR:
        case TYPES.METADATA_PUSH:
        case TYPES.NEXT:
        case TYPES.COMPLETE:
        case TYPES.NEXT_COMPLETE:
        case TYPES.EXT:
            value = true;
            break;
        default:
            value = false;
            break;
    }
    return value;
};
