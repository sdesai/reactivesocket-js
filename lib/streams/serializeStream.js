'use strict';

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');

var frame = require('../protocol/frame');

var CONSTANTS = require('../protocol/constants');

/**
 * @constructor
 * @param {Object} opts The options object
 * @param {Object} [log=bunyan]  The logger
 * @returns {Object}
 */
function SerializeStream(opts) {
    assert.optionalObject(opts, 'opts');
    assert.object(opts, 'opts');
    assert.optionalObject(opts.log, 'opts.log');

    if (opts.log) {
        this._log = opts.log.child({
            component: 'SerializeStream'
        });
    } else {
        this._log = bunyan.createLogger({
            name: 'SerializeStream',
            level: bunyan.INFO,
            serializers: bunyan.stdSerializers
        });
    }

    stream.Transform.call(this, {writableObjectMode: true});
}
util.inherits(SerializeStream, stream.Transform);

module.exports = SerializeStream;

SerializeStream.prototype._transform = function _transform(f, enc, cb) {
    var self = this;
    self._log.debug({
        frame: f
    }, 'SerializeStream._transform: entering');

    assert.object(f, 'frame');
    assert.number(f.type, 'frame.type');

    var buf;

    switch (f.type) {
        case CONSTANTS.TYPES.REQUEST_RESPONSE:
            buf = frame.getReqResFrame(f);
            break;
        case CONSTANTS.TYPES.SETUP:
            buf = frame.getSetupFrame(f);
            break;
        case CONSTANTS.TYPES.ERROR:
            buf = frame.getErrorFrame(f);
            break;
        case CONSTANTS.TYPES.RESPONSE:
            buf = frame.getResponseFrame(f);
            break;
        default:
            return cb(new Error('type ' + f.type + ' not supported'));
    }

    self.push(buf);
    cb();
};
