(function () {
    'use strict';

    var hdf5 = require('hdf5').hdf5,
        Access = require('hdf5/lib/globals').Access,
        fileDb = require('../lib/hdf5/filedb'),
        hdf5Handler = require('../lib/hdf5/hdf5-response'),
        Promise = require('bluebird'),
        path = require('path');

    Error.stackTraceLimit = 25;
    Promise.longStackTraces();

    module.exports = function (config) {
        return {
            find: function (req, res, next) {
                var query = {};
                query = require('../lib/util/query-mapping')(query, req, config);
                var filterAsync = Promise.promisify(fileDb(config.storage_path).filter);
                var hdf5Access = require('../lib/hdf5/hdf5-access');
                var getTreeAsync = Promise.promisify(hdf5Access.getTree);
                filterAsync(query)
                    .map(function (entry) {
                        var filePath = path.join(config.storage_path, entry),
                            file = new hdf5.File(filePath, Access.ACC_RDONLY);
                        return getTreeAsync(file)
                            .then(function (tree) {
                                file.close();
                                var result = {},
                                    elements = [];
                                for (var i = 0; i < tree.length; i += 1) {
                                    if (tree[i].hasOwnProperty('hdf5')) {
                                        if (tree[i].hdf5.label === '__piecemeta') {
                                            result = tree[i];
                                        } else {
                                            elements.push(tree[i]);
                                        }
                                    }
                                }
                                result.children = elements;
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
            },
            post: function (req, res, next) {
                var fs = require('fs-extra'),
                    user_uuid = req.user.uuid,
                    uuid = require('../lib/util/uuid').v4(),
                    userdir = path.join(config.storage_path, user_uuid),
                    filePath = path.join(config.storage_path, user_uuid, uuid + '.h5');
                var ensureDirAsync = Promise.promisify(fs.ensureDir);
                ensureDirAsync(userdir)
                    .then(function () {
                        var metadata = req.body;
                        metadata.uuid = uuid;
                        metadata.contributor_uuid = req.user.uuid;
                        var file = new hdf5.File(filePath, Access.ACC_CREAT);
                        var metaGroup = file.createGroup('__piecemeta');
                        for (var key in metadata) {
                            if (typeof metadata[key] === 'string') {
                                metaGroup[key] = metadata[key];
                            }
                        }
                        metaGroup.flush();
                        metaGroup.close();
                        file.close();
                        res.send(200, metadata);
                        next();
                    })
                    .catch(function (err) {
                        console.log(err.stack);
                        res.send(hdf5Handler.handleError(err));
                        next();
                    });
            }
        };
    };

})();