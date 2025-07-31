var log = require('../core/log');

var strat = {};

strat.init = function() {
  this.input = 'candle';
  this.currentTrend = 'long';
  this.requiredHistory = 0;

  this.addIndicator('rl', 'RL', this.settings);
}

strat.update = function(candle) {
  this.indicators.rl.update(candle);
}

// For debugging purposes.
strat.log = function() {
  const rl = this.indicators.rl;
  log.debug('RLInference result:', rl.result);
}

strat.check = function() {
  const rl = this.indicators.rl;
  const action = rl.result;

  // Guard: do nothing if result isn't ready yet
  if (typeof action === 'undefined') {
    log.debug('RLInference result not ready yet.');
    return;
  }

  // Example: Interpret actions
  // 1 = long, -1 = short, 0 = no advice
  if (action === 1 && this.currentTrend !== 'long') {
    this.currentTrend = 'long';
    this.advice('long');
  } else if (action === -1 && this.currentTrend !== 'short') {
    this.currentTrend = 'short';
    this.advice('short');
  } else {
    // No-op or already in correct trend
    this.advice();
  }
}

module.exports = strat;