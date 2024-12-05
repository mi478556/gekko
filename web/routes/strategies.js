const _ = require('lodash');
const fs = require('fs').promises; // Use fs.promises for async/await support

const gekkoRoot = __dirname + '/../../';

module.exports = async (ctx) => {
  try {
    const strategyDir = await fs.readdir(gekkoRoot + 'strategies');
    const strats = strategyDir
      .filter(f => f.endsWith('.js'))
      .map(f => {
        return { name: f.slice(0, -3) }
      });

    // for every strat, check if there is a config file and add it
    const stratConfigPath = gekkoRoot + 'config/strategies';
    const strategyParamsDir = await fs.readdir(stratConfigPath);

    for(let i = 0; i < strats.length; i++) {
      let strat = strats[i];
      if(strategyParamsDir.includes(strat.name + '.toml')) {
        strat.params = await fs.readFile(stratConfigPath + '/' + strat.name + '.toml', 'utf8');
      } else {
        strat.params = '';
      }
    }

    ctx.body = strats;
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Internal Server Error' };
    console.error('Error in /api/strategies route:', error);
  }
}
