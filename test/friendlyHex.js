/**
 * Takes the unfriendly nature of hex and turns it into a nice hex string.
 * @param {Buffer} buffer -
 */
module.exports = function friendlyHex(buffer) {
    var hex = buffer.toString('hex');
    var newValue = [];
    for (var i = 0; i < hex.length; ++i) {
        var index = Math.floor(i / 2);
        if (newValue[index] === undefined) {
            newValue[index] = '';
        }

        newValue[index] += hex[i];
    }

    return '0x' + newValue.join(' ');
};
