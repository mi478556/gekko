
const WebSocket = require('ws');

function RLInference(config) {
  this.input = 'candle';
  this.cache = [];
  this.agentURL = config.agentURL || 'ws://127.0.0.1:5000/ws/inference';
  this.initialized = false;

  this.ws = new WebSocket(this.agentURL);

  this.ws.on('open', () => {
    this.initialized = true;
    if (config.fullDataset && config.fullDataset.length) {
      this.ws.send(JSON.stringify({ candle: config.fullDataset }));
    }
  });

  this.ws.on('message', (data) => {
    try {
      const res = JSON.parse(data);
      if (Array.isArray(res.actions)) {
        this.cache = res.actions;
      } else if (res.action !== undefined) {
        this.result = res.action;
      }
    } catch (e) {
      console.error('WebSocket message parse error:', e.message);
    }
  });

  this.ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
}

RLInference.prototype.update = function(candle) {
  if (!this.initialized) return;
  if (this.cache.length) {
    this.result = this.cache.shift();
  } else {
    this.ws.send(JSON.stringify({ candle: candle }));
    this.result = 0;
  }
};

module.exports = RLInference;
