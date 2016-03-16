'use strict';

var bunyan = require('bunyan');

var LOG = bunyan.createLogger({
    name: 'reactive-socket',
    level: 'info',
    src: true
});

module.exports = LOG;
