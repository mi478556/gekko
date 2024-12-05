var _ = require('lodash');
var config = require('../../core/util.js').getConfig();

var sqlite = require('./handle');
var sqliteUtil = require('./util');
var util = require('../../core/util');
var log = require('../../core/log');

var Store = function(done, pluginMeta) {
  _.bindAll(this);
  this.done = done;

  this.db = sqlite.initDB(false);
  this.upsertTables().then(done).catch(util.die);

  this.cache = [];
  this.buffered = util.gekkoMode() === "importer";
};

Store.prototype.upsertTables = async function() {
  const createQueries = [
    `
      CREATE TABLE IF NOT EXISTS
      ${sqliteUtil.table('candles')} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start INTEGER UNIQUE,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        vwp REAL NOT NULL,
        volume REAL NOT NULL,
        trades INTEGER NOT NULL
      );
    `
    // TODO: create trades
    // ``

    // TODO: create advices
    // ``
  ];

  try {
    await this.db.run('BEGIN TRANSACTION');

    for (const query of createQueries) {
      await this.db.run(query);
    }

    await this.db.run('COMMIT');
  } catch (error) {
    await this.db.run('ROLLBACK');
    throw error;
  }
};

Store.prototype.writeCandles = async function() {
  if (_.isEmpty(this.cache)) return;

  try {
    await this.db.run('BEGIN TRANSACTION');

    const stmt = await this.db.prepare(`
      INSERT OR IGNORE INTO ${sqliteUtil.table('candles')}
      VALUES (?,?,?,?,?,?,?,?,?)
    `);

    for (const candle of this.cache) {
      await stmt.run(
        null,
        candle.start.unix(),
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.vwp,
        candle.volume,
        candle.trades
      );
    }

    await stmt.finalize();
    await this.db.run('COMMIT');
    // TEMP: should fix https://forum.gekko.wizb.it/thread-57279-post-59194.html#pid59194
    await this.db.run('pragma wal_checkpoint;');

    this.cache = [];
  } catch (error) {
    await this.db.run('ROLLBACK');
    log.error('DB error at INSERT:', error);
    throw error;
  }
};

var processCandle = function(candle, done) {
  this.cache.push(candle);
  if (!this.buffered || this.cache.length > 1000) 
    this.writeCandles().then(done).catch(util.die);
  else
    done();
};

var finalize = function(done) {
  this.writeCandles().then(() => {
    this.db.close(done);
    this.db = null;
  }).catch(util.die);
};

if(config.candleWriter.enabled) {
  Store.prototype.processCandle = processCandle;
  Store.prototype.finalize = finalize;
}

// TODO: add storing of trades / advice?

// var processTrades = function(candles) {
//   util.die('NOT IMPLEMENTED');
// }

// var processAdvice = function(candles) {
//   util.die('NOT IMPLEMENTED');
// }

// if(config.tradeWriter.enabled)
//  Store.prototype.processTrades = processTrades;

// if(config.adviceWriter.enabled)
//   Store.prototype.processAdvice = processAdvice;

module.exports = Store;
