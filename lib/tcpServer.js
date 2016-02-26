'use strict';

var ReactiveServer = require('./streams/ReactiveServer');
var RSTCPServerTransport = require('./streams/transports/RSTCPServerTransport');

/**
 * @param {object} opts -
 * @param {number} opts.port -
 * @param {string} opts.host -
 * @param {bunyan.Logger} logger -
 * @returns {ReactiveServer}
 */
module.exports = function tcpServer(opts, logger) {
    var transport = new RSTCPServerTransport(opts, logger);
    return new ReactiveServer(transport, logger);
};
