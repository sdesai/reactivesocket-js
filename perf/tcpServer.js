'use strict';

var fs = require('fs');
var net = require('net');

var ss = require('simple-statistics');

var reactiveSocket = require('../lib');

var PORT = process.env.PORT || 1337;
var HOST = process.env.HOST || 'localhost';

// we need to send a large enough frame to ensure we exceed the default TCP
// loopback MTU of 16384 bytes. This is to test that framing actually works.
// Hence we read in some select works of the Bard.
//var HAMLET = fs.readFileSync('./test/etc/hamlet.txt', 'utf8');
//var JULIUS_CAESAR = fs.readFileSync('./test/etc/julius_caesar.txt', 'utf8');

//var RES = {
    //metadata: JULIUS_CAESAR,
    //data: HAMLET
//};

var RES = {
    metadata: 'hello',
    data: 'world'
};

var COUNT = 0;
var TCP_SERVER = net.createServer(function (con) {
    var TCP_SERVER_CON = reactiveSocket.createConnection({
        transport: {
            stream: con,
            framed: true
        },
        type: 'server'
    });

    TCP_SERVER_CON.on('request', function (stream) {
        COUNT++;
        setImmediate(function () {
            stream.response({
                metadata: stream.getRequest().metadata,
                data: stream.getRequest().data
            });
        });
    });
});

TCP_SERVER.listen({
    port: PORT,
    host: HOST
}, function (err) {
    if (err) {
        throw err;
    }
});

setInterval(function() {
    if (COUNT === 0) {
        return;
    }
    console.log('%s RPS', COUNT);
    COUNT = 0;
}, 1000);
