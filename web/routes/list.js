const cache = require('../state/cache');

module.exports = function(name) {
  return async (ctx) => {
    const list = cache.get(name);
    if (list) {
      ctx.body = list.list();
    } else {
      ctx.status = 404;
      ctx.body = { error: 'Not found' };
    }
  };
};
