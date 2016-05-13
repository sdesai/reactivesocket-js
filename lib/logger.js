'use strict';

var bunyan = require('bunyan');

// if we're perf testing, stub out the logger due to
// https://github.com/trentm/node-bunyan/issues/401
if (process.env.PERF) {
    function Log() {}

    module.exports = new Log();

    Log.prototype.trace = function () {};
    Log.prototype.debug = function () {};
    Log.prototype.info  = function () {};
    Log.prototype.warn = function () {};
    Log.prototype.error = function () {};
    Log.prototype.fatal = function () {};
    Log.prototype.child = function () {
        return this;
    };
} else {
    var LOG = bunyan.createLogger({
        name: 'reactive-socket',
        level: process.env.LOG_LEVEL || bunyan.WARN
    });

    module.exports = LOG;
}

