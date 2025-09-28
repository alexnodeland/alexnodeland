const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/components/chat/worker.js',
  output: {
    filename: 'worker.js',
    path: path.resolve(__dirname, 'static'),
  },
  target: 'webworker',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fallback: {
      // Web worker polyfills
      fs: false,
      path: false,
      crypto: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  // Don't split chunks for web worker
  optimization: {
    splitChunks: false,
  },
};
