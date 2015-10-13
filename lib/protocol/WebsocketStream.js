'use strict';

var Duplex = require('stream').Duplex;
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var WebSocket = require('ws');

function WebsocketStream(opts, cb) {
    assert.object(opts, 'opts');
    assert.string(opts.url, 'opts.url');
    assert.optionalObject(opts.wsOpts, 'opts.wsOpts');
    assert.optionalObject(opts.log, 'opts.log');

    Duplex.call(this, opts);
    var self = this;

    if (opts.log) {
        this._log = opts.log.child({
            component: 'WebsocketStream'
        });
    } else {
        this._log = bunyan.createLogger({
            name: 'WebsocketStream',
            level: 'info'
        });
    }

    this._websocket = new WebSocket(opts.url, opts.wsOpts);
    this._buffers = [];

    self._websocket.on('open', function () {
        self._log.info('websocket connection established');
        self.emit('connect');
        return cb();
    });

    self._websocket.on('message', function (data, flags) {
        self._log.debug({data: data, flags: flags}, 'got message from ws');
        self.push(data);
    });

    self._websocket.once('close', function (code, message) {
        self._log.info('websocket connection closed');
        // flush all outstanding buffers first.
        self._log.debug({buffers: self._buffers}, 'flushing remaining buffers');
        self._buffers.forEach(function (buf) {
            self.push(buf);
        });
        self.push(null);
    });

    self._websocket.on('error', function (err) {
        self._log.error({err: err}, 'ws error');
        self.emit('error', err);
    });
}
util.inherits(WebsocketStream, Duplex);

module.exports = WebsocketStream;

WebsocketStream.prototype._read = function _read(n) {
    // we ignore n because WS frames the data for us -- we don't actually wan't
    // to fragment.
};

WebsocketStream.prototype._write = function _write(chunk, encoding, cb) {
    var self = this;

    self._log.debug({chunk: chunk}, 'WebsocketStream._write: entering');

    self._websocket.send(chunk, {binary: true}, function (err) {
        self._log.debug({err: err}, 'WebsocketStream._write: exiting');
        return cb(err);
    });
};
