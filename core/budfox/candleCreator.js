var _ = require('lodash');
var moment = require('moment');
var util = require(__dirname + '/../util');

var CandleCreator = function () {
  _.bindAll(this, 'filter', 'fillBuckets', 'calculateCandles', 'calculateCandle', 'addEmptyCandles');

  // TODO: remove fixed date
  this.threshold = moment("1970-01-01", "YYYY-MM-DD");

  // This also holds the leftover between fetches
  this.buckets = {};
}

util.makeEventEmitter(CandleCreator);

CandleCreator.prototype.write = function (batch) {
  const trades = batch.data;

  if (_.isEmpty(trades)) {
    return;
  }

  const filteredTrades = this.filter(trades);
  this.fillBuckets(filteredTrades);

  let candles = this.calculateCandles();
  candles = this.addEmptyCandles(candles);

  if (_.isEmpty(candles)) {
    return;
  }

  this.threshold = candles.pop().start;

  this.emit('candles', candles);
}

CandleCreator.prototype.filter = function (trades) {

  const filteredTrades = trades.filter(trade => trade.date > this.threshold);

  return filteredTrades;
}

CandleCreator.prototype.fillBuckets = function (trades) {

  trades.forEach(trade => {
    const minute = trade.date.format('YYYY-MM-DD HH:mm');

    if (!(minute in this.buckets)) {
      this.buckets[minute] = [];
    }

    this.buckets[minute].push(trade);
  });

  this.lastTrade = _.last(trades);
}

CandleCreator.prototype.calculateCandles = function () {
  const minutes = Object.keys(this.buckets);
  const lastMinute = this.lastTrade?.date.format('YYYY-MM-DD HH:mm');

  const candles = minutes.map(name => {
    const candle = this.calculateCandle(this.buckets[name]);

    // clean all buckets, except the last one
    if (name !== lastMinute) {
      delete this.buckets[name];
    }

    return candle;
  });

  return candles;
}

CandleCreator.prototype.calculateCandle = function (trades) {
  const first = _.first(trades);
  const f = parseFloat;

  const candle = {
    start: first.date.clone().startOf('minute'),
    open: f(first.price),
    high: f(first.price),
    low: f(first.price),
    close: f(_.last(trades).price),
    vwp: 0,
    volume: 0,
    trades: trades.length
  };

  trades.forEach(trade => {
    candle.high = Math.max(candle.high, f(trade.price));
    candle.low = Math.min(candle.low, f(trade.price));
    candle.volume += f(trade.amount);
    candle.vwp += f(trade.price) * f(trade.amount);
  });

  candle.vwp /= candle.volume;

  return candle;
}

CandleCreator.prototype.addEmptyCandles = function (candles) {
  const amount = candles.length;
  if (!amount) return candles;

  let start = candles[0].start.clone();
  const end = candles[candles.length - 1].start;

  const minutes = candles.map(candle => +candle.start);

  while (start < end) {
    start.add(1, 'm');
    const i = +start;

    if (minutes.includes(i)) continue; // we have a candle for this minute

    const lastPrice = candles[candles.length - 1].close;

    candles.push({
      start: start.clone(),
      open: lastPrice,
      high: lastPrice,
      low: lastPrice,
      close: lastPrice,
      vwp: lastPrice,
      volume: 0,
      trades: 0
    });
  }

  return candles;
}

module.exports = CandleCreator;
