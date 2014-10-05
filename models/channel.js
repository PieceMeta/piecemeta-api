(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        ChannelModel = Schema({

            package_id: { type: Schema.Types.ObjectId, index: true, required: true },
            user_id: { type: Schema.Types.ObjectId, index: true, required: true },
            title: { type: String, required: true },
            parent_channel_id: { type: Schema.Types.ObjectId, index: true },

            created: Date,
            updated: Date

        });

    if (typeof ChannelModel.options.toJSON === 'undefined') {
        ChannelModel.options.toJSON = {};
    }

    ChannelModel.options.toJSON.transform = function (doc, ret, options) {
        filterParams(ret);
    };

    ChannelModel.pre('save', function (next) {
        var now = Date.now();
        this.updated_at = now;
        if (!this.created_at) {
            this.created_at = now;
        }
        next();
    });

    function filterParams(obj) {
        obj.id = obj._id.toString();
        obj.package_id = obj.package_id.toString();
        obj.user_id = obj.user_id.toString();
        if (typeof obj.parent_channel_id !== 'undefined') obj.parent_channel_id = obj.parent_channel_id.toString();
        delete obj._id;
    }

    module.exports.ChannelModel = ChannelModel;
}());