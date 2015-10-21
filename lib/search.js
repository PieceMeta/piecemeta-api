'use strict';

var Promise = require('bluebird'),
    fs = require('fs-extra'),
    mkdirp = Promise.promisify(fs.mkdirp),
    _basepath, indexes = {};

module.exports.setBasepath = function (basepath) {
    _basepath = require('path').resolve(basepath);
    console.log('Using search index folder at %s', _basepath);
    return mkdirp(_basepath);
};

module.exports.index = function (resource) {
    var si;
    if (indexes.hasOwnProperty(resource)) {
        si = indexes[resource];
    } else {
        si = require('search-index')({indexPath: require('path').join(_basepath, resource)});
        indexes[resource] = si;
    }
    return {
        si: si,
        query: function (query) {
            return Promise.promisify(si.search)({query: query});
        },
        add: function (document, schema) {
            var properties = Object.keys(schema),
                indexFields = [];
            for (var i = 0; i < properties.length; i += 1) {
                if (schema[properties[i]].hasOwnProperty('index')) {
                    indexFields.push(properties[i]);
                }
            }
            return Promise.promisify(si.add)(document, {
                fieldOptions: { fieldName: indexFields },
                separator: /[ (\n)]+/
            });
        },
        remove: function (documentId) {
            return Promise.promisify(si.del)(documentId);
        },
        clear: function () {
            return Promise.promisify(si.empty)();
        },
        stat: function () {
            return Promise.promisify(function (cb) {
                si.tellMeAboutMySearchIndex(function (stat) {
                    cb(null, stat);
                });
            })();
        }
    };
};