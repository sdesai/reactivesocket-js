'use strict';

var Connection = require('./connection/connection');

module.exports = {
    TYPES: require('./protocol/constants').TYPES,
    FLAGS: require('./protocol/constants').FLAGS,
    ERROR_CODES: require('./protocol/constants').ERROR_CODES,
    VERSION: require('./protocol/constants').VERSION,
    createConnection: function (opts) {
        return new Connection(opts);
    }
};

