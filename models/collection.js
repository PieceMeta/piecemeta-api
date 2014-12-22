(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        Collection = Schema({

            user_id: { type: Schema.Types.ObjectId, index: true, required: true },
            title: { type: String, required: true },
            description: { type: String },

            created: Date,
            updated: Date

        });

    if (typeof Collection.options.toJSON === 'undefined') {
        Collection.options.toJSON = {};
    }

    Collection.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    if (typeof Collection.options.toObject === 'undefined') {
        Collection.options.toObject = {};
    }

    Collection.options.toObject.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    Collection.pre('save', function (next) {
        var now = Date.now(),
            sanitizer = require('sanitizer');
        this.title = sanitizer.sanitize(this.title);
        this.description = sanitizer.sanitize(this.description);
        this.updated = now;
        if (!this.created) {
            this.created = now;
        }
        next();
    });

    function filterParams(obj) {
        delete obj.__v;
        obj.id = obj._id.toString();
        obj.user_id = obj.user_id.toString();
        delete obj._id;
    }

    module.exports.Collection = Collection;
}());