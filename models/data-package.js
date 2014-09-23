(function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        DataPackageModel = Schema({

            contributor_id: { type: Schema.Types.ObjectId, index: true, required: true },
            title: { type: String, required: true },
            description: { type: String },

            created_at: Date,
            updated_at: Date

        });

    if (typeof DataPackageModel.options.toJSON === 'undefined') {
        DataPackageModel.options.toJSON = {};
    }

    DataPackageModel.options.toJSON.transform = function (doc, ret, options) {
        ret.id = ret._id.toString();
        delete ret._id;
    };

    DataPackageModel.pre('save', function (next) {
        var now = Date.now();
        this.updated_at = now;
        if (!this.created_at) {
            this.created_at = now;
        }
        next();
    });

    module.exports.DataPackageModel = DataPackageModel;
}());