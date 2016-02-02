'use strict';

var expect = require('chai').expect;

var CONSTANTS = require('./../../lib/protocol/constants');
var Frame = require('./../../lib/protocol/frame');
var MemoryTransport = require('./MemoryTransport');
var ReactiveServer = require('./../../lib/streams/ReactiveServer');
var TestableDuplexStream = require('./TestableDuplexStream');

var PAYLOAD_ENCODING = 'UTF-8';
var SETUP = CONSTANTS.TYPES.SETUP;

describe('ReactiveServer', function() {
    it('upon connection should update the setup frame', function(done) {
        var transport = new MemoryTransport();
        var stream = setTransportStream(transport);
        var server = new ReactiveServer(transport);
        var encoding = {
            data: PAYLOAD_ENCODING,
            metadata: PAYLOAD_ENCODING
        };

        transport.establishConnection();

        var streams = Object.
            keys(server._stream).
            map(function(x) {
                return server._stream[x];
            });

        // Should have at least one
        expect(streams.length).to.equals(1);

        // Streams resolve async. boo.
        server.on(SETUP, function() {
            var s = streams[0];

            try {
                expect(s.setup).to.equals(true);
                expect(s.keepAliveInterval).to.equals(1024);
                expect(s.maxLife).to.equals(2048);
                expect(s.encoding).to.deep.equals(encoding);
            } catch (e) {
                return done(e);
            }
            return done();
        });

        var setupFrame = Frame.getSetupFrame(1024, 2048, encoding);

        // Pushes through a setup frame to the server.
        stream.push(setupFrame);
    });
});

function setTransportStream(transport) {
    var stream = new TestableDuplexStream();
    transport.setStream(stream);
    return stream;
}
