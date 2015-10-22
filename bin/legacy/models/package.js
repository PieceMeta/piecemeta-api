'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Package = new Schema({

        uuid: {type: String, unique: true},
        namespace: {type: String, required: true},
        user_uuid: {type: String, index: true, required: true},
        title: {type: String, required: true},
        description: {type: String},

        created: Date,
        updated: Date

    }, {
        autoindex: process.env.NODE_ENV !== 'production',
        id: false
    });

module.exports.Package = require('../lib/model-helper').setup(Package);