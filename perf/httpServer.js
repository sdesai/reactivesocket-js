'use strict';

var http = require('http');

var PORT = process.env.PORT || 1337;

var server = http.createServer(function (req, res) {
    res.end('hi yunong');
});

server.listen(PORT, function () {
    console.log('listening');
});
