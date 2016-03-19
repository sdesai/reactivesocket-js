'use strict';

var compareFrames = require('../common/compareFrames');
var data = require('../data');
var frame = require('../../lib/protocol/frame');


describe('request response frame', function cb() {
    it('should create a request/response frame with no payload.',
       function _cb() {
        var expected = data.reqResFrame;
        var actual = frame.getReqResFrame({
            streamId: data.STREAM_ID
        });

        compareFrames(expected, actual);
    });

    it('should create a request/response frame with payload.data.',
       function _cb() {
        var expected = data.reqResFrameWithData;
        var actual = frame.getReqResFrame({
            streamId: data.STREAM_ID,
            payload: {
                data: data.REQ_RES_DATA
            }
        });

        compareFrames(expected, actual);
    });

    it('should create a request/response frame with with full payload.',
        function _cb() {
        var expected = data.reqResFrameWithMeta;
        var actual = frame.getReqResFrame({
            streamId: data.STREAM_ID,
            payload: {
                data: data.REQ_RES_DATA,
                metadata: data.REQ_RES_META
            }
        });

        compareFrames(expected, actual);
    });
});
