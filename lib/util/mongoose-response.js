'use strict';
module.exports.handleError = function (err) {
    var restify = require('restify');
    if (err) {
        if (err.name === 'ValidationError') {
            return new restify.InvalidContentError({
                message: 'Validation failed',
                body: {
                    message: 'Validation failed',
                    errors: err.errors
                }
            });
        } else if (err.name === 'CastError') {
            return new restify.BadRequestError();
        } else {
            console.log('mongo error', err);
            return err;
        }
    } else {
        return null;
    }
};
