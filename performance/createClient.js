var ReactiveSocket = require('./../lib');
var grpc = require('grpc');

module.exports = function(args, grpcArgs) {

    var client;
    if (args.rs) {
        client = ReactiveSocket.createTCPClient({
            port: args.port,
            host: args.host
        });
    }

    // grpc
    else {
        var proto = grpc.load(grpcArgs.proto).perf;
        var bindAddress = args.host + ':' + args.port;
        client = new proto.Perf(bindAddress,
                                grpc.credentials.createInsecure());
    }

    return client;
};
