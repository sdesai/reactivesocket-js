'use strict';

var expect = require('chai').expect;
var Rx = require('rxjs');
var Observable = Rx.Observable;
var fromNodeCallback = Observable.bindNodeCallback;
var sinon = require('sinon');

var compareFrames  = require('./../compareFrames');
var CONSTANTS = require('./../../lib/protocol/constants');
var Frame = require('./../../lib/protocol/frame');
var MemoryTransport = require('./MemoryTransport');
var ReactiveClient = require('./../../lib/streams/ReactiveClient');
var TestableDuplexStream = require('./TestableDuplexStream');

var noOp = function() {};
var PAYLOAD_ENCODING = 'UTF-8';
var REQUEST_RESPONSE = CONSTANTS.TYPES.REQUEST_RESPONSE;
var SETUP = CONSTANTS.TYPES.SETUP;
var RESPONSE = CONSTANTS.TYPES.RESPONSE;

describe('ReactiveClient', function() {
    it('should go through the setup process.', function() {
        var transport = new MemoryTransport();
        var stream = setTransportStream(transport);
        var client = new ReactiveClient(transport, {
            keepAliveInterval: 1024,
            maxLife: 2048
        });
        var onWrite = stream.getWriteSpy();
        expect(onWrite.callCount).to.equal(0);

        client.establishConnection();
        expect(onWrite.callCount).to.equal(1);

        var setupFrame = Frame.getSetupFrame(1024, 2048, {
            data: PAYLOAD_ENCODING,
            metadata: PAYLOAD_ENCODING
        });

        var actualFrame = onWrite.getCall(0).args[0];
        compareFrames(setupFrame, actualFrame);
    });

    it('should establish a connection through sending data.', function(done) {
        var transport = new MemoryTransport();
        var stream = setTransportStream(transport);
        var client = new ReactiveClient(transport, {
            keepAliveInterval: 1024,
            maxLife: 2048
        });
        var onWriteCb = autoRespond('hello client');
        var onWrite = stream.setWrite(onWriteCb);
        var onNext = sinon.spy();
        var request = fromNodeCallback(client.requestResponse.bind(client));

        request({data: 'hello server'}).
            do(onNext, noOp, function() {
                expect(onWrite.callCount).to.equal(2);
                expect(onNext.callCount).to.equal(1);

                var setupFrame = Frame.parseFrame(onWrite.getCall(0).args[0]);
                var reqRes = Frame.parseFrame(onWrite.getCall(1).args[0]);

                expect(setupFrame.header.type).to.equals(SETUP);
                expect(reqRes.header.type).to.equals(REQUEST_RESPONSE);
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    header: {
                        type: RESPONSE,
                        flags: CONSTANTS.FLAGS.COMPLETE,
                        length: 24,
                        streamId: 1
                    },
                    payload: {
                        data: new Buffer('hello client')
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should send multiple requests and have correct callback order.',
        function(done) {
            var transport = new MemoryTransport();
            var stream = setTransportStream(transport);
            var client = new ReactiveClient(transport, {
                keepAliveInterval: 1024,
                maxLife: 2048
            });

            // Connections are establish syncronously with memory transport.
            client.establishConnection();

            var onWriteCb = autoRespond('hello client');
            stream.setWrite(onWriteCb);
            var request = fromNodeCallback(client.requestResponse.bind(client));
            var streamIds = [];

            // validates we are sync'd up.
            expect(client._ready).to.equal(true);
            var r1 = Observable.
                of(5).
                flatMap(function(x) {
                    stream.setDelay(200);
                    return request({data: 'hello server3'});
                }).
                do(function(x) {
                    streamIds[0] = x.header.streamId;
                });
            var r2 = Observable.
                of(5).
                flatMap(function(x) {
                    stream.setDelay(100);
                    return request({data: 'hello server3'});
                }).
                do(function(x) {
                    streamIds[1] = x.header.streamId;
                });
            var r3 = Observable.
                of(5).
                flatMap(function(x) {
                    stream.setDelay(300);
                    return request({data: 'hello server3'});
                }).
                do(function(x) {
                    streamIds[2] = x.header.streamId;
                });

            Observable.
                zip(r1, r2, r3, function(x1, x2, x3) {
                    return true;
                }).
                do(noOp, noOp, function() {

                    // Ensure that the responses were tied to the streams Id.
                    expect(streamIds[0] < streamIds[1]).to.equals(true);
                    expect(streamIds[1] < streamIds[2]).to.equals(true);

                    // Ensures that the underlying implementation is not
                    // flooding the system with keys.
                    expect(Object.keys(client._processed)).to.deep.equals([]);
                }).
                subscribe(noOp, done, done);
        });
});

function setTransportStream(transport) {
    var stream = new TestableDuplexStream();
    transport.setStream(stream);
    return stream;
}

function autoRespond(outData) {
    return function(buffer, frame) {
        // Upon request response we will send back through
        if (frame.header.type === REQUEST_RESPONSE) {
            var streamId = frame.header.streamId;
            var dataOut = {data: outData};

            if (typeof outData === 'function') {
                dataOut.data = outData();
            }

            var response = Frame.getResponseFrame(streamId, dataOut, true);
            return response;
        }
    };
}

