'use strict';

module.exports.queryIndex = function (uuid, callback) {
    require('mongoose').model('PackageIndex').findOne({ uuid: uuid }, callback);
};

module.exports.addToIndex = function (package_uuid, data, fileStats, callback) {
    var metadata = {};
    for (var key in data) {
        if (typeof data[key] !== 'function' && key.indexOf('uuid') > -1) {
            metadata[key] = data[key];
        }
    }
    var indexEntry = {
        uuid: package_uuid,
        metadata: metadata,
        created: fileStats.ctime.getTime(),
        updated: fileStats.mtime.getTime()
    };
    require('mongoose').model('PackageIndex').findOneAndUpdate({uuid: package_uuid}, indexEntry, {upsert: true}, function (err) {
        callback(err);
    });
};

module.exports.removeFromIndex = function (uuid, callback) {
    require('mongoose').model('PackageIndex').findOneAndRemove({uuid: uuid}, function (err) {
        callback(err);
    });
};
