var minimist = require('minimist');

var ReactiveSocket = require('./../lib');
var args = minimist(process.argv.slice(2), {
    default: {
        host: 'localhost',
        port: 51234,
        client: true,
        reqRes: true,
        cycles: 10000,
        rs: true
    }
});
['rs', 'client'].forEach(function(k) {
    args[k] = args[k] !== 'false' || false;
});
var grpcArgs = {
    fns: {
        get: get
    },
    proto: __dirname + '/simple.proto'
};

console.log('running reactive socket simple with following args', JSON.stringify(args));
if (args.client) {
    var client = require('./createClient')(args, grpcArgs);
    var runClientReqRes = require('./runClientReqRes');
    runClientReqRes(client, args);

    return;
}

var server = require('./createServer')(args, grpcArgs);

// The ReactiveSocket
if (args.rs) {
    server.on(ReactiveSocket.TYPES.REQUEST_RESPONSE, function reqRes(req, res) {
        var data = req.payload.data.toString();
        res.respond('hello client');
    });
    return;
}

function get(call, callback) {
    callback(null, {hello: 'hello client'});
}

