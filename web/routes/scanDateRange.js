const _ = require('lodash');
const promisify = require('promisify-node');
const scan = promisify(require('../../core/workers/dateRangeScan/parent'));

// starts a scan
// requires a post body with configuration of:
//
// - config.watch
const route = async (ctx) => {
  try {
    var config = require('./baseConfig');

    _.merge(config, ctx.request.body);

    ctx.body = await scan(config);
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Internal Server Error' };
    console.error('Error in /api/scan route:', error);
  }
};

module.exports = route;
