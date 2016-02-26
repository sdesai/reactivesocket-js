'use strict';

var EventEmitter = require('events');
var net = require('net');
var util = require('util');

var logger = require('./../../defaultLogger');
var RSFramingStream = require('./RSFramingStream');

/**
 * The client transports attempts to make a socket connection to a host:port.
 * @param {object} opts - The connection parameters and logger of the client.
 * @param {number} opts.port -
 * @param {string} opts.host -
 * @param {bunyan.Logger} opts.logger -
 * @returns {RSTCPClientTransport}
 */
var RSTCPClientTransport = function RSTCPClientTransport(opts) {
    EventEmitter.call(this);

    this._port = opts.port;
    this._host = opts.host;
    this._pendingConnection = false;
    this._connection = null;
    this._stream = null;
    this._log = opts.logger || logger;
};

util.inherits(RSTCPClientTransport, EventEmitter);

/**
 * The transport's interface attempts to establish a connection through
 * tcp.
 * @returns {undefined}
 */
RSTCPClientTransport.prototype.establishConnection =
    function establishConnection() {
        // There is a pending connection request or there a connection.
        if (this._pendingRequests || this._connection !== null) {
            return;
        }

        // Establish a connection through the net library.
        var self = this;
        this._pendingRequests = true;
        this._connection = net.createConnection({
            port: this._port,
            host: this._host
        }, function createConnectionCompleted(err) {

            // TODO: We need to come up with an error case.
            if (err) {
                self._log.error('Error when creating connection', {
                    error: err,
                    port: self._port,
                    host: self._host
                });
                return;
            }

            // Creates the stream that will accumulate each frame and emit
            // data per completed frame.
            self._stream = new RSFramingStream(self._connection, 'client');

            // We are no longer pending, now its time to emit the new connection
            // to those that are listening.
            self._pendingRequests = false;
            self.emit('connection', self._stream);
        });
    };

/**
 * Closes the client connection.
 * @returns {undefined}
 */
RSTCPClientTransport.prototype.close = function close() {
    if (this._connection) {
        this._connection.destroy();
        this._connection = null;
    }
};

module.exports = RSTCPClientTransport;
