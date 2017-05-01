var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

const extractCSS = new ExtractTextPlugin('styles.css');

module.exports = {
  entry: './app/index.js',
  module: {
    rules: [{
      test: /\.css$/,
      use: extractCSS.extract({
        use: [
          {
            loader: 'css-loader',
            options: {
              modules: false
            }
          },
          "postcss-loader"
        ]
      })
    }]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    extractCSS,
  ]
};
