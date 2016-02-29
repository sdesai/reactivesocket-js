'use strict';

var Duplex = require('stream').Duplex;
var util = require('util');

/**
 * @param {Duplex} connection -
 * @param {string} id - can be used for debuggability.  This will be logged if
 * available.
 * @returns {RSFramingStream}
 */
var RSFramingStream = function RSFramingStream(connection, id) {
    Duplex.call(this);
    this._connection = connection;
    this._id = id;
    this._partialFrame = null;

    // TODO_PERF: We need a ring buffer here.  We use push / shift
    // to push / pull data out of the array.  Shift running time is O(n)
    var self = this;
    function onConnectionData(data) {
        self._frameAndReportData(data);
    }
    function onClose() {
        var destroyed = false;
        if (self.destroy) {
            self.destroy();
            destroyed = true;
        }
        self._connection = null;
        self.close();

        connection.removeListener('data', onConnectionData);
        connection.removeListener('close', onClose);

        if (!destroyed) {
            self.emit('close');
        }
    }

    connection.on('data', onConnectionData);
    connection.on('close', onClose);
};

util.inherits(RSFramingStream, Duplex);

/**
 * Does the writing to the internal connection.
 * @param {buffer} data -
 * @param {string} encoding -
 * @param {function} cb -
 * @returns {undefined}
 */
RSFramingStream.prototype._write = function _writeStream(data, encoding, cb) {
    this._connection.write(data);
    cb();
};

/**
 * I don't think that we have an underlying read function.  I'll have to look
 * into this when we do back pressure.
 * @param {number} size -
 * @returns {undefined}
 */
RSFramingStream.prototype._read = function _readStream(size) {
    // TODO: I think there should be some form of back pressure here.
};

/**
 * will take in a buffer and frame it into a set of headers.
 * @param {buffer} data -
 * @returns {undefined}
 */
RSFramingStream.prototype._frameAndReportData =
    function frameAndReportData(data) {
        var remainingData = data;

        // To make this simple.  Take the partial frame and prepend it to the
        // incoming data.
        if (this._partialFrame) {
            remainingData = Buffer.concat([this._partialFrame, remainingData]);
            this._partialFrame = null;
        }

        do {
            var length = remainingData.readUInt32BE(0);
            var rLength = remainingData.length;

            // The partial frame. If there is more length than buffer, then
            // just save off the remaining buffer and process it on the next
            // data input.
            if (length > rLength) {
                this._partialFrame = remainingData;
                remainingData = new Buffer(0);
            }

            // The non-partial frame.  Slice off the remaining frame and append
            // it to the buffer
            else {
                var frame = remainingData.slice(0, length);
                this.push(frame);

                remainingData = remainingData.slice(length, rLength);
            }

        } while (remainingData.length);
    };


/**
 * The close function is invoked when destroy is called on a stream.
 * @returns {undefined}
 */
RSFramingStream.prototype.close = function close() {
    if (this._connection) {
        this._connection.unpipe(this);
        if (this._connection.destroy) {
            this._connection.destroy();
        }
        if (this._connection.close) {
            this._connection.close();
        }
    }
};

module.exports = RSFramingStream;
