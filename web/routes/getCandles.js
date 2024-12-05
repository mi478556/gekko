const _ = require('lodash');
const promisify = require('tiny-promisify');
const candleLoader = promisify(require('../../core/workers/loadCandles/parent'));
const base = require('./baseConfig');

module.exports = async (ctx) => {
  try {
    let config = {};
    _.merge(config, base, ctx.request.body);
    ctx.body = await candleLoader(config);
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Internal Server Error' };
    console.error('Error in /api/getCandles route:', error);
  }
};
