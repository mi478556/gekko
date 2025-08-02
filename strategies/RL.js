// var log = require('../core/log');

// var strat = {};

// method.init = function() {
//   this.input = 'candle';
//   this.currentTrend = 'long';
//   this.requiredHistory = 0;

//   this.addIndicator('rl', 'RL', this.settings);
// }

// method.update = function(candle) {
//   this.indicators.rl.update(candle);
// }

// // For debugging purposes.
// method.log = function() {
//   const rl = this.indicators.rl;
//   log.debug('RLInference result:', rl.result);
// }

// method.check = function() {
//   const rl = this.indicators.rl;
//   const action = rl.result;
//   console.log('Gekko RL indicator result:', action); // Debug print

//   // Guard: do nothing if result isn't ready yet
//   if (typeof action === 'undefined') {
//     log.debug('RLInference result not ready yet.');
//     return;
//   }

//   // Example: Interpret actions
//   // 1 = long, -1 = short, 0 = no advice
//   if (action === 1 && this.currentTrend !== 'long') {
//     this.currentTrend = 'long';
//     this.advice('long');
//   } else if (action === -1 && this.currentTrend !== 'short') {
//     this.currentTrend = 'short';
//     this.advice('short');
//   } else {
//     // No-op or already in correct trend
//     this.advice();
//   }
// }

// module.exports = strat;

/*

  RSI - cykedev 14/02/2014

  (updated a couple of times since, check git history)

 */
// helpers
var _ = require('lodash');
var log = require('../core/log.js');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function() {
  this.name = 'RL';

  this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false
  };

  this.requiredHistory = this.tradingAdvisor.historySize;

  // define the indicators we need
  this.addIndicator('rsi', 'RSI', this.settings);
  this.addIndicator('rl', 'RL', this.settings);
}

// for debugging purposes log the last
// calculated parameters.
method.log = function(candle) {
  var digits = 8;
  var rsi = this.indicators.rsi;

  log.debug('calculated RSI properties for candle:');
  log.debug('\t', 'rsi:', rsi.result.toFixed(digits));
  log.debug('\t', 'price:', candle.close.toFixed(digits));
}

method.check = function() {
  const rl = this.indicators.rl;
  const action = rl.result;
  console.log('Gekko RL indicator result:', action); // Debug print
  var rsi = this.indicators.rsi;
  var rsiVal = rsi.result;

  if(rsiVal > this.settings.thresholds.high) {

    // new trend detected
    if(this.trend.direction !== 'high')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'high',
        adviced: false
      };

    this.trend.duration++;

    log.debug('In high since', this.trend.duration, 'candle(s)');

    if(this.trend.duration >= this.settings.thresholds.persistence)
      this.trend.persisted = true;

    if(this.trend.persisted && !this.trend.adviced) {
      this.trend.adviced = true;
      this.advice('short');
    } else
      this.advice();

  } else if(rsiVal < this.settings.thresholds.low) {

    // new trend detected
    if(this.trend.direction !== 'low')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'low',
        adviced: false
      };

    this.trend.duration++;

    log.debug('In low since', this.trend.duration, 'candle(s)');

    if(this.trend.duration >= this.settings.thresholds.persistence)
      this.trend.persisted = true;

    if(this.trend.persisted && !this.trend.adviced) {
      this.trend.adviced = true;
      this.advice('long');
    } else
      this.advice();

  } else {

    log.debug('In no trend');

    this.advice();
  }
}

module.exports = method;
