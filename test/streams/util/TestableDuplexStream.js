'use strict';

var Duplex = require('stream').Duplex;
var util = require('util');

var sinon = require('sinon');

var Frame = require('./../../../lib/protocol/frame');

/**
 * @constructor
 * @private
 * @param {Object} options -
 * @returns {TestableDuplexStream} -
 */
function TestableDuplexStream(options) {
    this._onWrite = sinon.spy();
    this._onRead = sinon.spy();
    this._options = options || {};

    Duplex.call(this);
}

util.inherits(TestableDuplexStream, Duplex);

TestableDuplexStream.prototype.setDelay = function(delay) {
    this._options.wait = delay;
};

TestableDuplexStream.prototype._write = function(buffer, encoding, cb) {
    var frame = Frame.parseFrame(buffer);
    var res = this._onWrite.call(null, buffer, frame);

    // If there is a result then we either push it sync or async.
    // The callback is called back in three places because I want it
    // to happen before a this.push happens.
    if (res) {
        if (this._options.wait) {
            var self = this;
            var timeToWait = this._options.wait;

            setTimeout(function() {
                self.push(res);
            }, timeToWait);
        } else {
            this.push(res);
        }
    }

    // This says that we are ready for another frame.  If we don't do this, but
    // wait until we are completed with the frame, we will only process one at a
    // time.
    cb();
};

TestableDuplexStream.prototype._read = function() {
    if (this._onRead) {
        this._onRead.apply(null, arguments);
    }
};

TestableDuplexStream.prototype.getWriteSpy = function getWriteSpy() {
    return this._onWrite;
};

TestableDuplexStream.prototype.getReadSpy = function getReadSpy() {
    return this._onRead;
};

TestableDuplexStream.prototype.setWrite = function setWrite(onWrite) {
    this._onWrite = sinon.spy(onWrite);
    return this._onWrite;
};

module.exports = TestableDuplexStream;
