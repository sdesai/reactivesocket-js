'use strict';

var bunyan = require('bunyan');
var WebsocketStream = require('../lib/protocol/WebsocketStream.js');

var wss = new WebsocketStream({
    url: 'ws://localhost:8080',
    log: bunyan.createLogger({
        name: 'WebsocketStreamTest',
        src: true,
        level: 'debug'
    })
}, function (err) {
    wss.write('foo');

    wss.on('data', function (chunk) {
        console.log('data: ', chunk.toString());
        wss.pause();
        setTimeout(function () {
            wss.on('readable', function () {
                console.log('readable: ', wss.read());
            });
        }, 5000);
    });
});

