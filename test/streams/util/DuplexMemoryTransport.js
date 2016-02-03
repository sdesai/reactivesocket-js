'use strict';

var MemoryTransport = require('./MemoryTransport');
var TestableDuplexStream = require('./TestableDuplexStream');

var DuplexMemoryTransport = {
    /**
     * Creates a client server transport pair.
     * @param {Object} [clientServerPairArg] -
     * @returns {{client: MemoryTransport, server: MemoryTransport}}
     */
    create: function create(clientServerPairArg) {
        var clientServerPair = clientServerPairArg || {};

        // creates the pair.  If only the server is present then a new
        // client will be created and a new stream will be pushed.
        return createPairTransports(
            clientServerPair.client, clientServerPair.server);
    },

    /**
     * pushes a new stream to each then links the paired transports together.
     * @param {Object} clientServerPair -
     * @returns {undefined}
     */
    pair: function pair(clientServerPair) {
        var serverStream = new TestableDuplexStream();
        var clientStream  = new TestableDuplexStream();

        clientServerPair.client.pushStream(clientStream);
        clientServerPair.server.pushStream(serverStream);

        pairStreams(clientStream, serverStream);
    }
};

module.exports = DuplexMemoryTransport;

function createPairTransports(clientArg, serverArg) {
    var serverOnly = !clientArg && serverArg;

    var client = clientArg || new MemoryTransport();
    var server = serverArg || new MemoryTransport();

    var clientStream = client.getNextStream();
    var serverStream = server.getNextStream();

    // We need to push a new stream to the server.  This is the use case for
    // multiple clients connecting to a single server.
    if (serverOnly) {
        serverStream = new TestableDuplexStream();
        server.pushStream(serverStream);
    }

    pairStreams(clientStream, serverStream);

    // On a connection, we need to create the connection for the server
    // transport protocol.
    client.on('est-con', function() {
        server.establishConnection();
    });

    return {
        client: client,
        server: server
    };
}

function pairStreams(clientStream, serverStream) {

    // Now we bind the two streams together.
    clientStream.setWrite(function onClientWrite(buffer) {
        serverStream.push(buffer);
    });
    serverStream.setWrite(function onServerWrite(buffer) {
        clientStream.push(buffer);
    });
}


