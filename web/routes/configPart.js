const _ = require('lodash');
const fs = require('fs').promises; // Use fs.promises for async/await support

const parts = {
  paperTrader: 'config/plugins/paperTrader',
  candleWriter: 'config/plugins/candleWriter',
  performanceAnalyzer: 'config/plugins/performanceAnalyzer'
}

const gekkoRoot = __dirname + '/../../';

module.exports = async (ctx) => {
  if(!_.has(parts, ctx.params.part)) {
    ctx.body = 'error :(';
    return;
  }

  const fileName = gekkoRoot + '/' + parts[ctx.params.part] + '.toml';
  try {
    const partContent = await fs.readFile(fileName, 'utf8');
    ctx.body = {
      part: partContent
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Internal Server Error' };
    console.error('Error reading file:', error);
  }
}
