var path = 'ws://rsl.test.netflix.net:7001';
var ReactiveSocket = require('./lib');
var RSWSClientTransport =
require('./lib/streams/transports/RSWSClientTransport');

var transport = new RSWSClientTransport({host: path});
var client = new ReactiveSocket.ReactiveClient(transport);

client.requestResponse({
    data: JSON.stringify({
        paths: [["searches","star","Titles",{"from":2,"to":7},"displayString"],["searches","star","Titles",{"from":2,"to":7},"item","title"]],
        method: 'get'
    })
}, function _cb(err, data) {
    console.log(err, data);
});


