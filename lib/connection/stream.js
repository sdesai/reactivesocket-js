'use strict';

var util = require('util');

var EventEmitter = require('events');

var _ = require('lodash');
var assert = require('assert-plus');
var bunyan = require('bunyan');

var CONSTANTS = require('../protocol/constants');
var FLAGS = CONSTANTS.FLAGS;
var ERROR_CODES = CONSTANTS.ERROR_CODES;

/**
 * @param {Object} opts -
 * @param {Object} opts.connection The RS Connection.
 * @param {Object} [opts.log=bunyan] The Bunyan logger.
 * @param {number} opts.id The id of this stream.
 * @constructor
 */
function Stream(opts) {
    EventEmitter.call(this);
    assert.object(opts, 'opts');
    assert.object(opts.connection, 'opts.connection');
    assert.optionalObject(opts.log, 'opts.log');
    assert.number(opts.id, 'opts.id');

    this._connection = opts.connection;
    this._id = opts.id;
    this._log = null;

    this._data = {
        response: {},
        responseN: {},
        request: {},
        error: {}
    };

    if (opts.log) {
        this._log = opts.log.child({
            component: 'stream',
            level: process.env.LOG_LEVEL || bunyan.WARN
        });
    } else {
        this._log = bunyan.createLogger({
            name: 'stream',
            level: process.env.LOG_LEVEL || bunyan.WARN,
            serializers: bunyan.stdSerializers
        });
    }
}
util.inherits(Stream, EventEmitter);

module.exports = Stream;

Stream.prototype.setResponse = function setResponse(frame) {
    var self = this;
    var response = self._data.response;

    if (!response) {
        response = {};
    }

    if (response.data) {
        response.data += frame.data;
    } else {
        response.data = frame.data;
    }

    if (response.metadata) {
        response.metadata += frame.metadata;
    } else {
        response.metadata = frame.metadata;
    }

    if (frame.header.flags & FLAGS.FOLLOWS) {
        self._log.debug({frame: frame},
                        'Stream.setResponse: got only partial frame');
        response.follows = true;
    } else {
        // if we get a response, it means we sent a request -- emit the event
        // on the request EventEmitter.
        self.emit('response', self);
    }
};

Stream.prototype.setRequest = function setRequest(frame) {
    var self = this;

    var request = self._data.request;

    if (!request) {
        request = {};
    }

    if (request.data) {
        request.data += frame.data;
    } else {
        request.data = frame.data;
    }

    if (request.metadata) {
        request.metadata += frame.metadata;
    } else {
        request.metadata = frame.metadata;
    }

    if (frame.header.flags & FLAGS.FOLLOWS) {
        self._log.debug({frame: frame},
                        'Connection._reqRes: got only partial frame');
        request.follows = true;
    } else {
        // connection EventEmitter because an inbound reqres means we have to
        // handle it programatically from the connection.
        self._connection.emit('request', self);
    }
};

Stream.prototype.setError = function setError(frame) {
    var self = this;

    var error = _.pick(frame, 'errorCode', 'metadata', 'data');
    self._data.error = error;

    // TODO: formalize and first class errors as Error() objects
    switch (frame.errorCode) {
        case ERROR_CODES.INVALID_SETUP:
        case ERROR_CODES.UNSUPPORTED_SETUP:
        case ERROR_CODES.REJECTED_SETUP:
            // Setup errors are scoped to the connection, so we just emit off
            // the connection error emitter
            if (self._connection.listenerCount('setup-error') === 0) {
                self._connection.emit('error', error);
            }
            self._connection.emit('setup-error', error);
            self.emit('setup-error', error);
            break;
        case ERROR_CODES.CONNECTION_ERROR:
            // Connection errors are global to the stream, so we just emit off
            // the global error emitter
            if (self._connection.listenerCount('connection-error') === 0) {
                self._connection.emit('error', error);
            }
            self._connection.emit('connection-error', error);
            self.emit('connection-error', error);
            break;
        case ERROR_CODES.APPLICATION_ERROR:
            self.emit('application-error', error);
            break;
        case ERROR_CODES.REJECTED:
            self.emit('rejected-error', error);
            break;
        case ERROR_CODES.CANCELED:
            self.emit('cancelled-error', error);
            break;
        case ERROR_CODES.INVALID:
            self.emit('invalid-error', error);
            break;
        case ERROR_CODES.RESERVED:
            self.emit('reserved-error', error);
            break;
        default:
            self.emit('error', error);
            break;
    }
};

Stream.prototype.response = function response(res) {
    var self = this;

    res.streamId = self._id;
    self._connection.response(res);
};

Stream.prototype.error = function error(err) {
    var self = this;

    err.streamId = self._id;
    self._connection.error(err);
};

Stream.prototype.getId = function getId() {
    var self = this;
    return self._id;
};

Stream.prototype.getRequest = function getRequest() {
    var self = this;
    return self._data.request;
};

Stream.prototype.getResponse = function getResponse() {
    var self = this;
    return self._data.response;
};

Stream.prototype.getError = function getError() {
    var self = this;
    return self._data.error;
};
