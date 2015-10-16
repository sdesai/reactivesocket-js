'use strict';

var Duplex = require('stream').Duplex;

var assert = require('assert-plus');
var bunyan = require('bunyan');

function ReactiveSocket(opts, cb) {
    assert.object(opts, 'opts');
    assert.optionalObject(opts.log, 'opts.log');
    assert.object(opts.transport, 'opts.transport');

    if (opts.log) {
        this._log = opts.log.child({
            component: 'ReactiveSocket'
        });
    } else {
        this._log = bunyan.createLogger({
            name: 'ReactiveSocket',
            level: 'info'
        });
    }

    this._transport = opts.transport;

    this._streamMap = {};
}

module.exports = ReactiveSocket;

ReactiveSocket.prototype.subscribe = function subscribe(payload) {
    var self = this;
    self._log.debug({payload: payload}, 'ReactiveSocket.subscribe: entering');
};
