
const request = require('sync-request');

function Indicator(config) {
  this.input = 'candle';
  this.apiURL = config.apiURL || 'http://127.0.0.1:5000/api/inference';
  this.result = 0;
}

Indicator.prototype.update = function(candle) {
  try {
    const res = request('POST', this.apiURL, {
      json: { candle: candle },
      timeout: 10000 // 10 seconds
    });
    const data = JSON.parse(res.getBody('utf8'));
    this.result = Array.isArray(data.actions) ? data.actions[0] : data.action;
  } catch (e) {
    console.error('Sync HTTP error:', e.message);
    // Keep previous result on error
  }
  return this.result;
};

module.exports = Indicator;
