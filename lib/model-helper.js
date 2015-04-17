(function () {
    'use strict';
    module.exports.setup = function (schema) {

        function filterParams(obj) {
            delete obj.__v;
            delete obj._id;
        }

        if (typeof schema.options.toJSON === 'undefined') {
            schema.options.toJSON = {};
        }

        schema.options.toJSON.transform = function (doc, ret) {
            filterParams(ret);
        };

        if (typeof schema.options.toObject === 'undefined') {
            schema.options.toObject = {};
        }

        schema.options.toObject.transform = function (doc, ret) {
            filterParams(ret);
        };

        schema.methods.generateUUID = function () {
            var uuid = require('./util/uuid');
            this.uuid = uuid.v4();
        };

        schema.pre('save', function (next) {
            var now = Date.now(),
                sanitizer = require('sanitizer');
            if (typeof this.title !== 'undefined') {
                this.title = sanitizer.sanitize(this.title);
            }
            if (typeof this.description !== 'undefined') {
                this.description = sanitizer.sanitize(this.description);
            }
            this.updated = now;
            if (!this.created) {
                this.created = now;
            }
            if (!this.uuid) {
                this.generateUUID();
            }
            next();
        });

        return schema;
    };
})();