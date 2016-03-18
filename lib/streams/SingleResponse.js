'use strict';

/**
 * @constructor
 * @param {ReactiveServer} server -
 * @param {Duplex} stream -
 * @param {Number} streamId -
 * @returns {undefined}
 */
var SingleResponse = function SingleResponse(server, stream, streamId) {
    this._server = server;
    this._stream = stream;
    this._streamId = streamId;
    this._hasResponded = false;
};

module.exports = SingleResponse;

/**
 * Respond to the previous request
 * @param {String|Buffer} data -
 * @param {String|Buffer} metadata -
 * @returns {undefined}
 */
SingleResponse.prototype.respond = function respond(data, metadata) {
    if (this._hasResponded) {
        throw new Error('Cannot respond to a request twice.');
    }

    if (typeof data === 'string') {
        data = new Buffer(data);
    }

    if (typeof metadata === 'string') {
        metadata = new Buffer(metadata);
    }

    this._hasResponded = true;
    this._server._respond(this._stream, this._streamId, {
        data: data,
        metadata: metadata
    }, true);
};
