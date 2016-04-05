'use strict';

var util = require('util');

var EventEmitter = require('events');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var vasync = require('vasync');

var Websocket = require('ws');

var ParseStream = require('../streams/parseStream');
var SerializeStream = require('../streams/serializeStream');
var Stream = require('./stream');
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
            level: process.env.LOG_LEVEL || bunyan.WARN
        });
    } else {
        this._log = bunyan.createLogger({
            name: 'connection',
            level: process.env.LOG_LEVEL || bunyan.WARN,
            serializers: bunyan.stdSerializers
        });
    }

    self._log.debug({opts: opts}, 'connection: new');

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

    // TODO: not sure why the transform streams here don't emit end or finish.
    // we only need to listen for the serialize stream -- since both p and s
    // streams are piped to the transport stream; If the transport ends, they
    // all emit end.
    //self._sStream.on('end', function end() {
        //self._log.info('transport closed');
        ////self.emit('close');
    //});
    //self._sStream.on('finish', function end() {
        //self._log.info('transport closed');
        ////self.emit('close');
    //});

    // Mux between different frame types
    self._pStream.on('data', function read(frame) {
        self._log.debug({frame: frame}, 'rsClient.gotFrame');

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

    // init
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
        function setupTransportStreamListener(__, cb) {
            // no need to listen for end stream, since finish indicates
            // stream is no longer open.
            self._transportStream.on('finish', function end() {
                self._log.info('transport finished');
                self.emit('close');
            });

            return cb();
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
                self.setup({
                    metadata: opts.setupMetadata,
                    data: opts.setupData
                }, cb);
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


/// API


Connection.prototype.getSetupStream = function getSetupStream() {
    var self = this;
    return self._setupStream.eventEmitter;
}

/**
 * Send a request-response.
 * @param {Object} req The request-response object.
 * @param {String} [req.data=null] The data string.
 * @param {String} [req.metaData=null] The metaData string.
 *
 * @returns {EventEmitter} Which fires a 'response' event when a response is
 * received
 */
Connection.prototype.request = function request(req) {
    var self = this;
    var stream = self._getNewStream();
    var frame = {
        type: TYPES.REQUEST_RESPONSE,
        flags: req.follows ? FLAGS.FOLLOWS : FLAGS.NONE,
        data: req.data,
        metadata: req.metadata,
        streamId: stream.getId()
    };

    self._sStream.write(frame);

    return stream;
};

/**
 * Send a response.
 * @param {Object} res The response object.
 * @param {String} [res.data=null] The data string.
 * @param {String} [res.metaData=null] The metaData string.
 *
 * @returns {null}
 */
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

/**
 * @param {Object} err The error object.
 * @param {Code} err.code The error code.
 * @param {String} [err.metadata=null] The metadata.
 * @param {String} [err.data=null] The data.
 * @param {Number} err.streamId The stream id.
 *
 * @returns {null}
 */
Connection.prototype.error = function error(err) {
    var self = this;
    self._log.debug({frame: err}, 'Connection.error: entering');
    var frame = {
        type: TYPES.ERROR,
        errorCode: err.errorCode,
        metadata: err.metadata,
        data: err.data,
        streamId: err.streamId
    };

    self._sStream.write(frame);
};

/**
 * Send a setup frame. Used for unit tests. This is not meant for consumers of
 * this API, since the connection automatically sends as setup frame on
 * creation.
 * @param {Object} su The setup object.
 * @param {String} [su.data=null] The data string.
 * @param {String} [su.metadata=null] The metadata string.
 * @param {Function} cb The callback f(err)
 *
 * @returns {null}
 */
Connection.prototype.setup = function setup(su, cb) {
    var self = this;

    if (self.type === 'server') {
        cb(new Error('can not send setup frame as server'));
        return;
    }
    self._setupStream = self._getStream(0);
    var flags = CONSTANTS.FLAGS.NONE;

    if (su.lease) {
        flags |= CONSTANTS.FLAGS.LEASE;
    }

    if (su.strict) {
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
        metadata: su.setupMetadata,
        data: su.setupData
    }, cb);
};

/// Frame handlers


Connection.prototype._setup = function _setup(frame) {
    var self = this;
    self._log.debug({frame: frame}, 'Connection._setup: entering');

    var stream = self._getStream(0);

    if (self._isSetup || self._type === 'client') {
        self._log.warn({frame: frame},
                       'Connection._setup: got extra setup frame');
        stream.setError({
            errorCode: ERROR_CODES.REJECTED_SETUP,
            data: 'extra setup frame'
        });
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

    stream.setup = frame;
    self.emit('setup', stream);
    self._log.debug({setup: self._isSetup}, 'Connection._setup: exiting');
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
    stream.setRequest(frame);
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

    stream.setResponse(frame);
};

Connection.prototype._error = function _error(frame) {
    var self = this;
    self._log.debug({frame: frame}, 'Connection._error: entering');

    var stream = self._getStream(frame.header.streamId);

    stream.setError(frame);
};


/// Privates


// Initiating streams will invoke this to get a new streamid.
Connection.prototype._getNewStream = function _getNewStream() {
    //TODO: what happens when we exceed 2^32
    var self = this;
    self._log.debug({latest_id: self._streams.latest},
                    'Connection._getNewStream: entering');
    var id;
    if (self._streams.latest === 0) {
        if (self._type === 'client') {
            id = 2;
        } else {
            id = 1;
        }
    } else {
        id = self._streams.latest + 2;
    }

    var stream = new Stream({
        connection: self,
        log: self._log,
        id: id
    });

    self._streams.latest += 2;

    self._streams[id] = stream;

    self._log.debug({latest_id: self._streams.latest, id: id},
                    'Connection._getNewStream: exiting');
    return stream;
};

// Responding streams will invoke this to persist a stream id
Connection.prototype._getStream = function _getStream(id) {
    var self = this;

    if (!self._streams[id]) {
        self._streams[id] = new Stream({
            connection: self,
            log: self._log,
            id: id
        });
    }

    return self._streams[id];
};
