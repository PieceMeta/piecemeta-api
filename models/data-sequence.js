(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        DataSequenceModel = Schema({

        author_id: Schema.Types.ObjectId,

        frame_count: Number,
        frame_duration: Number,
        frame_rate: Number,

        data_channels: Schema.Types.Mixed,

        created_at: Date,
        updated_at: Date

    });

    if (typeof DataSequenceModel.options.toJSON === 'undefined') {
        DataSequenceModel.options.toJSON = {};
    }

    DataSequenceModel.options.toJSON.transform = function (doc, ret, options) {
        ret.id = ret._id.toString();
        delete ret._id;
    };

    DataSequenceModel.pre('save', function (next) {
        var now = Date.now();
        this.updated_at = now;
        if (!this.created_at) {
            this.created_at = now;
        }
        next();
    });

    module.exports.DataSequenceModel = DataSequenceModel;
}());