'use strict'

var util = require('util');

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

function Server(opts) {
    EventEmitter.call(this);

    // setup transport for listening:
    // on each new connection, create new set of streams
    // those streams represent the new connection. server manages connections,
    // connections manage streams
}
util.inherits(EventEmitter, Server);

module.exports = Server;
