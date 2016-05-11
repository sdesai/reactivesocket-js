#!/bin/env node
'use strict';

var http = require('http');

var PORT = process.env.PORT || 1337;

var COUNT = 0;

var server = http.createServer(function (req, res) {
    COUNT++;
    res.end('hi yunong');
});

server.listen(PORT, function () {
    console.error('listening');
});

setInterval(function () {
    if (COUNT === 0) {
        return;
    }
    console.error('%s RPS', COUNT);
    COUNT = 0;
}, 1000);
