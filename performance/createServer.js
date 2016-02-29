var ReactiveSocket = require('./../lib');
var grpc = require('grpc');
module.exports = function(args, grpcArgs) {
    var server;
    if (args.rs) {
        server = ReactiveSocket.createTCPServer({
            port: args.port,
            host: args.host
        });
    }
    else {
        var proto = grpc.load(grpcArgs.proto).perf;
        var bindAddress = args.host + ':' + args.port;
        server = new grpc.Server();
        server.addProtoService(proto.Perf.service, grpcArgs.fns);
        server.bind(bindAddress, grpc.ServerCredentials.createInsecure());
        server.start();
    }

    return server;
};
