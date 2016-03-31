'use strict';

var chai = require('chai');
var sinon = require('sinon');

var Rx = require('rxjs');

var CONSTANTS = require('./../../../lib/protocol/constants');
var ReactiveSocket = require('./../../../lib');
var RSWSClientTransport =
    require('./../../../lib/streams/transports/RSTCPClientTransport');
var RSWSServerTransport =
    require('./../../../lib/streams/transports/RSTCPServerTransport');

var expect = chai.expect;
var Observable = Rx.Observable;
var fromNodeCallback = Observable.bindNodeCallback;
var noOp = function noOp() {};
var REQUEST_RESPONSE = CONSTANTS.TYPES.REQUEST_RESPONSE;
var RESPONSE = CONSTANTS.TYPES.RESPONSE;

describe('RS -> RQ -> RS', function () {
    var server, client;
    beforeEach(function () {
        var wsTransportServer = new RSWSServerTransport({
            port: 50051,
            host: 'localhost'
        });
        var wsTransportClient = new RSWSClientTransport({
            port: 50051,
            host: 'localhost'
        });

        server = new ReactiveSocket.ReactiveServer(wsTransportServer);
        client = new ReactiveSocket.ReactiveClient(wsTransportClient);
    });

    it('should perform a basic rs -> rq -> rs', function (done) {
        var onReqRes = sinon.spy(function onRequest(req, res) {
            var data = req.payload.data.toString();
            res.respond('after ' + data + ' :: hello client');
        });

        // The request and response handler
        server.on(REQUEST_RESPONSE, onReqRes);

        var onNext = sinon.spy();
        var request = fromNodeCallback(client.requestResponse.bind(client));
        request({data: 'hello server'}). do(onNext, noOp, function onCompleted() {
                expect(onNext.calledOnce).to.equals(true);
                expect(onReqRes.calledOnce).to.equals(true);

                var args = onNext.getCall(0).args;
                expect(args[0].payload).to.deep.equal({
                    data: new Buffer('after hello server :: hello client')
                });
                expect(args[0].header.type).to.equals(RESPONSE);
            }). subscribe(noOp, done, done);
    });

    afterEach(function (done) {
        client.close();
        server.close(function () {
            done();
        });
    });


});
