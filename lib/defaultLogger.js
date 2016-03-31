'use strict';

var bunyan = require('bunyan');

var LOG = bunyan.createLogger({
    name: 'reactive-socket',
    level: process.env.LOG_LEVEL || 'error',
    src: true
});
LOG.addSerializers({
    //buffer: function bufSerializer (buf) {
        //return buf.toString();
    //}
});

module.exports = LOG;
