'use strict';

var define = require("node-constants")(exports),
    _debug = typeof v8debug === 'object';

define({
    PM_LMDB_PAD_FRAMENUM: 12,
    PM_LMDB_SEP_FRAMES: '/f/'
});

module.exports.errorHandler = function (err) {
    if (_debug) {
        console.log(err.stack);
    }

    throw err;
};

module.exports.evaluateTicks = function (title, tick) {
    if (_debug) {
        console.log(
            'DEBUG STATS:', title, 'took',
            [tick.duration(), tick.min(), tick.max(), tick.mean(), tick.median()].join('/'),
            '(last/min/max/mean/median)'
        );
    }
};

module.exports.padNumber = function (num, w) {
    num = num.toString();

    if (num.length >= w) {
        return num;
    } else {
        return new Array(w - num.length + 1).join('0') + num;
    }
};

module.exports.getKey = function (uuid, separator, frameNum) {
    var key = uuid;

    key += separator || '';

    if (typeof frameNum === 'number') {
        key += module.exports.padNumber(frameNum, module.exports.PM_LMDB_PAD_FRAMENUM);
    }

    return key;
};

module.exports.getFrameNumber = function (frameKey, separator) {
    var info = frameKey.split(separator);

    if (info.length === 2) {
        return {stream_uuid: info[0], frame_number: parseInt(info[1])};
    } else {
        return null;
    }
};