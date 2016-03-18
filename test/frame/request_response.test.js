'use strict';

var compareFrames = require('../common/compareFrames');
var data = require('../data');
var frame = require('../../lib/protocol/frame');


describe('request response frame', function () {
    it('should create a request/response frame with no payload.', function () {
        var expected = data.reqResFrame;
        var actual = frame.getReqResFrame(data.STREAM_ID);

        compareFrames(expected, actual);
    });

    it('should create a request/response frame with payload.data.', function () {
        var expected = data.reqResFrameWithData;
        var actual = frame.getReqResFrame(data.STREAM_ID, {
            data: data.REQ_RES_DATA
        });

        compareFrames(expected, actual);
    });

    it('should create a request/response frame with with full payload.',
        function () {
        var expected = data.reqResFrameWithMeta;
        var actual = frame.getReqResFrame(data.STREAM_ID, {
            data: data.REQ_RES_DATA,
            metadata: data.REQ_RES_META
        });

        compareFrames(expected, actual);
    });
});
