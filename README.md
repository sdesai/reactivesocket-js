# reactivesocket-js
ReactiveSocket Protocol for Client/Server for JS.
```bash
npm install reactivesocket
```
This library only supports the `request/response`, `setup` and `error` 
interactions. More interactions are coming soon.

## Streams
The transport for this library is built entirely on top of the Node.js
[Stream](https://nodejs.org/api/stream.html) API.  As a result, it is agnostic
to the underlying transport mechanism. As long as you pass in a transport
stream that is a Node.js
[Duplex](https://nodejs.org/api/stream.html#stream_class_stream_duplex) stream,
this library will work.

Using streams means that this library natively supports backpressure regardless 
of the transport implementation.

We currently target TCP via the [net](https://nodejs.org/api/net.html) module,
and WebSockets via the [yws-stream](https://github.com/yunong/ws-stream)
module. You are of course, free to inject which other transport you'd like.

## Connection Quick Start


```javascript
var bunyan = require('bunyan');

var Ws = require('ws');
var WSStream = require('yws-stream');

var reactiveSocket = require('reactive-socket');

// Create any transport stream that's a Node.js Duplex Stream
var transportStream = new WSStream({
    log: bunyan.createLogger({name: 'ws-stream'}),
    ws: new Ws('ws://localhost:1337')
});

var rsConnection = reactiveSocket.createConnection({
    log: bunyan.createLogger({name: 'rsConnection'}),
    transport: {
        stream: transportStream
    },
    type: 'client',
    metadataEncoding: 'utf8',
    dataEncoding: 'utf8'
});

rsConnection.on('ready', function () {
    // returns a reactive socket stream
    var stream = rsConnection.request({
        metadata: 'You reached for the secret too soon, you cried for the moon',
        data: 'Shine on you crazy diamond.'
    });

    stream.on('response', function (res) {
        console.log('got response', res);
    });

    stream.on('application-error', function (err) {
        console.error('got error', err);
    });
});
```

## Contributions
Contributions welcome, please ensure ```make check`` runs clean.

## License
MIT

Copyright 2016 Yunong J Xiao
