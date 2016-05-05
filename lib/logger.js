'use strict';

var bunyan = require('bunyan');

var LOG = bunyan.createLogger({
    name: 'reactive-socket',
    level: process.env.LOG_LEVEL || bunyan.WARN
});

module.exports = LOG;
