'use strict';

module.exports = function (query, req, config) {
    if (typeof config.query === 'object') {
        if (typeof config.query.id_mapping === 'string') {
            query[config.query.id_mapping] = req.params.uuid;
        }
        if (typeof config.query.user_mapping === 'string') {
            query[config.query.user_mapping] = req.user.uuid;
        }
    }
    return query;
};
