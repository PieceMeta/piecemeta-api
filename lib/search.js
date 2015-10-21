'use strict';

var Promise = require('bluebird'),
    fs = require('fs-extra'),
    mkdirp = Promise.promisify(fs.mkdirp),
    basepath;

module.exports.setBasepath = function (path) {
    basepath = require('path').resolve(path);
    return mkdirp(basepath);
};

module.exports.index = function (resource) {
    var si = require('si')({ indexPath: require('path').join(basepath, resource) }),
        addAsync = Promise.promisify(si.add),
        delAsync = Promise.promisify(si.del),
        searchAsync = Promise.promisify(si.search);
    return {
        si: si,
        query: function (query) {
            return searchAsync({ query: query });
        },
        add: function (document, schema) {
            var properties = Object.keys(schema),
                indexFields = [];
            for (var i = 0; i < properties.length; i += 1) {
                if (schema[properties[i]].hasOwnProperty('index')) {
                    indexFields.push({ fieldName: properties[i] });
                }
            }
            return addAsync(document, { fieldOptions: indexFields });
        },
        remove: function (documentId) {
            return delAsync(documentId);
        }
    };
};