'use strict';

var EventEmitter = require('events');
var util = require('util');

/**
 * Going to allow for being the bridge between to socket connections.
 *
 * TODO: Currently there is no way to have it use two streams to talk
 * to each other while emitting the "connection" events to Reactive*s.
 * @augments Transport
 * @returns {MemoryTransport} -
 */
function MemoryTransport() {
    EventEmitter.call(this);

    this._stream = null;
}

util.inherits(MemoryTransport, EventEmitter);

/**
 * will simply fire off the connection event sync or async.
 * @returns {undefined}
 */
MemoryTransport.prototype.establishConnection = function establishConnection() {
    if (this._delay) {
        var self = this;
        setTimeout(function() {
            self.emit('connection', self._stream);
        }, this._delay);
    }

    else {
        this.emit('connection', this._stream);
    }
};

/**
 * @param {Duplex} stream -
 * @returns {undefined}
 */
MemoryTransport.prototype.setStream = function setStream(stream) {
    this._stream = stream;
};

MemoryTransport.prototype.setDelayOnConnection =
    function setDelayOnConnection(delay) {
        this._delay = delay;
    };

module.exports = MemoryTransport;
