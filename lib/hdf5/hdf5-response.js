(function () {
    'use strict';
    module.exports.handleError = function (err) {
        var restify = require('restify');
        if (err) {
            // TODO: add specific hdf5 errors
            console.log('hdf5 error', err);
            return err;
        } else {
            return null;
        }
    };
})();