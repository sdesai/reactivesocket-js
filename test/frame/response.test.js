'use strict';

var compareFrames = require('../common/compareFrames');
var frame = require('../../lib/protocol/frame');
var setFlag  = require('../data/setFlag');

var CONSTANTS = require('../../lib/protocol/constants');
var DATA = require('../data');
var COMPLETE = CONSTANTS.FLAGS.COMPLETE;

describe('response frame', function () {
    it('should create a response frame with payload.data', function () {
        var expected = DATA.responseFrameWithData;
        var actual = frame.getResponseFrame({
            streamId: DATA.STREAM_ID,
            payload: {
                data: DATA.RES_DATA
            }
        });

        compareFrames(expected, actual);
    });

    it('should create a response frame with payload.data and completed.',
       function () {
        var expected = setFlag(DATA.responseFrameWithData, COMPLETE);
        var actual = frame.getResponseFrame({
            streamId: DATA.STREAM_ID,
            payload: {
                data: DATA.RES_DATA
            },
            isCompleted: true
        });

        compareFrames(expected, actual);
    });

    it('should create a response frame with full payload and completed.',
        function () {
            var expected = setFlag(DATA.responseFrameWithMeta, COMPLETE);
            var actual = frame.getResponseFrame({
                streamId: DATA.STREAM_ID,
                payload: {
                    data: DATA.RES_DATA,
                    metadata: DATA.RES_META
                },
                isCompleted: true
            });

            compareFrames(expected, actual);
        });
});
