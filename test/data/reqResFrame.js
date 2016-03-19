'use strict';

var addPayload = require('./addPayload');

var TYPES = require('./../../lib/protocol/constants').TYPES;

var REQ_RES_DATA = JSON.stringify({
    arg1: 'yes',
    arg2: 'no'
});
var REQ_RES_META = 'Some Request Response Meta';

module.exports = {
    REQ_RES_DATA: REQ_RES_DATA,
    REQ_RES_META: REQ_RES_META,

    reqResFrame: reqResFrame(),
    reqResFrameWithData: addPayload(reqResFrame(), {
        data: REQ_RES_DATA
    }),
    reqResFrameWithMeta: addPayload(reqResFrame(), {
        data: REQ_RES_DATA,
        metadata: REQ_RES_META
    })
};

function reqResFrame() {
    var reqResBuffer = new Buffer(12);

    // 12 bytes of data (0xc)
    reqResBuffer.writeUInt32BE(0xc, 0); // 4 bytes of data
    reqResBuffer.writeUInt16BE(TYPES.REQUEST_RESPONSE, 4);

    // Stream Id
    reqResBuffer.writeUInt32BE(0x00000004, 8);

    return reqResBuffer;
}
