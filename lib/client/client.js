'use strict';

var EventEmitter = require('events');

var _ = require('lodash');
var assert = require('assert');
var bunyan = require('bunyan');
var vasync = require('vasync');

var Websocket = require('ws');

var ParseStream = require('../streams/parseStream');
var SerializeStream = require('../streams/serializeStream');
var WebsocketStream = require('../streams/transports/WSStream');

var CONSTANTS = require('../protocol/constants');
var FLAGS = CONSTANTS.FLAGS;
var ERROR_CODES = CONSTANTS.ERROR_CODES;
var TYPES = CONSTANTS.TYPES;

function Client(opts) {
    EventEmitter.call(this);
    assert.object(opts, 'opts');
    assert.optionalObject(opts.log, 'opts.log');
    assert.object(opts.transport, 'opts.transport');
    assert.optionalObject(opts.transport.stream, 'opts.transport.stream');
    // must either have a protocol or a stream
    if (!opts.transport.stream) {
        assert.object(opts.transport.protocol, 'opts.transport.protocol');
    }
    assert.optionalNumber(opts.keepalive, 'opts.keepalive');
    assert.optionalNumber(opts.maxLifetime, 'opts.maxLifetime');
    assert.optionalString(opts.metadataEncoding, 'opts.metadataEncoding');
    assert.optionalString(opts.dataEncoding, 'opts.dataEncoding');
    assert.optionalString(opts.setupMetadata, 'opts.setupMetadata');
    assert.optionalString(opts.setupData, 'opts.setupData');
    assert.optionalBool(opts.lease, 'opts.lease');
    assert.optionalBool(opts.strict, 'opts.strict');

    var self = this;

    this._log = null;

    if (opts.log) {
        this._log = opts.log.child({
            component: 'rs-client'
        });
    } else {
        this._log = bunyan.createLogger({
            name: 'rs-client',
            level: process.env.LOG_LEVEL || bunyan.ERROR,
            serializers: bunyan.stdSerializers
        });
    }

    self._log.debug({opts: opts}, 'rs-client: new');

    this._keepalive = opts.keepalive || 1 * 1000;
    // TODO: we don't use this today
    this._maxLifetime = opts.maxLifetime || 10 * 1000;
    // TODO: right now we just assume node can handle whatever encoding you
    // pass in. Need someway to plugin a encoding engine
    this._metadataEncoding = opts.metadataEncoding || 'utf-8';
    this._dataEncoding = opts.dataEncoding || 'utf-8';
    // maps a streamId from the server to a client interaction.
    this._streams = [];
    this._sStream = new SerializeStream({log: self._log});
    this._pStream = new ParseStream({log: self._log});
    this._transportStream = null;

    self._pStream.on('error', function error(err) {
        self.emit('error', err);
    });
    self._sStream.on('error', function error(err) {
        self.emit('error', err);
    });

    // we only need to listen for the serialize stream -- since both p and s
    // streams are piped to the transport stream. If the transport ends, they
    // all emit end.
    self._sStream.on('end', function end() {
        self.emit('end');
    });

    self._pStream.on('data', function read(frame) {
        self._log.trace({frame: frame}, 'rsClient.gotFrame');
        switch (frame.header.type) {
            case TYPES.ERROR:
                self._error(frame);
                break;
            case TYPES.RESPONSE:
                self._response(frame);
                break;
            case TYPES.LEASE:
            case TYPES.KEEPALIVE:
            case TYPES.REQUEST_RESPONSE:
            case TYPES.REQUEST_FNF:
            case TYPES.REQUEST_STREAM:
            case TYPES.REQUEST_SUB:
            case TYPES.REQUEST_CHANNEL:
            case TYPES.REQUEST_N:
            case TYPES.CANCEL:
            case TYPES.METADATA_PUSH:
            case TYPES.NEXT:
            case TYPES.COMPLETE:
            case TYPES.NEXT_COMPLETE:
            case TYPES.EXT:
            default:
                self.emit('error',
                          new Error(frame.header.type +
                                    ' frame not supported'));
                break;
        }
    });

    vasync.pipeline({funcs: [
        function createTransportStream(__, cb) {
            if (opts.stream) {
                this._transportStream = opts.stream;
            } else {
                switch (opts.transport.protocol.type) {
                    case 'ws':
                        var wsClient = new Websocket(opts);
                        wsClient.on('open', function open() {
                            opts.ws = wsClient;
                            this._transportStream = new WebsocketStream(opts);

                            cb();
                        });
                    break;
                    default:
                        cb(new Error(opts.transport.process.type +
                                        ' transport not supported'));
                        break;
                }
            }
        },
        function pipeStreams(__, cb) {
            self._sStream.pipe(self._transportStream);
            self._transportStream.pipe(self._pStream);
            return cb();
        },
        function setupFrame(__, cb) {
            var flags = CONSTANTS.FLAGS.NONE;
            if (opts.lease) {
                flags |= CONSTANTS.FLAGS.LEASE;
            }
            if (opts.strict) {
                flags |= CONSTANTS.FLAGS.STRICT
            }
            self._sStream.write({
                type: CONSTANTS.TYPE.SETUP,
                flags: flags,
                keepalive: self._keepalive,
                maxLifetime: self._maxLifetime,
                version: CONSTANTS.VERSION,
                metadataEncoding: self._metadataEncoding,
                dataEncoding: self._dataEncoding,
                metadata: opts.setupMetadata,
                data: opts.setupData
            }, function (err) {
                return cb(err);
            });
        }
    ], args: {}}, function cb(err, results) {
        if (err) {
            self.emit('error', err);
        }
        self.emit('ready');
    });
}

module.exports = Client;

Client.prototype.request = function request(req) {
    var self = this;
    var stream = self._getNewStream();
    var frame = {
        flags: req.follows ? FLAGS.FOLLOWS : FLAGS.NONE,
        data: req.data,
        metadata: req.metadata,
        streawmId: stream.id
    };

    self._sStream.write(frame);

    return stream.eventEmitter;
};


// Frame handlers


Client.prototype._response = function _response(frame) {
    var self = this;
    // look up the streamId in the table
    var stream = self._getStream(frame.header.streamId);
    if (!stream) {
        // Crash here? Not sure since it could be the server misbehaving
        self._log.error({frame: frame}, 'got frame with unknown streamId');
        return;
    }
    var response = {};
    // decode strings
    _.assign(response, self._parsePayload(frame));
    // follows
    if (frame.header.flags && FLAGS.FOLLOWS) {
        response.follows = true;
    }
    // fire the response or error back out via the event emitter
    stream.emit('response', response);
};

Client.prototype._error = function _error(frame) {
    var self = this;
    switch (frame.errorCode) {
        case ERROR_CODES.INVALID_SETUP:
        case ERROR_CODES.UNSUPPORTED_SETUP:
        case ERROR_CODES.REJECTED_SETUP:
            // TODO: formalize and first class errors
            self.emit('error', new Error('setup failed w/ code ' +
                                         frame.errorCode));
            break;
        case ERROR_CODES.CONNECTION_ERROR:
        case ERROR_CODES.APPLICATION_ERROR:
        case ERROR_CODES.REJECTED:
        case ERROR_CODES.CANCELED:
        case ERROR_CODES.INVALID:
        case ERROR_CODES.RESERVED:
        default:
            self.emit('error', new Error('error code: ' + frame.errorCode));
            break;
    }
};


// Privates


Client.prototype._getNewStream = function _getNewStream() {
    var self = this;
    var stream = {
        id: _.last(self._streams)+2,
        eventEmitter: new EventEmitter()
    }

    self._streams.push(stream);

    return stream;
}

Client.prototype._getStream = function _getStream(id) {
    var self = this;
    // IDs increment by two, but we store them continuously in the array.
    return self._streams[id/2];
}

Client.prototype._parsePayload = function _parsePayload(frame) {
    var self = this;
    var payload = {};
    if (frame.data) {
        payload.data = frame.data.toString(self._dataEncoding);
    }
    if (frame.metadata) {
        payload.metadata = frame.metadata.toString(self._metadataEncoding);
    }

    return payload;
}
