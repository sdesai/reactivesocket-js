'use strict';

var EventEmitter = require('events');
var net = require('net');
var util = require('util');

var logger = require('./../../defaultLogger');
var RSFramingStream = require('./RSFramingStream');

/**
 * The server transports attempts to create a tcp server on localhost:port
 * @param {object} opts - The connection parameters and logger of the client.
 * @param {number} opts.port -
 * @param {string} opts.host -
 * @param {bunyan.Logger} opts.logger -
 * @returns {RSTCPServerTransport}
 */
var RSTCPServerTransport = function RSTCPServerTransport(opts) {
    this._port = opts.port;
    this._host = opts.host;
    this._tcp = null;
    this._log = opts.logger || logger;
};

util.inherits(RSTCPServerTransport, EventEmitter);

/**
 * The transport's interface attempts to establish a connection through
 * tcp.
 * @returns {undefined}
 */
RSTCPServerTransport.prototype.establishConnection =
    function establishConnection() {
        if (this._tcpServer) {
            return;
        }

        // TODO: There is no error / closing actions currently programmed
        var self = this;
        var server = this._tcpServer = net.createServer();

        // On a connection, emit socket and the unique Id that is the IP address
        // and the port combo.
        server.on('connection', function onTCPConnection(socket) {
            var id = socket.remoteAddress + ':' + socket.remotePort;
            self.emit('connection', new RSFramingStream(socket, 'server'), id);
        });

        server.listen({port: this._port, host: this._host});
    };

/**
 * A placeholder for closing down the transport.
 * @param {function} cb -
 * @returns {undefined}
 */
RSTCPServerTransport.prototype.close = function closeTCPServer(cb) {
    this._tcpServer.close(cb);
    this._tcpServer = null;
};

module.exports = RSTCPServerTransport;
