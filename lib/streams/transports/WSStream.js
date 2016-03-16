'use strict';

var Duplex = require('stream').Duplex;
var util = require('util');

var WSStream = function WSStream(ws) {
    Duplex.call(this);
    this._ws = ws;

    // TODO: should it transparently just push data through?
    var self = this;
    this._ws.on('message', function onMessage(message) {
        self.push(message);
    });

    // TODO: What do we do on close?
    this._ws.on('close', function onClose() {
        self._ws = null;
        self.emit('close');
    });
};
util.inherits(WSStream, Duplex);

module.exports = WSStream;

/**
 * @param {object|buffer} data -
 * @param {string} enc -
 * @param {function} cb -
 * @returns {undefined}
 */
WSStream.prototype._write = function _write(data, enc, cb) {
    // TODO: What happens when connection has been closed?  We should
    // probably do something about that.
    this._ws.send(data, cb);
};

WSStream.prototype._read = function _read() {
    // TODO: I don't think we do anything here?  All data should be pushed
    // through live like its 95.
};

/**
 * Closes the client connection.
 * @returns {undefined}
 */
WSStream.prototype.close = function close() {
    if (this._ws && this._ws.destroy) {
        console.log('destroy');
        this._ws.destroy();
        this._ws = null;
    }
    else if (this._ws && this._ws.close) {
        console.log('close');
        this._ws.close();
        this._ws = null;
    }
    else {
        console.log('neither');
    }
};

