'use strict';

var workerFarm = require('worker-farm'),
    packageIndexUpdate = require.resolve('../workers/package-index-update'),
    indexUpdateQueue = workerFarm({
        maxCallsPerWorker: 1,
        maxConcurrentWorkers: 1,
        maxConcurrentCallsPerWorker: 1,
        maxConcurrentCalls: 1,
        maxCallTime: Infinity,
        maxRetries: 10,
        autoStart: false
    }, packageIndexUpdate);

module.exports.updatePackageIndex = function (config) {
    indexUpdateQueue(config, function (err) {
        if (err) {
            console.log('package indexer failed with error: ', err);
        }
    });
};
