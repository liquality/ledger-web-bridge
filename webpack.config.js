const path = require('path');
const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  watch: true,
  
  entry: path.resolve(__dirname, 'src'),

  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    fallback: { 
        "buffer": require.resolve("buffer/")
    }
  },

  module: {
    rules: [{ test: /\.(ts|js)x?$/, loader: 'babel-loader', exclude: /node_modules/ }],
  },

  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
      new CopyPlugin({
        patterns: [
          {
            from: "src/index.html"
          },
        ],
      }),
  ],
  devServer: {
    https: true,
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000
  }
};