'use strict';

var Transform = require('stream').Transform;
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');

var Frame = require('./frame');

function ReactiveSocketStream(opts, cb) {
    assert.object(opts, 'opts');
    assert.optionalObject(opts.log, 'opts.log');
    Transform.call(this, opts);
}
util.inherits(ReactiveSocketStream, Transform);

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
            level: 'info'
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
            self._streamMap[streamId] = new ReactiveSocketStream();
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
