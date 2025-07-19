const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup/popup.ts',
    background: './src/background/background.ts',
    content: './src/content/content.ts',
    'network-interceptor': './src/content/network-interceptor.ts'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name]/[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { 
          from: 'manifest.json', 
          to: 'manifest.json' 
        },
        { 
          from: 'popup/popup.html', 
          to: 'popup/popup.html' 
        },
        { 
          from: 'popup/popup.css', 
          to: 'popup/popup.css' 
        },
        { 
          from: 'content/content.css', 
          to: 'content/content.css' 
        },
        { 
          from: 'icons/**/*', 
          to: 'icons/[name][ext]',
          noErrorOnMissing: true
        }
      ],
    }),
  ],
  optimization: {
    splitChunks: false,
  },
};