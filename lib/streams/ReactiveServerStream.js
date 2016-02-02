'use strict';

var CONSTANTS = require('./../protocol/constants');
var SETUP = CONSTANTS.TYPES.SETUP;

/**
 * @constructor
 * @param {Duplex} stream -
 * @param {String|Number} id -
 * @returns {undefined}
 */
var ReactiveServerStream = function ReactiveServerStream(stream, id) {
    this.setup = false;
    this.encoding = {
        data: null,
        metadata: null
    };
    this.keepAliveInterval = 0;
    this.maxLife = 0;
    this.isLeased = false;
    this.stream = stream;
    this.id = id;
};

/**
 * updates the state of the reactive server stream from the incoming frame.
 * The frame coming in should either be a setup or lease frame.
 * @param {ReactiveSocketFrame} frame -
 * @returns {undefined}
 */
ReactiveServerStream.prototype.update = function update(frame) {
    if (frame.header.type === SETUP) {
        this._setup(frame);
    }
};

ReactiveServerStream.prototype._setup = function _setup(setupFrame) {
    var setup = setupFrame.setup;

    this.keepAliveInterval = setup.keepAliveInterval;
    this.maxLife = setup.maxLife;
    this.encoding.metadata = setup.encoding.metadata;
    this.encoding.data = setup.encoding.data;
    this.setup = true;
};

module.exports = ReactiveServerStream;
