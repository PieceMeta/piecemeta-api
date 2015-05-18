(function () {
    'use strict';

    var hdf5 = require('hdf5').hdf5,
        Access = require('hdf5/lib/globals').Access,
        fileDb = require('../lib/util/filedb'),
        hdf5Handler = require('../lib/util/hdf5-response'),
        Promise = require('bluebird');

    Error.stackTraceLimit = 25;
    Promise.longStackTraces();

    module.exports = function (config) {
        return {
            find: function (req, res, next) {
                var query = {};
                var path = require('path');
                if (typeof config.query === 'object') {
                    if (typeof config.query.id_mapping === 'string') {
                        query[config.query.id_mapping] = req.params.uuid;
                    }
                    if (typeof config.query.user_mapping === 'string') {
                        query[config.query.user_mapping] = req.user.uuid;
                    }
                }
                var filterAsync = Promise.promisify(fileDb(config.storage_path).filter);
                var hdf5Access = require('../lib/util/hdf5-access');
                var getTreeAsync = Promise.promisify(hdf5Access.getTree);
                filterAsync(query)
                    .map(function (entry) {
                        var filePath = path.join(config.storage_path, entry),
                            uuid = path.basename(filePath, '.h5'),
                            file = new hdf5.File(filePath, Access.ACC_RDONLY);
                        return getTreeAsync(file)
                            .then(function (tree) {
                                file.close();
                                var result = {
                                    uuid: uuid,
                                    tree: tree
                                };
                                return result;
                            });
                    })
                    .then(function (data) {
                        res.send(200, data);
                        next();
                    })
                    .catch(function (err) {
                        console.error(err.stack);
                        res.send(hdf5Handler.handleError(err));
                        next();
                    });
            }
        };
    };

})();