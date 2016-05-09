'use strict';

var fs = require('fs');
var net = require('net');
var url = require('url');

var _  = require('lodash');
var async = require('async');
var dashdash = require('dashdash');
var ss = require('simple-statistics');

var reactiveSocket = require('../lib');

var options = [{
    names: ['help', 'h'],
    type: 'bool',
    help: 'Print this help and exit.'
},{
    names: ['number', 'n'],
    type: 'number',
    help: 'Number of requests to perform'
}, {
    names: ['concurrency', 'c'],
    type: 'number',
    help: 'Number of multiple requests to make at a time'
}, {
    names: ['timelimit', 't'],
    type: 'number',
    help: 'Seconds to max. to spend on benchmarking'
}, {
    names: ['size', 's'],
    type: 'number',
    help: 'Size of payload in bytes, defaults to 8'
}, {
    names: ['metadata', 'm'],
    type: 'string',
    help: 'Metadata to include, defaults to null'
}];

var parser = dashdash.createParser({options: options});
var opts;

try {
    opts = parser.parse(process.argv);
} catch (e) {
    console.error('foo: error: %s', e.message);
    process.exit(1);
}

if (opts.help) {
    var help = parser.help({includeEnv: true}).trimRight();
    console.log('usage: rsBench [OPTIONS] tcp://localhost:1337\n'
                + 'options:\n'
                + help);
    process.exit(0);
}

var iterations = opts.number || 1000;
var concurrency = opts.concurrency || 10;
var endpoint = url.parse(opts._args[0]);
var size = opts.size || 8;

// we need to send a large enough frame to ensure we exceed the default TCP
// loopback MTU of 16-64 kbytes. This is to test that framing actually works.
// Hence we read in some select works of the Bard.
var data = fs.readFileSync('./test/etc/hamlet.txt', 'utf8');

var quotient = size / data.length;

for (var i = 0; i < quotient; i++) {
    data += data;
}

data = data.substr(0, size);

var RS_CLIENT_CON;
var TCP_CLIENT_STREAM;

var REQ = {
    metadata: opts.metadata,
    data: data
};

var TIMERS = new Array(iterations);

var COUNT = 0;

var startTime = process.hrtime();
TCP_CLIENT_STREAM = net.connect(endpoint.port, endpoint.hostname, function (e) {
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
        async.eachLimit(TIMERS, concurrency, function (timer, cb) {
            var start = process.hrtime();
            var stream = RS_CLIENT_CON.request(REQ);
            stream.on('response', function (res) {
                var elapsed = process.hrtime(start);
                var elapsedNs = elapsed[0] * 1e9 + elapsed[1];
                TIMERS[COUNT] = elapsedNs;
                COUNT++;
                cb();

                if (COUNT === iterations) {
                    process.exit();
                }
            });
        });
    });
});

var hasPrinted = false;
function printMetrics() {
    var timers = _.compact(TIMERS);
    var elapsed = process.hrtime(startTime);
    var elapsedNs = elapsed[0] * 1e9 + elapsed[1];
    if (hasPrinted) {
        return;
    }
    hasPrinted = true;
    console.log('elapsed time', elapsedNs);
    console.log('total reqs', timers.length);
    console.log('rps', timers.length / (elapsedNs / 1e9));
    console.log('median', ss.median(timers) / 1e9);
    console.log('mean', ss.mean(timers) / 1e9);
    console.log('0.1%', ss.quantile(timers, 0.001) / 1e9);
    console.log('1%', ss.quantile(timers, 0.01) / 1e9);
    console.log('5%', ss.quantile(timers, 0.05) / 1e9);
    console.log('10%', ss.quantile(timers, 0.1) / 1e9);
    console.log('20%', ss.quantile(timers, 0.2) / 1e9);
    console.log('30%', ss.quantile(timers, 0.3) / 1e9);
    console.log('40%', ss.quantile(timers, 0.4) / 1e9);
    console.log('50%', ss.quantile(timers, 0.5) / 1e9);
    console.log('60%', ss.quantile(timers, 0.6) / 1e9);
    console.log('70%', ss.quantile(timers, 0.7) / 1e9);
    console.log('80%', ss.quantile(timers, 0.8) / 1e9);
    console.log('90%', ss.quantile(timers, 0.9) / 1e9);
    console.log('99%', ss.quantile(timers, 0.99) / 1e9);
}

process.on('exit', function () {
    printMetrics();
});

process.on('SIGINT', function () {
    printMetrics();
    process.exit();
});
