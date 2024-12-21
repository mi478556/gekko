var BATCH_SIZE = 60; // minutes
var MISSING_CANDLES_ALLOWED = 3; // minutes, per batch
var async = require('async');

var _ = require('lodash');
var moment = require('moment');
var util = require('../util');
var config = util.getConfig();
var dirs = util.dirs();
var log = require(dirs.core + 'log');

var adapter = config[config.adapter];
var Reader = require(dirs.gekko + adapter.path + '/reader');

var reader = new Reader();

var scan = async function (done) {
  log.info('Scanning local history for backtestable dateranges.');

  try {
    const tableExists = await new Promise((resolve, reject) => {
      reader.tableExists('candles', (err, exists) => {
        if (err) return reject(err);
        resolve(exists);
      });
    });

    if (!tableExists) return done(null, [], reader);

    const res = await new Promise((resolve, reject) => {
      async.parallel(
        {
          boundry: reader.getBoundry,
          available: reader.countTotal,
        },
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });

    const { first, last } = res.boundry;
    const optimal = (last - first) / 60;

    log.debug('Available', res.available);
    log.debug('Optimal', optimal);

    if (res.available === optimal + 1) {
      log.info('Gekko is able to fully use the local history.');
      return done(false, [{ from: first, to: last }], reader);
    }

    const missing = optimal - res.available + 1;
    log.info(`The database has ${missing} candles missing, Figuring out which ones...`);

    let iterator = {
      from: last - BATCH_SIZE * 60,
      to: last,
    };

    let batches = [];

    while (iterator.from > first) {
      const count = await new Promise((resolve, reject) => {
        reader.count(iterator.from, iterator.to, (err, count) => {
          if (err) return reject(err);
          resolve(count);
        });
      });

      const complete = count + MISSING_CANDLES_ALLOWED > BATCH_SIZE;

      if (complete) {
        batches.push({
          to: iterator.to,
          from: iterator.from,
        });
      }

      iterator.from -= BATCH_SIZE * 60;
      iterator.to -= BATCH_SIZE * 60;
    }

    if (batches.length === 0) {
      return done(null, [], reader);
    }

    // Consolidate overlapping or consecutive batches
    let ranges = [batches.shift()];

    _.each(batches, (batch) => {
      const curRange = _.last(ranges);
      if (batch.to === curRange.from) {
        // Extend the current range backward
        curRange.from = batch.from;
      } else {
        // Add a new range
        ranges.push(batch);
      }
    });

    // Ensure ranges cover the full data from `first` to `last`
    if (ranges[0].from > first) {
      ranges.unshift({ from: first, to: ranges[0].from });
    }

    if (_.last(ranges).to < last) {
      ranges.push({ from: _.last(ranges).to, to: last });
    }

    // Reverse ranges for chronological order and finalize
    ranges = _.map(ranges.reverse(), (r) => ({
      from: r.from,
      to: r.to,
    }));

    log.info(`Found ${ranges.length} valid data ranges.`);

    return done(false, ranges, reader);
  } catch (err) {
    log.error('Error during scanning:', err);
    return done(err, null, reader);
  }
};

module.exports = scan;
