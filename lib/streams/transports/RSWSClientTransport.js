'use strict';

var Duplex = require('stream').Duplex;
var WebSocket = require('ws');
var util = require('util');
var logger = require('./../../defaultLogger');
var WSStream = require('./WSStream');

/**
 * The client transports attempts to make a socket connection to a host:port.
 * @param {object} opts - The connection parameters and logger of the client.
 * @param {string} opts.host -
 * @param {bunyan.Logger} opts.logger -
 * @returns {RSWSClientTransport}
 */
var RSWSClientTransport = function RSWSClientTransport(opts) {
    Duplex.call(this);

    this._host = opts.host;
    this._pendingConnection = false;
    this._connection = null;
    this._stream = null;
    this._log = opts.logger || logger;
};

util.inherits(RSWSClientTransport, Duplex);

/**
 * The transport's interface attempts to establish a connection through
 * tcp.
 * @returns {undefined}
 */
RSWSClientTransport.prototype.establishConnection =
    function establishConnection() {
        var self = this;
        // There is a pending connection request or there a connection.
        if (this._pendingRequests || this._connection !== null) {
            return;
        }

        // Establish a connection through the net library.
        this._pendingRequests = true;
        this._connection = new WebSocket(this._host);
        this._connection.on('open', function createConnectionCompleted(err) {

            // TODO: We need to come up with an error case.
            if (err) {
                self._log.error('Error when creating connection', {
                    err: err,
                    host: self._host
                });
                return;
            }

            // We are no longer pending, now its time to emit the new connection
            // to those that are listening.
            self._pendingRequests = false;
            self._stream = new WSStream(self._connection);
            self.emit('connection', self._stream);
        });
    };

/**
 * Closes the client connection.
 * @returns {undefined}
 */
RSWSClientTransport.prototype.close = function close() {
    if (this._connection) {
        this._stream.close();
    }
};

module.exports = RSWSClientTransport;
