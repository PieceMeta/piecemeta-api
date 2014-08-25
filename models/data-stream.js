(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        DataStreamModel = Schema({

            data_channel_id: { type: Schema.Types.ObjectId, index: true },
            title: String,
            group: { type: String, index: true },
            data_frames: [Number],
            value_offset: { type: Number, default: 0.0 },
            frame_count: Number,
            frame_duration: Number,
            frame_rate: Number,

            created_at: Date,
            updated_at: Date

        });

    if (typeof DataStreamModel.options.toJSON === 'undefined') {
        DataStreamModel.options.toJSON = {};
    }

    DataStreamModel.options.toJSON.transform = function (doc, ret, options) {
        ret.id = ret._id.toString();
        delete ret._id;
    };

    DataStreamModel.pre('save', function (next) {
        var now = Date.now();
        this.updated_at = now;
        if (!this.created_at) {
            this.created_at = now;
        }
        next();
    });

    module.exports.DataStreamModel = DataStreamModel;
}());