#!/bin/env node
'use strict';

var fs = require('fs');
var net = require('net');
var url = require('url');

var _  = require('lodash');
var async = require('async');
var dashdash = require('dashdash');
var ss = require('simple-statistics');
var vasync = require('vasync');

var Ws = require('ws');
var WSStream = require('yws-stream');

var reactiveSocket = require('../lib');

var TCP_REGEX = /tcp:\/\/.+:[0-9]+\/*.*/;
var WS_REGEX = /wss?:\/\/.+:[0-9]+\/*.*/;

var OPTIONS = [{
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

var PARSER = dashdash.createParser({options: OPTIONS});
var HELP = PARSER.help({includeEnv: true}).trimRight();
var OPTS;

try {
    OPTS = PARSER.parse(process.argv);
} catch (e) {
    console.error('foo: error: %s', e.message);
    process.exit(1);
}

if (OPTS.help) {
    HELP = PARSER.help({includeEnv: true}).trimRight();
    console.log('usage: rsBench [OPTIONS] tcp|ws://localhost:1337\n'
                + 'options:\n'
                + HELP);
    process.exit(0);
}

var RAW_URL = OPTS._args[0];

var ITERATIONS = OPTS.number || 1000;
var CONCURRENCY = OPTS.concurrency || 10;
var SIZE = OPTS.size || 8;
var ENDPOINT = url.parse(RAW_URL);

// we need to send a large enough frame to ensure we exceed the default TCP
// loopback MTU of 16-64 kbytes. This is to test that framing actually works.
// Hence we read in some select works of the Bard.
var DATA = fs.readFileSync('./test/etc/hamlet.txt', 'utf8');

for (var i = 0; i < SIZE / DATA.length ; i++) {
    DATA += DATA;
}

DATA = DATA.substr(0, SIZE);

var RS_CLIENT_CON;
var CLIENT_STREAM;

var REQ = {
    metadata: OPTS.metadata,
    data: DATA
};

var TIMERS = new Array(ITERATIONS);

var COUNT = 0;

var START_TIME;
var HAS_PRINTED = false;

vasync.pipeline({funcs: [
    function setupTransportStream(ctx, cb) {
        if (TCP_REGEX.test(RAW_URL)) {
            CLIENT_STREAM = net.connect(ENDPOINT.port, ENDPOINT.hostname,
                                        function (e) {
                return cb(e);
            });
        } else if (WS_REGEX.test(RAW_URL)) {
            var ws = new Ws(RAW_URL);
            CLIENT_STREAM = new WSStream({
                ws: ws
            });

            ws.on('open', function () {
                return cb();
            });

        } else {
            HELP = PARSER.help({includeEnv: true}).trimRight();
            console.log('usage: rsBench [OPTIONS] tcp|ws://localhost:1337\n'
                        + 'options:\n'
                        + HELP);
            process.exit(1);
        }
    },
    function setupConnection(ctx, cb) {
        RS_CLIENT_CON = reactiveSocket.createConnection({
            transport: {
                stream: CLIENT_STREAM,
                framed: true
            },
            type: 'client',
            metadataEncoding: 'utf-8',
            dataEncoding: 'utf-8'
        });

        RS_CLIENT_CON.on('ready', function () {
            START_TIME = process.hrtime();
            async.eachLimit(TIMERS, CONCURRENCY, function (timer, _cb) {
                var start = process.hrtime();
                var stream = RS_CLIENT_CON.request(REQ);

                stream.on('response', function (res) {
                    var elapsed = process.hrtime(start);
                    var elapsedNs = elapsed[0] * 1e9 + elapsed[1];
                    TIMERS[COUNT] = elapsedNs;
                    COUNT++;
                    _cb();

                    if (COUNT === ITERATIONS) {
                        return cb();
                    }
                });
            });
        });
    }
], arg: {}}, function (err, cb) {
    if (err) {
        throw err;
    }

    process.exit();
});

function printMetrics() {
    var timers = _.compact(TIMERS);
    var elapsed = process.hrtime(START_TIME);
    var elapsedNs = elapsed[0] * 1e9 + elapsed[1];

    if (HAS_PRINTED) {
        return;
    }
    HAS_PRINTED = true;
    console.log('elapsed time', elapsedNs / 1e9);
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
