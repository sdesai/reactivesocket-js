'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');

var RSFramingStream = require('./../../lib/streams/transports/RSFramingStream');
var TestableDuplexStream = require('./../streams/util/TestableDuplexStream');

describe('Framing', function () {
    it('1 frame, 1 chunk', function (done) {
        var b1 = createBuffer(8, 0x00112233);
        var testStream = new TestableDuplexStream();
        var framingStream = new RSFramingStream(testStream);
        var onData = sinon.spy();

        framingStream.on('data', onData);
        framingStream.on('close', function onClose() {
            var tb1 = createBuffer(8, 0x00112233);

            expect(onData.callCount, 'one frame required').to.equals(1);
            expect(onData.getCall(0).args[0]).to.deep.equals(tb1);

            done();
        });

        testStream.push(b1);

        // Streams won't write sync
        setTimeout(function () {
            testStream.close();
        });
    });
    it('1 frame over 2 chunks.', function (done) {
        var b1 = createBuffer(8, 0x00112233);
        var testStream = new TestableDuplexStream();
        var framingStream = new RSFramingStream(testStream);
        var onData = sinon.spy();

        framingStream.on('data', onData);
        framingStream.on('close', function onClose() {
            var tb1 = createBuffer(8, 0x00112233);

            expect(onData.callCount, 'one frame required').to.equals(1);
            expect(onData.getCall(0).args[0]).to.deep.equals(tb1);

            done();
        });

        testStream.push(b1.slice(0, 6));
        testStream.push(b1.slice(6));

        // Streams won't write sync
        setTimeout(function () {
            testStream.close();
        });
    });
    it('2 frames, 1 chunk.', function (done) {
        var b1 = createBuffer(8, 0x00112233);
        var b2 = createBuffer(8, 0x33221100);
        var combine = Buffer.concat([b1, b2]);
        var testStream = new TestableDuplexStream();
        var framingStream = new RSFramingStream(testStream);
        var onData = sinon.spy();

        framingStream.on('data', onData);
        framingStream.on('close', function onClose() {
            var tb1 = createBuffer(8, 0x00112233);
            var tb2 = createBuffer(8, 0x33221100);

            expect(onData.callCount, 'two frames required').to.equals(2);
            expect(onData.getCall(0).args[0]).to.deep.equals(tb1);
            expect(onData.getCall(1).args[0]).to.deep.equals(tb2);

            done();
        });

        testStream.push(combine);

        // Streams won't write sync
        setTimeout(function () {
            testStream.close();
        });
    });

    it('1 frame, 1 partial from first chunk, followed by the completion of ' +
       'the second frame in second chunk.', function (done) {
            var b1 = createBuffer(8, 0x00112233);
            var b2 = createBuffer(8, 0x33221100);
            var combine = Buffer.concat([b1, b2]);
            var testStream = new TestableDuplexStream();
            var framingStream = new RSFramingStream(testStream);
            var onData = sinon.spy();

            framingStream.on('data', onData);
            framingStream.on('close', function onClose() {
                var tb1 = createBuffer(8, 0x00112233);
                var tb2 = createBuffer(8, 0x33221100);

                expect(onData.callCount, 'two frames required').to.equals(2);
                expect(onData.getCall(0).args[0]).to.deep.equals(tb1);
                expect(onData.getCall(1).args[0]).to.deep.equals(tb2);

                done();
            });

            testStream.push(combine.slice(0, 6));
            testStream.push(combine.slice(6));

            // Streams won't write sync
            setTimeout(function () {
                testStream.close();
            });
        });
});

// framing does not care about data, just the length property.
function createBuffer(length, data) {
    var buff = new Buffer(length).fill(0);
    buff.writeUInt32BE(length, 0);
    buff.writeUInt32BE(data, 4);

    return buff;
}
