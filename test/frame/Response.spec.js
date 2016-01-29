'use strict';

var CONSTANTS = require('../../lib/protocol/constants');
var data = require('../data');
var setFlag  = require('../data/setFlag');
var Frame = require('../../lib/protocol/frame');

var compareFrames = require('../compareFrames');

var COMPLETE = CONSTANTS.FLAGS.COMPLETE;

describe('Response Frame', function() {
    it('should create a response frame with data.', function() {
        var expected = data.responseFrameWithData;
        var actual = Frame.getResponseFrame(data.STREAM_ID, {
            data: data.RES_DATA
        });

        compareFrames(expected, actual);
    });

    it('should create a response frame with data and completed.', function() {
        var expected = setFlag(data.responseFrameWithData, COMPLETE);
        var actual = Frame.getResponseFrame(data.STREAM_ID, {
            data: data.RES_DATA
        }, true);

        compareFrames(expected, actual);
    });

    it('should create a response frame with data and meta and completed.',
        function() {
            var expected = setFlag(data.responseFrameWithMeta, COMPLETE);
            var actual = Frame.getResponseFrame(data.STREAM_ID, {
                data: data.RES_DATA,
                metadata: data.RES_META
            }, true);

            compareFrames(expected, actual);
        });
});


