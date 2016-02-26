'use strict';

var ReactiveClient = require('./streams/ReactiveClient');
var RSTCPClientTransport = require('./streams/transports/RSTCPClientTransport');

/**
 * @param {object} opts -
 * @param {number} opts.port -
 * @param {string} opts.host -
 * @param {bunyan.Logger} logger -
 * @returns {ReactiveClient}
 */
module.exports = function tcpClient(opts, logger) {
    var transport = new RSTCPClientTransport(opts, logger);
    return new ReactiveClient(transport, logger);
};
