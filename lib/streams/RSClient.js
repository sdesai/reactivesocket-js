'use strict';

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');

var encodePayload = require('../protocol/frame/encodePayload');
var parseFrame = require('../protocol/frame/parseFrame');

/**
 * This duplex steram should take a stream of input, and return RS Frames. It
 * should also take a RS Frame, and send it off as a raw stream of output.
 * @constructor
 * @param {Object} opts
 * @param {Object} opts.log
 */
function RSStream(opts) {
    var self = this;
    assert.object(opts, 'opts');
    assert.object(opts.log, 'opts.log');

    this._log = log.child({
        component: 'WSRSClient'
    });
}
util.inherits(RSStream, stream.Duplex);

module.exports = RSStream;

RSStream.prototype._read = function _read(n) {
    var self = this;

};

RSStream.prototype._write = function _write(chunk, enc, cb) {
    var self = this;
};
