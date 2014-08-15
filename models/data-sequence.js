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

DataSequenceModel.pre('save', function (next) {
    'use strict';
    var now = Date.now();
    this.updated_at = now;
    if (!this.created_at) {
        this.created_at = now;
    }
    next();
});

module.exports.DataSequenceModel = DataSequenceModel;
