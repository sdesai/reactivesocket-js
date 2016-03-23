'use strict';

var Duplex = require('stream').Duplex;
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');

/**
 * @param {Object} opts - The options object.
 * @param {Object} opts.ws - The websocket.
 * @param {Object} [bunyan=log] - The Bunyan logger.
 *
 * @constructor
 */
var WSStream = function WSStream(opts) {
    Duplex.call(this);

    assert.object(opts, 'opts');
    assert.object(opts.ws, 'opts.ws');
    assert.optionalObject(opts.log, 'opts.log');

    var self = this;

    if (opts.log) {
        this._log = opts.log.child({
            component: 'ws-stream'
        });
    } else {
        this._log = bunyan.createLogger({
            name: 'ws-stream',
            level: bunyan.INFO,
            serializers: bunyan.stdSerializers
        });
    }

    this._ws = opts.ws;

    this._closed = false;

    self._ws.on('close', function onClose() {
        self._log.info('WSStream: stream closed');
        self.emit('close');
        self._closed = true;
    });

    self._ws.on('error', function onError(err) {
        self._log.error({err: err}, 'WSStream: got error');
        self._emit('error', err);
    });

    // check highwater mark to pause if we exceed it
    self._ws.on('message', function incoming(msg) {
        self._log.debug({msg: msg}, 'WSStream: got msg');

        if (!self.push(msg)) {
            self._ws.pause();
        }
    });
};
util.inherits(WSStream, Duplex);

module.exports = WSStream;

WSStream.prototype._write = function _write(data, enc, cb) {
    var self = this;

    self._ws.send(data, null, cb);
};

WSStream.prototype._read = function _read() {
    var self = this;
    self._ws.resume();
    //self._push('');
};
