const _ = require('lodash');
const fs = require('fs').promises; // Use fs.promises for async/await support

const gekkoRoot = __dirname + '/../../';
var util = require(__dirname + '/../../core/util');

var config = {};

config.debug = false;
config.silent = false;

util.setConfig(config);

module.exports = async (ctx) => {
  try {
    const exchangesDir = await fs.readdir(gekkoRoot + 'exchange/wrappers/');
    const exchanges = exchangesDir
      .filter(f => f.endsWith('.js')) // Use endsWith to filter .js files
      .map(f => f.slice(0, -3));

    let allCapabilities = [];

    for (const exchange of exchanges) {
      let Trader = null;

      try {
        Trader = require(gekkoRoot + 'exchange/wrappers/' + exchange);
      } catch (e) {
        console.log(e)
        continue;
      }

      if (!Trader || !Trader.getCapabilities) {
        continue;
      }

      allCapabilities.push(Trader.getCapabilities());
    }

    ctx.body = allCapabilities;
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Internal Server Error' };
    console.error('Error in /api/exchanges route:', error);
  }
};
