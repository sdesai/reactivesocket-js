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

    if (!opts) {
        opts = {};
    }
    assert.optionalObject(opts.log, 'opts,log');
    assert.optionalObject(opts.log, 'opts.log');
    assert.optionalString(opts.dataEncoding, 'opts.dataEncoding');
    assert.optionalString(opts.metadataEncoding, 'opts.metadataEncoding');

    this._dataEncoding = opts.dataEncoding;
    this._metadataEncoding = opts.metadataEncoding;
    this._log = null;

    if (opts.log) {
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
    var frame = parseFrame(chunk, self._dataEncoding, self._metadataEncoding);
    self._log.debug({buffer: chunk, frame: frame},
                    'ParseStream._transform: parsed frame');
    self.push(frame);
    return cb();
};

ParseStream.prototype.setEncoding = function setEncoding(dataEncoding,
                                                             metadataEncoding) {
    var self = this;
    assert.string(dataEncoding, 'dataEncoding');
    assert.string(metadataEncoding, 'metadataEncoding');

    if (!self._dataEncoding) {
        this._dataEncoding = dataEncoding;
    }

    if (!self._metadataEncoding) {
        this._metadataEncoding = metadataEncoding;
    }
};
