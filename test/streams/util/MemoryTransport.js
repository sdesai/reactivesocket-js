'use strict';

var EventEmitter = require('events');
var TestableDuplexStream = require('./TestableDuplexStream');
var util = require('util');

var uniqueId = 0;

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

    this._streams = [new TestableDuplexStream()];
    this._streamsIdx = -1;
}

util.inherits(MemoryTransport, EventEmitter);

/**
 * will simply fire off the connection event sync or async.
 * @returns {undefined}
 */
MemoryTransport.prototype.establishConnection = function establishConnection() {
    var streamIdx = ++this._streamsIdx;
    var stream = this._streams[streamIdx];

    if (this._delay) {
        var self = this;

        setTimeout(function() {
            self.emit('est-con');
            self.emit('connection', stream, ++uniqueId);
        }, this._delay);
    }

    else {
        this.emit('est-con');
        this.emit('connection', stream);
    }
};

MemoryTransport.prototype.setDelayOnConnection =
    function setDelayOnConnection(delay) {
        this._delay = delay;
    };


MemoryTransport.prototype.pushStream = function pushStream(stream) {
    this._streams.push(stream);
};

/**
 * Gets the latest stream.  The reason why its the latest is that the client
 * will only ever have one stream, where the server may have multiple streams.
 *
 * @returns {Duplex} the current stream from a connection.
 */
MemoryTransport.prototype.getLatestStream = function getCurrentStream() {
    return this._streams[this._streamsIdx];
};

MemoryTransport.prototype.getNextStream = function getNextStream() {
    return this._streams[this._streamsIdx + 1];
};

module.exports = MemoryTransport;
