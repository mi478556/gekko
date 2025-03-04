const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  configureWebpack: {
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: '../baseUIconfig.js',
            to: '../public/UIconfig.js'
          },
          {
            from: '../baseUIconfig.js',
            to: 'UIconfig.js'
          }
        ]
      })
    ]
  },
  publicPath: ''
};
