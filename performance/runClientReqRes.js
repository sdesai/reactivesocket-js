var ReactiveSocket = require('./../lib');
module.exports = function runReqRes(client, args) {
    if (args.count > args.cycles) {
        client.close && client.close() || client.end && client.end();
        return;
    }

    args.count = (args.count || 0) + 1;
    if (args.rs) {
        var request = {data: 'hello server'};
        client.requestResponse(request, function (err, data) {
            runReqRes(client, args);
        });
    }

    else {
        client.get({hello: 'hello server'}, function(err, data) {
            runReqRes(client, args);
        });
    }
};
