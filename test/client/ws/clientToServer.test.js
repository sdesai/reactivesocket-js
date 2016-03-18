'use strict';

var bunyan = require('bunyan');
var chai = require('chai');
var sinon = require('sinon');

var CONSTANTS = require('./../../../lib/protocol/constants');
var ReactiveSocket = require('./../../../lib');
var RSWSClient = require('../../../lib/streams/ReactiveClient.js');
var RSWSServerTransport =
    require('./../../../lib/streams/transports/RSTCPServerTransport');

var expect = chai.expect;
var REQUEST_RESPONSE = CONSTANTS.TYPES.REQUEST_RESPONSE;
var RESPONSE = CONSTANTS.TYPES.RESPONSE;

describe('RS -> RQ -> RS', function () {
    var LOG = bunyan.createLogger({
        name: 'rs-ws-client-test',
        level: process.env.LOG_LEVEL || 'info'
    });
    var SERVER, CLIENT;
    beforeEach(function (done) {
        var wsTransportServer = new RSWSServerTransport({
            port: 50051,
            host: 'localhost'
        });

        SERVER = new ReactiveSocket.ReactiveServer(wsTransportServer);

        CLIENT = new RSWSClient({
            address: 'ws://localhost:1337',
            log: LOG
        });

        SERVER.on('connect', done);
    });

    it('req res', function (done) {
        return done();
    });

    //it('should perform a basic rs -> rq -> rs', function(done) {
    //var onReqRes = sinon.spy(function onRequest(req, res) {
    //var data = req.payload.data.toString();
    //res.respond('after ' + data + ' :: hello client');
    //});

    //// The request and response handler
    //SERVER.on(REQUEST_RESPONSE, onReqRes);

    //var onNext = sinon.spy();
    //var request = fromNodeCallback(CLIENT.requestResponse.bind(CLIENT));
    //request({data: 'hello server'}).
    //do(onNext, noOp, function onCompleted() {
    //expect(onNext.calledOnce).to.equals(true);
    //expect(onReqRes.calledOnce).to.equals(true);

    //var args = onNext.getCall(0).args;
    //expect(args[0].payload).to.deep.equal({
    //data: new Buffer('after hello server :: hello client')
    //});
    //expect(args[0].header.type).to.equals(RESPONSE);
    //}).
    //subscribe(noOp, done, done);
    //});

    afterEach(function (done) {
        //CLIENT.close();
        //SERVER.close(function() {
        //done();
        //});
    });


});
