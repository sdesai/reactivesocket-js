'use strict'

var fs = require('fs');

var ss = require('simple-statistics');

var Ws = require('ws');
var WSStream = require('yws-stream');

var reactiveSocket = require('../lib');

var ITERATIONS = process.env.ITERATIONS || 100;
var RPS = process.env.ITERATIONS || 10;

var PORT = process.env.PORT || 1337;
var HOST = process.env.HOST || 'localhost';

// we need to send a large enough frame to ensure we exceed the default TCP
// loopback MTU of 16384 bytes. This is to test that framing actually works.
// Hence we read in some select works of the Bard.
var HAMLET = fs.readFileSync('./test/etc/hamlet.txt', 'utf8');
var JULIUS_CAESAR = fs.readFileSync('./test/etc/julius_caesar.txt', 'utf8');


var REQ = {
    metadata: 'hi',
    data: 'yunong'
}
//var REQ = {
    //metadata: JULIUS_CAESAR,
    //data: HAMLET
//};

var TIMERS = [];

var websocket = new Ws('ws://' + HOST + ':' + PORT);

// Create any transport stream that's a Node.js Duplex Stream
var transportStream = new WSStream({
    ws: websocket
});

// Wait for Websocket to establish connection, before we create an RS Connection
websocket.on('open', function() {

    var rsConnection = reactiveSocket.createConnection({
        transport: {
            stream: transportStream
        },
        type: 'client',
        metadataEncoding: 'utf8',
        dataEncoding: 'utf8'
    });

    rsConnection.on('ready', function () {
        for (var i = 0; i < ITERATIONS; i++) {
            setImmediate(function () {
                var start = process.hrtime();
                var stream = rsConnection.request(REQ);
                stream.on('response', function (res) {
                    var elapsed = process.hrtime(start);
                    var elapsedNs = elapsed[0] * 1e9 + elapsed[1];
                    TIMERS.push(elapsedNs);
                    if (TIMERS.length === ITERATIONS - 1) {
                        console.log('median', ss.median(TIMERS) / 1e9);
                        console.log('mean', ss.mean(TIMERS) / 1e9);
                        console.log('0.1%', ss.quantile(TIMERS, 0.001) / 1e9);
                        console.log('1%', ss.quantile(TIMERS, 0.01) / 1e9);
                        console.log('5%', ss.quantile(TIMERS, 0.05) / 1e9);
                        console.log('10%', ss.quantile(TIMERS, 0.1) / 1e9);
                        console.log('20%', ss.quantile(TIMERS, 0.2) / 1e9);
                        console.log('30%', ss.quantile(TIMERS, 0.3) / 1e9);
                        console.log('40%', ss.quantile(TIMERS, 0.4) / 1e9);
                        console.log('50%', ss.quantile(TIMERS, 0.5) / 1e9);
                        console.log('60%', ss.quantile(TIMERS, 0.6) / 1e9);
                        console.log('70%', ss.quantile(TIMERS, 0.7) / 1e9);
                        console.log('80%', ss.quantile(TIMERS, 0.8) / 1e9);
                        console.log('90%', ss.quantile(TIMERS, 0.9) / 1e9);
                        console.log('99%', ss.quantile(TIMERS, 0.99) / 1e9);
                        process.exit();
                        //console.log('everyting', TIMERS);
                    }
                });
            });
        }
    });
});
