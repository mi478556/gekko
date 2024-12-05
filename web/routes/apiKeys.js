const cache = require('../state/cache');
const manager = cache.get('apiKeyManager');

module.exports = {
  get: async (ctx) => {
    ctx.body = manager.get();
  },
  add: async (ctx) => {
    const content = ctx.request.body;

    manager.add(content.exchange, content.values);

    ctx.body = {
      status: 'ok'
    };
  },
  remove: async (ctx) => {
    const exchange = ctx.request.body.exchange;

    manager.remove(exchange);

    ctx.body = {
      status: 'ok'
    };
  }
};
