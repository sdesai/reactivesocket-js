'use strict'

var fs = require('fs');
var net = require('net');

var async = require('async');
var ss = require('simple-statistics');

var reactiveSocket = require('../lib');

var ITERATIONS = parseInt(process.env.ITERATIONS || 100, 10);
var CONCURRENCY = parseInt(process.env.CONCURRENCY || 10, 10);

var PORT = process.env.PORT || 1337;
var HOST = process.env.HOST || 'localhost';

// we need to send a large enough frame to ensure we exceed the default TCP
// loopback MTU of 16384 bytes. This is to test that framing actually works.
// Hence we read in some select works of the Bard.
var HAMLET = fs.readFileSync('./test/etc/hamlet.txt', 'utf8');
var JULIUS_CAESAR = fs.readFileSync('./test/etc/julius_caesar.txt', 'utf8');

var RS_CLIENT_CON;
var TCP_CLIENT_STREAM;


var REQ = {
    metadata: 'hi',
    data: 'yunong'
}
//var REQ = {
    //metadata: JULIUS_CAESAR,
    //data: HAMLET
//};

var TIMERS = new Array(ITERATIONS);

var COUNT = 0;

TCP_CLIENT_STREAM = net.connect(PORT, HOST, function (e) {
    RS_CLIENT_CON = reactiveSocket.createConnection({
        transport: {
            stream: TCP_CLIENT_STREAM,
            framed: true
        },
        type: 'client',
        metadataEncoding: 'utf-8',
        dataEncoding: 'utf-8'
    });

    RS_CLIENT_CON.on('ready', function () {
        async.eachLimit(TIMERS, CONCURRENCY, function (timer, cb) {
            var start = process.hrtime();
            var stream = RS_CLIENT_CON.request(REQ);
            stream.on('response', function (res) {
                var elapsed = process.hrtime(start);
                var elapsedNs = elapsed[0] * 1e9 + elapsed[1];
                TIMERS[COUNT] = elapsedNs;
                COUNT++;
                cb();
                if (COUNT === ITERATIONS) {
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
                }
            });
        });
    });
});
