'use strict';

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');

var parseFrame = require('../protocol/frame/parseFrame');
/**
 * @constructor
 * @param {Object} opts -
 * Stream that transforms a framed stream of bytes into RS frames.
 */
function ParseStream(opts) {
    assert.optionalObject(opts, 'opts');

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
    self.push(frame);
    return cb();
};
