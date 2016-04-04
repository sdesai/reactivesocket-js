'use strict';

var util = require('util');

var EventEmitter = require('events');

var assert = require('assert-plus');
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

/**
 * Connection
 *
 * @param {Object} opts Options object
 * @param {Ojbect} [opts.log=bunyan] Bunyan logger
 * @param {Object} [opts.transport.stream] Underlying transport stream
 * @param {Boolean} opts.type Type of connection, one of 'client' or 'server'
 * @returns {Connection}
 * @constructor
 * @emits
 */
function Connection(opts) {
    EventEmitter.call(this);
    assert.object(opts, 'opts');
    assert.optionalObject(opts.log, 'opts.log');
    assert.object(opts.transport, 'opts.transport');
    assert.string(opts.type, 'opts.type');

    if (opts.type !== 'client' && opts.type !== 'server') {
        throw new Error('Connection must be of type client or server');
    }
    assert.optionalObject(opts.transport.stream, 'opts.transport.stream');
    // must either have a protocol or a stream
    if (!opts.transport.stream) {
        assert.object(opts.transport.protocol, 'opts.transport.protocol');
    }
    assert.optionalBool(opts.lease, 'opts.lease');
    assert.optionalBool(opts.strict, 'opts.strict');

    // Client side specific settings
    assert.optionalNumber(opts.keepalive, 'opts.keepalive');
    assert.optionalNumber(opts.maxLifetime, 'opts.maxLifetime');
    // client must set encoding
    if (opts.type === 'client') {
        assert.string(opts.metadataEncoding, 'opts.metadataEncoding');
        assert.string(opts.dataEncoding, 'opts.dataEncoding');
    }
    assert.optionalString(opts.setupMetadata, 'opts.setupMetadata');
    assert.optionalString(opts.setupData, 'opts.setupData');

    var self = this;

    this._log = null;

    if (opts.log) {
        this._log = opts.log.child({
            component: 'connection',
            serializers: bunyan.stdSerializers,
            level: process.env.LOG_LEVEL || bunyan.WARN
        });
    } else {
        this._log = bunyan.createLogger({
            name: 'connection',
            level: process.env.LOG_LEVEL || bunyan.WARN,
            serializers: bunyan.stdSerializers
        });
    }

    self._log.debug({opts: opts}, 'rs-client: new');

    this._type = opts.type;
    this._isSetup = false;
    this._version = (self._type === 'client') ? CONSTANTS.VERSION : null;
    // TODO: setInterval when we have keepalive frames done
    this._keepalive = opts.keepalive || 1 * 1000;
    // TODO: we don't use this today
    this._maxLifetime = opts.maxLifetime || 10 * 1000;
    // TODO: right now we just assume node can handle whatever encoding you
    // pass in. Need someway to plugin an encoding engine
    this._metadataEncoding = opts.metadataEncoding;
    this._dataEncoding = opts.dataEncoding;
    // maps a streamId from the server to a client interaction.
    this._streams = {
        latest: 0
    };
    this._sStream = new SerializeStream({
        log: self._log,
        dataEncoding: self._dataEncoding,
        metadataEncoding: self._metadataEncoding
    });
    this._pStream = new ParseStream({
        log: self._log,
        dataEncoding: self._dataEncoding,
        metadataEncoding: self._metadataEncoding
    });
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
            case TYPES.REQUEST_RESPONSE:
                self._request(frame);
                break;
            case TYPES.SETUP:
                self._setup(frame);
                break;
            case TYPES.LEASE:
            case TYPES.KEEPALIVE:
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
            if (opts.transport.stream) {
                self._transportStream = opts.transport.stream;
                cb();
            } else {
                switch (opts.transport.protocol.type) {
                    case 'ws':
                        var wsClient = new Websocket(opts);
                        wsClient.on('open', function open() {
                            opts.ws = wsClient;
                            self._transportStream = new WebsocketStream(opts);

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
            if (self._type === 'server') {
                cb();
            } else {
                var flags = CONSTANTS.FLAGS.NONE;

                if (opts.lease) {
                    flags |= CONSTANTS.FLAGS.LEASE;
                }

                if (opts.strict) {
                    flags |= CONSTANTS.FLAGS.STRICT;
                }
                self._sStream.write({
                    type: CONSTANTS.TYPES.SETUP,
                    flags: flags,
                    keepalive: self._keepalive,
                    maxLifetime: self._maxLifetime,
                    version: CONSTANTS.VERSION,
                    metadataEncoding: self._metadataEncoding,
                    dataEncoding: self._dataEncoding,
                    metadata: opts.setupMetadata,
                    data: opts.setupData
                }, function writeCb(err) {
                    cb(err);
                });
            }
        }
    ], args: {}}, function cb(err, results) {
        self._log.debug({err: err, results: results},
            'Connection.new: finished');
        // need to return Connection first before we emit the ready event
        setImmediate(function ready() {
            if (err) {
                self.emit('error', err);
            }
            self.emit('ready');
        });
    });
}
util.inherits(Connection, EventEmitter);

module.exports = Connection;

Connection.prototype.request = function request(req) {
    var self = this;
    var stream = self._getNewStream();
    var frame = {
        type: TYPES.REQUEST_RESPONSE,
        flags: req.follows ? FLAGS.FOLLOWS : FLAGS.NONE,
        data: req.data,
        metadata: req.metadata,
        streamId: stream.id
    };

    self._sStream.write(frame);

    return stream.eventEmitter;
};

Connection.prototype.response = function response(res) {
    var self = this;
    var frame = {
        type: TYPES.RESPONSE,
        flags: res.follows ? FLAGS.FOLLOWS : FLAGS.NONE,
        data: res.data,
        metadata: res.metadata,
        streamId: res.streamId
    };

    self._sStream.write(frame);
};


// Frame handlers


Connection.prototype._setup = function _setup(frame) {
    var self = this;
    self._log.debug({frame: frame}, 'Connection._setup: entering');

    // if we've already been setup -- we ignore? Spec currently does not
    // specify what to do here.
    if (self._isSetup || self._type === 'client') {
        self._log.warn({frame: frame},
                       'Connection._setup: got extra setup frame');
        return;
    }

    // TODO: add leasing and strict mode interpretation here.
    // TODO: validate setup frame -- return setup_error on bad frame.
    self._version = frame.version;
    self._keepalive = frame.keepalive;
    self._maxLifetime = frame.maxLifetime;
    self._metadataEncoding = frame.metadataEncoding;
    self._dataEncoding = frame.dataEncoding;
    // set the encoding of the s and p streams based on setup.
    self._pStream.setEncoding(self._dataEncoding, self._metadataEncoding);
    self._sStream.setEncoding(self._dataEncoding, self._metadataEncoding);

    self._isSetup = true;
    self._log.debug({setup: self._isSetup}, 'Connection._setup: exiting');
    self.emit('setup', frame);
};

Connection.prototype._request = function _request(frame) {
    var self = this;

    // we ignore any requests if we haven't gotten a setup stream yet.
    if (!self._isSetup && self._type === 'server') {
        self._log.warn({frame: frame},
                       'Connection._requestResponse: got frame before setup');
        return;
    }

    // TODO: deal with streamid rollover
    var stream = self._getStream(frame.header.streamId);

    if (!stream.request) {
        stream.request = {};
    }

    if (stream.request.data) {
        stream.request.data += frame.data;
    } else {
        stream.request.data = frame.data;
    }

    if (stream.request.metadata) {
        stream.request.metadata += frame.metadata;
    } else {
        stream.request.metadata = frame.metadata;
    }

    if (frame.header.flags & FLAGS.FOLLOWS) {
        self._log.debug({stream: stream},
                        'Connection._reqRes: got only partial frame');
        stream.request.follows = true;
    } else {
        // global EventEmitter because an inbound reqres means we have to handle
        // it programatically.
        self.emit('request', stream);
    }
};

Connection.prototype._response = function _response(frame) {
    var self = this;
    // look up the streamId in the table TODO: deal with streamid rollover
    var stream = self._getStream(frame.header.streamId);

    if (!stream) {
        // Crash here? Not sure since it could be the remote misbehaving
        self._log.error({frame: frame},
            'Connection._response: got frame with unknown streamId');
        return;
    }

    if (!stream.response) {
        stream.response = {};
    }

    if (stream.response.data) {
        stream.response.data += frame.data;
    } else {
        stream.response.data = frame.data;
    }

    if (stream.response.metadata) {
        stream.response.metadata += frame.metadata;
    } else {
        stream.response.metadata = frame.metadata;
    }

    if (frame.header.flags & FLAGS.FOLLOWS) {
        self._log.debug({stream: stream},
                        'Connection._response: got only partial frame');
        stream.response.follows = true;
    } else {
        // if we get a response, it means we sent a request -- emit the event
        // on the request eventemitter.
        stream.eventEmitter.emit('response', stream.response);
    }
};

Connection.prototype._error = function _error(frame) {
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


// A server will always send a request with odd stream ids. A client will always
// send a request with even stream ids.
Connection.prototype._getNewStream = function _getNewStream() {
    //TODO: what happens when we exceed 2^32
    var self = this;
    var stream = {
        eventEmitter: new EventEmitter(),
        id: null
    };

    if (self._streams.latest === 0) {
        if (self._type === 'client') {
            stream.id = 2;
        } else {
            stream.id = 1;
        }
    } else {
        stream.id = self._streams.latest + 2;
    }

    self._streams.latest += 2;

    self._streams[stream.id] = stream;

    return stream;
};

// called by responding to a request.
Connection.prototype._getStream = function _getStream(id) {
    var self = this;

    if (!self._streams[id]) {
        self._streams[id] = {
            eventEmitter: new EventEmitter(),
            id: id,
            response: function response(res) {
                res.streamId = id;
                self.response(res);
            }
        };
    }

    return self._streams[id];
};

