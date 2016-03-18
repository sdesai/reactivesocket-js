'use strict';

var util = require('util');

var EventEmitter = require('events');

var Frame = require('./../protocol/frame');
var LOG = require('./../defaultLogger');

var KEEP_ALIVE_INTERVAL = 10000;
var MAX_LIFE = 100000;
var PAYLOAD_ENCODING = 'UTF-8';
var STREAM_ID = 0;

/**
 * @constructor
 * @param {Transport} transport - should emit an 'connection' event once
 * the connection is ready to use and a stream is passed into the connection
 * event.
 * @param {Object} setupOptions - the option bag for the setup frame operation
 * upon successful connection.
 * @returns {ReactiveClient}
 */
function ReactiveClient(transport, setupOptions) {
    var self = this;

    this._stream = null;
    this._transport = transport;
    this._pendingRequests = [];
    this._ready = false;
    this._log = LOG;
    this._processed = {};

    var opts = setupOptions || {};
    opts.keepAliveInterval = opts.keepAliveInterval || KEEP_ALIVE_INTERVAL;
    opts.maxLife = opts.maxLife || MAX_LIFE;
    opts.payloadEncoding = opts.payloadEncoding || {
        data: PAYLOAD_ENCODING,
        metadata: PAYLOAD_ENCODING
    };

    // There should only ever be one connection.  When a close event happens
    // the previous stream should be closed down.
    self._transport.on('connection', function (stream) {
        self._log.info('XXX client connected');
        self._stream = stream;
        self._conEstablished(opts);
        self.emit('connection');
    });
}
util.inherits(ReactiveClient, EventEmitter);

/**
 * When the connection i established, we need to process the back log of
 * items that have been requested.
 *
 * @private
 * @param {Object} opts - the setup options for the connection.
 * @returns {undefined}
 */
ReactiveClient.prototype._conEstablished = function _conEstablished(opts) {
    var self = this;
    var setupFrame = Frame.getSetupFrame(opts.keepAliveInterval, opts.maxLife,
                                           opts.payloadEncoding, opts.payload);
    self._log.info('ReactiveClient._conEstablished: entering');
    self._ready = true;

    // A setup frame is required upon connection as the *first* frame sent.  If
    // this frame is not sent first and another frame is sent, then the server
    // shuts down the connection.
    self._stream.write(setupFrame, function onSetupFrameCallback(err) {
        //self._log.info({err: err, setupFrame: setupFrame},
        //'writing setupFrame');
        // Here is a huge issue...
        if (err) {
            return;
        }

        // Flushes the pending requests.
        var requests = self._pendingRequests;
        self._pendingRequests = [];
        requests.forEach(function forEachPendingRequest(requestTuple) {
            self._log.info({requestTuple: requestTuple}, 'flushing requests');
            var data = requestTuple[0];
            var callback = requestTuple[1];

            self.requestResponse(data, callback);
        });
    });

    self._stream.on('data', function onDataClient(rawData) {
        var parsedData = Frame.parseFrame(rawData);
        var id = parsedData.header.streamId;
        var callback = self._processed[id];

        self._log.info({
            parsedData: parsedData.payload.data.toString('utf8'),
            id: id
        }, 'got frame');

        // The callback will get the parsed data and the processed id will be
        // removed from the collection.  If it is not removed from the
        // collection then there will be a performance and memory issue over
        // time.
        if (callback) {
            delete self._processed[id];
            callback(null, parsedData);
        }
    });

    self._stream.on('error', function onErrorClient(err) {
        self._log({err: err}, 'ReactiveClient');
    });
};

/**
 * Takes in a payload that will be encoded and sent to the underlying stream.
 * @param {Object} data -
 * @param {string|Buffer} data.data - The data to be sent
 * @param {string|Buffer} data.metadata - The meta to be sent
 * @param {Function} [callback] -
 * @returns {undefined} -
 */
ReactiveClient.prototype.requestResponse = function requestResponse(data,
                                                                    callback) {
    var self = this;

    // Obviously a dumb way to do things.
    if (this._ready) {
        var streamId = getNextId();
        var reqRes = Frame.getReqResFrame(streamId, data);

        this._processed[streamId] = callback;
        this._stream.write(reqRes, PAYLOAD_ENCODING, function (err) {
            self._log.info({err: err}, 'back from reqRes');
            // TODO: this is an issue.
            if (err) {
                delete self._processed[streamId];
                return callback(err);
            }
        });
    }

    // We need to establish a connection then start sending the packets.
    // TODO: this doesn't work if you encode more than 1 request since
    // connection establishment is async. You may end up trying to establish 6
    // connections at once
    this._pendingRequests.push([data, callback]);
    this.establishConnection();
};

/**
 * @private
 * @param {String} msg -
 * @param {Buffer} frame -
 * @param {Error} err -
 * @returns {undefined}
 */
ReactiveClient.prototype._logError = function logError(msg, frame, err) {
    this._log.error('Error on writing request-response frame.', {
        error: err,
        frame: frame,
        streamId: this._streamId
    });
};

/**
 * Will call establish connection on the underlying transport protocol.
 * When the connection finishes, it does not matter.  So this just allows the
 * outside to dictate when the connection has been established.
 *
 * @public
 * @returns {undefined}
 */
ReactiveClient.prototype.establishConnection = function establishConnection() {
    if (!this._ready) {
        this._transport.establishConnection();
    }
};

/**
 * closes the single connection client.
 * @returns {undefined}
 */
ReactiveClient.prototype.close = function close() {
    this._stream.close();
    this._stream.unpipe();

    if (this._transport.destroy) {
        this._transport.destroy();
    }
    else if (this._transport.close) {
        this._transport.close();
    }

    this._transport = null;
};

function getNextId() {
    STREAM_ID += 2;
    return STREAM_ID;
}

module.exports = ReactiveClient;
