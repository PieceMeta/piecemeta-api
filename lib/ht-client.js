'use strict';

var Promise = require('bluebird'),
    util = require('util'),
    Transform = require('stream').Transform,
    hypertable = require('hypertable'),
    Timestamp = require('hypertable/timestamp'),
    client;

function CellWriteStream(options) {
    if (!(this instanceof CellWriteStream)) {
        return new CellWriteStream(options);
    }
    Transform.call(this, options);
}

CellWriteStream.prototype._transform = function (chunk, encoding, done) {
    this.push(chunk);
    done();
};

util.inherits(CellWriteStream, Transform);

module.exports.connect = function (host, port) {
    client = new hypertable.ThriftClient(host, port);
    Promise.promisifyAll(client);
};

module.exports.createNamespace = function (path) {
    return client.namespace_existsAsync(path)
        .then(function (exists) {
            if (exists) {
                return module.exports.openNamespace(path);
            } else {
                return client.namespace_createAsync(path)
                    .then(function (ns) {
                        return ns;
                    });
            }
        });
};

module.exports.openNamespace = function (path) {
    return client.namespace_openAsync(path)
        .then(function (a,b,c,d) {
            console.log(a, b, c, d);
            return a;
        });
};

module.exports.closeNamespace = function (namespace) {
    return client.namespace_closeAsync(namespace);
};

module.exports.createTable = function (namespace, title, schema) {
    return client.table_createAsync(namespace, title, schema);
};

module.exports.dropTable = function (namespace, title) {
    return client.table_dropAsync(namespace, title, true);
};

module.exports.listTables = function (namespace) {
    return getNamespaceListing(namespace, false);
};

module.exports.listNamespaces = function (namespace) {
    return getNamespaceListing(namespace, true);
};

module.exports.setCells = function (namespace, uuid, labels, rows, start) {
    var batches = [];
    var rowIndex = 0;
    for (var n=0; n<Math.ceil(rows.length/500); n+=1) {
        var batch = rows.splice(0, 500, 500);
        batches.push(batch);
    }
    return Promise.map(batches, function (batch) {
            var writer = new hypertable.SerializedCellsWriter(batch.length*labels.length);
            var rowcount = batch.length;
            for (var i = 0; i < rowcount; i += 1) {
                //var ts = new Timestamp(rows[i].time);
                for (var c=0; c<batch[i].length; c+=1) {
                    var key = new hypertable.Key({row: getRowId(start + rowIndex), column_family: labels[c]});//, timestamp: ts});
                    var cell = new hypertable.Cell({key: key, value: new Buffer(batch[i][c])});
                    writer.add(cell);
                }
                rowIndex += 1;
            }
            return client.set_cells_serializedAsync(namespace, uuid, writer.getBuffer());
        }, {concurrency: 1})
        .catch(function (err) {
            console.log(err.stack);
            throw err;
        });
};

module.exports.getCells = function (namespace, uuid, labels, from, to, interval) {
    var scanSpec, scanner;
    var cellData = [];
    if (!interval) {
        interval = 1;
    }
    return Promise.resolve()
        .then(function () {
            var rowIntervals = [];
            for (var n = 0; n < to / interval; n += 1) {
                var rowInterval;
                var intervalConfig = {};
                if (typeof from === 'number' && typeof to === 'number') {
                    intervalConfig.start_row = getRowId(from*interval);
                    intervalConfig.start_inclusive = true;
                    intervalConfig.end_row = getRowId(Math.round(to/interval));
                    intervalConfig.end_inclusive = false;
                }
                rowInterval = new hypertable.RowInterval(intervalConfig);
                rowIntervals.push(rowInterval);
            }
            var columns = [];
            for (var i=0; i<labels.length; i+=1) {
                if (typeof labels[i] === 'string') {
                    columns.push(labels[i]);
                }
            }
            scanSpec = new hypertable.ScanSpec({
                row_intervals: rowIntervals,
                versions: 1, columns: columns
            });
            return client.scanner_openAsync(namespace, uuid, scanSpec);
        })
        .then(function (s) {
            scanner = s;
            function loop(result) {
                if (result) {
                    return client.scanner_get_cellsAsync(scanner)
                        .then(function (cells) {
                            console.log('add cells', cells.length);
                            if (cells.length > 0) {
                                cellData = cellData.concat(cells);
                                return true;
                            } else {
                                return false;
                            }
                        }).then(loop);
                }
            }
            return loop(true);
        })
        .then(function () {
            console.log(cellData.length);
            return cellData;
        })
        .catch(function (err) {
            console.log(err.stack);
            throw err;
        });
};

function getNamespaceListing(namespace, listChildNamespaces) {
    return client.namespace_get_listingAsync(namespace)
        .then(function (listing) {
            var results = [];
            for (var i = 0; i < listing.length; i++) {
                if (listing[i].is_namespace) {
                    if (listChildNamespaces) {
                        results.push(listing[i]);
                    }
                } else {
                    results.push(listing[i]);
                }
            }
            return results;
        });
}

function getRowId(index) {
    return padNumber(index, 16);
}

function padNumber(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}