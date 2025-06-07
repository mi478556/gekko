var request = require('superagent');
var Indicator = function(config) {
  this.input = 'candle';
  this.cache = [];
  this.agentURL = config.agentURL || 'http://127.0.0.1:5000/api/inference';
  this.initialized = false;

  // If full dataset is provided, send it once on init
  if (config.fullDataset && config.fullDataset.length) {
    request
      .post(this.agentURL)
      .send({ candle: config.fullDataset }) // full history
      .end((err, res) => {
        if (err) {
          console.error('RL init failed:', err.message);
          this.cache = [];
        } else {
          this.cache = res.body.actions;
        }
        this.initialized = true;
      });
  } else {
    this.initialized = true;
  }
};

Indicator.prototype.update = function(candle) {
  if (!this.initialized) {
    // Wait for init before doing anything
    return;
  }

  if (this.cache.length) {
    this.result = this.cache.shift();
  } else {
    request
      .post(this.agentURL)
      .send({ candle: candle })
      .end((err, res) => {
        if (err) {
          console.error('RL live call failed:', err.message);
          this.result = 0; // fallback to neutral action
        } else {
          this.result = res.body.action;
        }
      });
  }
};

module.exports = Indicator;
