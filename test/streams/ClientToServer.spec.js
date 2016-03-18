'use strict';

var expect = require('chai').expect;
var Rx = require('rxjs');
var Observable = Rx.Observable;
var fromNodeCallback = Observable.bindNodeCallback;
var sinon = require('sinon');

var CONSTANTS = require('./../../lib/protocol/constants');
var DuplexMemoryTransport = require('./util/DuplexMemoryTransport');
var ReactiveClient = require('./../../lib/streams/ReactiveClient');
var ReactiveServer = require('./../../lib/streams/ReactiveServer');

var noOp = function () {};
var REQUEST_RESPONSE = CONSTANTS.TYPES.REQUEST_RESPONSE;
var RESPONSE = CONSTANTS.TYPES.RESPONSE;

describe('Client To Server', function () {
    it('should perform a simple setup - reqRes', function (done) {
        var cSPair = DuplexMemoryTransport.create();
        var cTransport = cSPair.client;
        var sTransport = cSPair.server;
        var client = new ReactiveClient(cTransport);
        var server = new ReactiveServer(sTransport);
        var reqSyp = sinon.spy(function (req, res) {
            var fromClient = req.payload.data.toString();
            res.respond('after ' + fromClient + ' :: hello client');
        });

        server.on(REQUEST_RESPONSE, reqSyp);

        var request = fromNodeCallback(client.requestResponse.bind(client));
        var onNext = sinon.spy();
        request({data: 'hello server'}). do(onNext, noOp, function () {
                expect(onNext.callCount).to.equal(1);

                var args = onNext.getCall(0).args;
                expect(args[0].payload).to.deep.equal({
                    data: new Buffer('after hello server :: hello client')
                });
                expect(args[0].header.type).to.equals(RESPONSE);
            }). subscribe(noOp, done, done);
    });

    it('should perform a simple setup - reqRes (async)', function (done) {
        var cSPair = DuplexMemoryTransport.create();
        var cTransport = cSPair.client;
        var sTransport = cSPair.server;
        var client = new ReactiveClient(cTransport);
        var server = new ReactiveServer(sTransport);
        var reqSyp = sinon.spy(function (req, res) {
            var fromClient = req.payload.data.toString();
            setTimeout(function () {
                res.respond('after ' + fromClient + ' :: hello client');
            }, 300);
        });

        server.on(REQUEST_RESPONSE, reqSyp);

        var request = fromNodeCallback(client.requestResponse.bind(client));
        var onNext = sinon.spy();
        request({data: 'hello server'}). do(onNext, noOp, function () {
                expect(onNext.callCount).to.equal(1);

                var args = onNext.getCall(0).args;
                expect(args[0].payload).to.deep.equal({
                    data: new Buffer('after hello server :: hello client')
                });
                expect(args[0].header.type).to.equals(RESPONSE);
            }). subscribe(noOp, done, done);
    });
});
