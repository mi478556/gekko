var _ = require('lodash');
var util = require('../../core/util.js');
var config = util.getConfig();
var log = require(util.dirs().core + 'log');

var sqlite = require('./handle');
var sqliteUtil = require('./util');

var Reader = function() {
  // Bind all methods to `this`
  _.bindAll(this, [
    'mostRecentWindow',
    'tableExists',
    'get',
    'count',
    'countTotal',
    'getBoundry',
    'close'
  ]);
  this.db = sqlite.initDB(true);
};

// Returns the most recent window complete candle
// windows within `from` and `to`
Reader.prototype.mostRecentWindow = function(from, to, next) {
  to = to.unix();
  from = from.unix();

  var maxAmount = to - from + 1;

  this.db.all(
    `
    SELECT start from ${sqliteUtil.table('candles')}
    WHERE start <= ${to} AND start >= ${from}
    ORDER BY start DESC
  `,
    (err, rows) => {
      if (err) {
        // Bail out if the table does not exist
        if (err.message.split(':')[1] === ' no such table') return next(false);

        log.error(err);
        return util.die('DB error while reading mostRecentWindow');
      }

      // No candles are available
      if (rows.length === 0) {
        return next(false);
      }

      if (rows.length === maxAmount) {
        // Full history is available!
        return next({
          from: from,
          to: to
        });
      }

      // We have at least one gap, figure out where
      var mostRecent = _.first(rows).start;

      var gapIndex = _.findIndex(rows, (r, i) => {
        return r.start !== mostRecent - i * 60;
      });

      // If there was no gap in the records, but
      // there were not enough records.
      if (gapIndex === -1) {
        var leastRecent = _.last(rows).start;
        return next({
          from: leastRecent,
          to: mostRecent
        });
      }

      // Else return mostRecent and the
      // the minute before the gap
      return next({
        from: rows[gapIndex - 1].start,
        to: mostRecent
      });
    }
  );
};

Reader.prototype.tableExists = function(name, next) {
  this.db.all(
    `
    SELECT name FROM sqlite_master WHERE type='table' AND name='${sqliteUtil.table(name)}';
  `,
    (err, rows) => {
      if (err) {
        console.error(err);
        return util.die('DB error at `get`');
      }

      next(null, rows.length === 1);
    }
  );
};

Reader.prototype.get = function(from, to, what, next) {
  if (what === 'full') what = '*';

  this.db.all(
    `
    SELECT ${what} from ${sqliteUtil.table('candles')}
    WHERE start <= ${to} AND start >= ${from}
    ORDER BY start ASC
  `,
    (err, rows) => {
      if (err) {
        console.error(err);
        return util.die('DB error at `get`');
      }

      next(null, rows);
    }
  );
};

Reader.prototype.count = function(from, to, next) {
  this.db.all(
    `
    SELECT COUNT(*) as count from ${sqliteUtil.table('candles')}
    WHERE start <= ${to} AND start >= ${from}
  `,
    (err, res) => {
      if (err) {
        console.error(err);
        return util.die('DB error at `get`');
      }

      next(null, _.first(res).count);
    }
  );
};

Reader.prototype.countTotal = function(next) {
  this.db.all(
    `
    SELECT COUNT(*) as count from ${sqliteUtil.table('candles')}
  `,
    (err, res) => {
      if (err) {
        console.error(err);
        return util.die('DB error at `get`');
      }

      next(null, _.first(res).count);
    }
  );
};

Reader.prototype.getBoundry = function(next) {
  this.db.all(
    `
    SELECT
    (
      SELECT start
      FROM ${sqliteUtil.table('candles')}
      ORDER BY start LIMIT 1
    ) as 'first',
    (
      SELECT start
      FROM ${sqliteUtil.table('candles')}
      ORDER BY start DESC
      LIMIT 1
    ) as 'last'
  `,
    (err, rows) => {
      if (err) {
        console.error(err);
        return util.die('DB error at `get`');
      }

      next(null, _.first(rows));
    }
  );
};

Reader.prototype.close = function() {
  this.db.close();
  this.db = null;
};

module.exports = Reader;
