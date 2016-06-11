'use strict';

var fs = require('fs'),
    path = require('path'),
    Promise = require('bluebird'),
    config = require('../lib/config'),
    PiecemetaLmdb = require('piecemeta-lmdb').default,
    argv = require('yargs').argv, client;

if (!argv.file) argv.file = '/Volumes/XTND/DevProjects/nanobrain-server/import/test.csv';

var readCsv = Promise.promisify(function (filename, cb) {
    let parse = require('csv-parse'),
        output = [],
        count = 0,
        input = fs.createReadStream(filename),
        parser = parse({delimiter: ',', trim: true});

    parser.on('readable', function () {
        let record;
        while ((record = parser.read())) {
            if (count !== 0) {
                for (let i in record) {
                    record[i] = parseFloat(record[i]);
                }
            }
            output.push(record);
            count += 1;
        }
        if (count % 1000 === 0) {
            console.log(count);
        }
    });
    parser.on('error', function (err) {
        cb(err);
    });
    parser.on('finish', function () {
        cb(null, output);
    });
    input.on('error', function (err) {
        cb(err);
    });
    input.pipe(parser).on('close', function () {
        parser.end();
    });
});

Promise.coroutine(function* () {
    yield config.load();

    client = new PiecemetaLmdb();
    yield client.open('../data/lmdb', '../data/index', 256 * 1024 * 1024, 256);

    let data = yield readCsv(argv.file),
        labels = data.shift(),
        valCount = labels.length,
        valueLength = 4,
        frameCount = data.length,
        frameSize = valCount * valueLength,
        buffer = new Buffer(frameCount * frameSize),
        writeConfig = {
            from: 0,
            valueLength: valueLength,
            valueCount: valCount,
            format: 'float'
        };

    let pkg = yield client.meta.create('Package', {
        title: 'NanoBrains',
        description: 'NanoBrain Data imported from CSV'
    });
    pkg = pkg.toObject();

    let channel = yield client.meta.create('Channel', {
        title: path.basename(argv.file),
        description: 'NanoBrain Data imported from CSV',
        package_uuid: pkg.uuid
    });
    channel = channel.toObject();

    let stream = yield client.meta.create('Stream', {
        title: 'Recording',
        package_uuid: pkg.uuid,
        channel_uuid: channel.uuid,
        labels: labels,
        format: 'float',
        fps: 0,
        frameCount: data.length
    });
    stream = stream.toObject();

    for (let i = 0; i < frameCount; i += 1) {
        for (let v = 0; v < valCount; v += 1) {
            buffer.writeFloatLE(data[i][v], frameSize * i + v * valueLength);
        }
    }

    yield client.stream.putStreamData(stream, buffer, writeConfig);

    console.log('Finished.');
    process.exit(0);
})().catch((err) => {
    console.log('Failed with error:', err.message);
    process.exit(1);
});