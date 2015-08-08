'use strict';
module.exports.handleError = function (err) {
    if (err) {
        // TODO: add specific lmdb errors
        console.log('lmdb error', err);
        return err;
    } else {
        return null;
    }
};
