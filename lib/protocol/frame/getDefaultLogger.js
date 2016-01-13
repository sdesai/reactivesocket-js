var bunyan = require('bunyan');

var LOG = bunyan.createLogger({
    name: 'reactive-socket',
    level: 'error',
    src: true
});

module.exports = LOG;
