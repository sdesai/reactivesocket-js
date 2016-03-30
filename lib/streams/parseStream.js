'use strict';

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');

var parseFrame = require('../protocol/frame/parseFrame');
/**
 * @constructor
 * @param {Object} opts -
 * @param {Object} [opts.log=log] -
 * Stream that transforms a framed stream of bytes into RS frames.
 */
function ParseStream(opts) {
    assert.optionalObject(opts, 'opts');
    if (opts) {
        assert.optionalObject(opts.log, 'opts,log');
    }

    this._log = null;

    if (opts && opts.log) {
        this._log = opts.log.child({
            component: 'ParseStream'
        });
    } else {
        this._log = bunyan.createLogger({
            name: 'ParseStream',
            level: bunyan.ERROR
        });
    }

    stream.Transform.call(this, {readableObjectMode: true});

}
util.inherits(ParseStream, stream.Transform);

module.exports = ParseStream;

ParseStream.prototype._transform = function _transform(chunk, enc, cb) {
    var self = this;
    // TODO: How do we pass in the encoding from the inital setup frame?
    // Optionsn could we we leave payloads as buffer and insert another
    // transform stream. Or keep state internal to this stream about the seetup
    var frame = parseFrame(chunk);
    self._log.debug({buffer: chunk, frame: frame},
                    'ParseStream._transform: parsed frame');
    self.push(frame);
    return cb();
};
