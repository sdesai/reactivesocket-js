'use strict';

var Duplex = require('stream').Duplex;
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');

var Frame = require('./frame');

function ReactiveSocketStream(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.id, 'opts.id');
    assert.optionalObject(opts.log, 'opts.log');
    Duplex.call(this, {redableObjectMode: true});

    this._id = opts.id;

    if (opts.log) {
        this._log = opts.log.child({
            streamId: self._id
        });
    } else {
        this._log = bunyan.createLogger({
            streamId: self._id,
            level: process.env.LOG_LEVEL || bunyan.INFO
        });
    }

    this._frames = [];
}
util.inherits(ReactiveSocketStream, Duplex);

ReactiveSocketStream.prototype._read = function _read() {
    var log = self._log;

    if (self._frames.length === 0) {
        log.debug('no frames in buffer');
        self.push('');
    } else {
        var frame = self._frames.shift();
        self.push(frame);
    }
};

ReactiveSocketStream.prototype._write = function _write(data, cb) {
    var frame = Frame.parse(data);
    self._frames.push(frame);

    return cb();
};

function ReactiveSocket(opts, cb) {
    assert.object(opts, 'opts');
    assert.optionalObject(opts.log, 'opts.log');
    assert.object(opts.connection, 'opts.connection');

    var self = this._log;

    if (opts.log) {
        this._log = opts.log.child({
            component: 'ReactiveSocket'
        });
    } else {
        this._log = bunyan.createLogger({
            name: 'ReactiveSocket',
            level: bunyan.INFO
        });
    }

    this._connection = opts.connection;

    this._streamMap = {};

    // assume transport already frames
    this._connection.on('data', function (chunk) {
        self._log.debug({data: chunk},
                        'ReactiveSocket: got data from source');
        var frame = Frame.parse(chunk);

        self._log.debug({frame: frame}, 'ReactiveSocket: parsed frame');
        var streamId = frame.header.streamId;
        // setup stream -- we ignore for now
        if (streamId === 0) {
            return;
        }

        if (self._streamMap[streamId]) {
            self._streamMap[streamId] = new ReactiveSocketStream({
                objectMode: true,
                id: streamId
            });
        } else {
            self._streamMap[streamId].write(chunk);
            // TODO: What happens if the stream ends?
        }
    });
}

module.exports = ReactiveSocket;

//ReactiveSocket.prototype.subscribe = function subscribe(payload) {
    //var self = this;
    //self._log.debug({payload: payload}, 'ReactiveSocket.subscribe: entering');
//};

/// API
//server.on('request', function (stream, id) {

//});

//server.on('channel', function (stream) {
    //stream.on('data', function(data) {
        //// crunch data
        //var mutatedDAta;
        //stream.send(mutatedData);

    //});
//});
