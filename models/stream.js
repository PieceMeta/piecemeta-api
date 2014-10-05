(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        StreamModel = Schema({

            channel_id: { type: Schema.Types.ObjectId, index: true, required: true },
            user_id: { type: Schema.Types.ObjectId, index: true, required: true },
            title: { type: String, required: true },
            group: { type: String, index: true },
            frames: [Number],
            fps: Number,

            created: Date,
            updated: Date

        });

    if (typeof StreamModel.options.toJSON === 'undefined') {
        StreamModel.options.toJSON = {};
    }

    StreamModel.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    if (typeof StreamModel.options.toObject === 'undefined') {
        StreamModel.options.toObject = {};
    }

    StreamModel.options.toObject.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    StreamModel.pre('save', function (next) {
        var now = Date.now();
        this.updated = now;
        if (!this.created) {
            this.created = now;
        }
        next();
    });

    function filterParams(obj) {
        obj.id = obj._id.toString();
        obj.channel_id = obj.channel_id.toString();
        obj.user_id = obj.user_id.toString();
        delete obj._id;
    }

    module.exports.StreamModel = StreamModel;
}());