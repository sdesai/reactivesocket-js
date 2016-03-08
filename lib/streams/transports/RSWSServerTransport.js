'use strict';

var EventEmitter = require('events');
var util = require('util');
var WebSocketServer = require('ws').Server;

var logger = require('./../../defaultLogger');
var WSStream = require('./WSStream');

/**
 * The server transports attempts to create a tcp server on localhost:port
 * @param {object} opts - The connection parameters and logger of the client.
 * @param {number} opts.port -
 * @param {string} opts.host -
 * @param {bunyan.Logger} opts.logger -
 * @returns {RSWSServerTransport}
 */
var RSWSServerTransport = function RSWSServerTransport(opts) {
    this._port = opts.port;
    this._host = opts.host;
    this._tcp = null;
    this._log = opts.logger || logger;
};

util.inherits(RSWSServerTransport, EventEmitter);

/**
 * The transport's interface attempts to establish a connection through
 * tcp.
 * @returns {undefined}
 */
RSWSServerTransport.prototype.establishConnection =
    function establishConnection() {
        if (this._server) {
            return;
        }

        // TODO: There is no error / closing actions currently programmed
        var self = this;
        var server = new WebSocketServer({host: this._host, port: this._port});
        this._server = server;

        // On a connection, emit socket and the unique Id that is the IP address
        // and the port combo.
        server.on('connection', function onWSConnection(ws) {

            // TODO: What are we going to do for the unique id?
            var id = ws.remoteAddress + ':' + ws.remotePort;
            self.emit('connection', new WSStream(ws), id);
        });
    };

/**
 * A placeholder for closing down the transport.
 * @param {function} cb -
 * @returns {undefined}
 */
RSWSServerTransport.prototype.close = function closeWSServer(cb) {
    if (this._server) {
        this._server.close();
    }
};

module.exports = RSWSServerTransport;
