const p = require('../../package.json');

// Retrieves API information
module.exports = async (ctx) => {
  ctx.body = {
    version: p.version
  };
};
