'use strict';

/**
 * The interface for the transport protocol.
 * @constructor
 */
function Transport() {}

/**
 * Tells the transport protocol to open up a stream.  When the stream has
 * been opened up, a connection event will be emitted with the stream.
 * @public
 * @returns {undefined}
 */
Transport.prototype.establishConnection = function establishConnection() { };

/**
 * Mimicks the EventEmitter intefrace.
 *
 * @public
 * @param {String} eventName - should be 2 events. connection and close.
 * @param {Function} callback - The callback when the event happens
 * @returns {undefined}
 */
Transport.prototype.on = function on(eventName, callback) { };


