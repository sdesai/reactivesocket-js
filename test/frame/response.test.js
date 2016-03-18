'use strict';

var compareFrames = require('../common/compareFrames');
var data = require('../data');
var frame = require('../../lib/protocol/frame');
var setFlag  = require('../data/setFlag');

var CONSTANTS = require('../../lib/protocol/constants');
var COMPLETE = CONSTANTS.FLAGS.COMPLETE;

describe('response frame', function () {
    it('should create a response frame with payload.data', function () {
        var expected = data.responseFrameWithData;
        var actual = frame.getResponseFrame(data.STREAM_ID, {
            data: data.RES_DATA
        });

        compareFrames(expected, actual);
    });

    it('should create a response frame with payload.data and completed.',
       function () {
        var expected = setFlag(data.responseFrameWithData, COMPLETE);
        var actual = frame.getResponseFrame(data.STREAM_ID, {
            data: data.RES_DATA
        }, true);

        compareFrames(expected, actual);
    });

    it('should create a response frame with full payload and completed.',
        function () {
            var expected = setFlag(data.responseFrameWithMeta, COMPLETE);
            var actual = frame.getResponseFrame(data.STREAM_ID, {
                data: data.RES_DATA,
                metadata: data.RES_META
            }, true);

            compareFrames(expected, actual);
        });
});


