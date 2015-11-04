'use strict';

var Model = require('node-schema-object'),
    Promise = require('bluebird'),
    search = require('../search'),
    lmdbSys = require('./sys');

class LmdbModel extends Model {
    constructor() {
        this.doc = super(this.schema);
    }

    save() {
        return Promise.coroutine(function* () {
            yield this.onSave();

            // TODO: properly validate uuid
            if (typeof this.uuid !== 'string') {
                this.doc.uuid = require('../util/uuid').v4();
            }

            var dbi = yield lmdbSys.openDb(this.constructor.name),
                txn = lmdbSys.getEnv().beginTxn();

            txn.putBinary(dbi, this.doc.uuid, this.toMsgpack());
            txn.commit();

            yield lmdbSys.closeDb(dbi);

            yield search.index(this.constructor.name)
                .add(this.toObject(), this.constructor.name);

            return true;
        })();
    }

    remove() {
        return Promise.coroutine(function* () {
            yield this.onRemove();

            var dbi = yield lmdbSys.openDb(this.constructor.name),
                txn = lmdbSys.getEnv().beginTxn();

            txn.del(dbi, this.doc.uuid);
            txn.commit();

            yield lmdbSys.closeDb(dbi);

            return true;
        })();
    }

    onRemove() {
        return Promise.resolve();
    }

    onSave() {
        return Promise.resolve();
    }

    toObject() {
        return this.doc.toObject();
    }

    toJSON() {
        return JSON.stringify(this.toObject());
    }

    toMsgpack() {
        return require('msgpack').pack(this.toObject());
    }
}

module.exports = LmdbModel;