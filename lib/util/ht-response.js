'use strict';
module.exports.handleError = function (err) {
    if (err) {
        // TODO: add specific hdf5 errors
        console.log('hypertable error', err);
        return err;
    } else {
        return null;
    }
};
