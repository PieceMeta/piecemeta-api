//     superscore uuid.js 0.2.2
//     (c) 2012 David Souther
//     superscore is freely distributable under the MIT license.
//     For all details and documentation:
//     https://github.com/DavidSouther/superscore

(function () {
    'use strict';

    module.exports.v4 = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            /* jshint bitwise: false */
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            /* jshint bitwise: true */
            return v.toString(16);
        });
    };

    module.exports.v5 = function (msg, namespace) {
        var nst = bin(namespace || '00000000-0000-0000-0000-000000000000');
        var sha1 = require('sha1');
        var hash = sha1(nst + msg).toString();
        /* jshint bitwise: false */
        return hash.substring(0, 8) +	//8 digits
            '-' + hash.substring(8, 12) + //4 digits
            //			// four most significant bits holds version number 5
            '-' + ((parseInt(hash.substring(12, 16), 16) & 0x0fff) | 0x5000).toString(16) +
            //			// two most significant bits holds zero and one for variant DCE1.1
            '-' + ((parseInt(hash.substring(16, 20), 16) & 0x3fff) | 0x8000).toString(16) +
            '-' + hash.substring(20, 32);	//12 digits
        /* jshint bitwise: true */
    };

    var rvalid = /^\{?[0-9a-f]{8}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{12}\}?$/i;

    // Convert a string UUID to binary format.
    //
    // @param   string  uuid
    // @return  string
    var bin = function (uuid) {
        if (!uuid.match(rvalid)) {	//Need a real UUID for this...
            return false;
        }

        // Get hexadecimal components of uuid
        var hex = uuid.replace(/[\-{}]/g, '');

        // Binary Value
        var bin = '';

        for (var i = 0; i < hex.length; i += 2) {	// Convert each character to a bit
            bin += String.fromCharCode(parseInt(hex.charAt(i) + hex.charAt(i + 1), 16));
        }

        return bin;
    };

})();