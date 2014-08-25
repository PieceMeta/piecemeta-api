(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        DataChannelModel = Schema({

            data_package_id: { type: Schema.Types.ObjectId, index: true },
            title: String,
            parent_data_channel_id: { type: Schema.Types.ObjectId, index: true },

            created_at: Date,
            updated_at: Date

        });

    if (typeof DataChannelModel.options.toJSON === 'undefined') {
        DataChannelModel.options.toJSON = {};
    }

    DataChannelModel.options.toJSON.transform = function (doc, ret, options) {
        ret.id = ret._id.toString();
        delete ret._id;
    };

    DataChannelModel.pre('save', function (next) {
        var now = Date.now();
        this.updated_at = now;
        if (!this.created_at) {
            this.created_at = now;
        }
        next();
    });

    module.exports.DataChannelModel = DataChannelModel;
}());