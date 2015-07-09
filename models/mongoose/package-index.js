'use strict';
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    PackageIndex = new Schema({
        uuid: {type: String, index: true},
        metadata: Schema.Types.Mixed,
        created: Number,
        updated: Number
    }, {
        autoindex: process.env.NODE_ENV !== 'production',
        id: false
    });

if (typeof PackageIndex.options.toJSON === 'undefined') {
    PackageIndex.options.toJSON = {};
}

PackageIndex.options.toJSON.transform = function (doc, ret) {
    filterParams(ret);
};

if (typeof PackageIndex.options.toObject === 'undefined') {
    PackageIndex.options.toObject = {};
}

PackageIndex.options.toObject.transform = function (doc, ret) {
    filterParams(ret);
};

PackageIndex.pre('save', function (next) {
    next();
});

function filterParams(obj) {
    delete obj.__v;
    delete obj._id;
}

module.exports.PackageIndex = PackageIndex;
