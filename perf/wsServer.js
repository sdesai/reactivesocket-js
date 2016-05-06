'use strict';

var fs = require('fs');

var ss = require('simple-statistics');

var Ws = require('ws');
var WSStream = require('yws-stream');

var reactiveSocket = require('../lib');

var PORT = process.env.PORT || 1337;
var HOST = process.env.HOST || 'localhost';

// we need to send a large enough frame to ensure we exceed the default TCP
// loopback MTU of 16384 bytes. This is to test that framing actually works.
// Hence we read in some select works of the Bard.
var HAMLET = fs.readFileSync('./test/etc/hamlet.txt', 'utf8');
var JULIUS_CAESAR = fs.readFileSync('./test/etc/julius_caesar.txt', 'utf8');

//var RES = {
    //metadata: JULIUS_CAESAR,
    //data: HAMLET
//};

var RES = {
    metadata: 'hello',
    data: 'world'
};

var COUNT = 0;
var WS_SERVER = new Ws.Server({port: PORT, host: HOST});

WS_SERVER.on('listening', function () {
    WS_SERVER.on('connection', function (socket) {
        socket.on('error', function (err) {
            console.error('ws con error', err);
        });
        var RS_SERVER_CON = reactiveSocket.createConnection({
            transport: {
                stream: new WSStream({
                    ws: socket
                }).on('error', function (err) {
                    console.log('ws stream error', err);
                })
            },
            type: 'server'
        });
        RS_SERVER_CON.on('request', function (stream) {
            COUNT++;
            setImmediate(function () {
                stream.response({
                    metadata: stream.getRequest().metadata,
                    data: stream.getRequest().data
                });
            });
        });
    });
});

setInterval(function() {
    if (COUNT === 0) {
        return;
    }
    console.log('%s RPS', COUNT);
    COUNT = 0;
}, 1000);
