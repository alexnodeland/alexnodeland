const path = require('path');

module.exports = {
  // Always build a production (minified, non-eval) worker bundle. The dev/eval
  // devtool output uses eval() which is blocked by strict CSPs and ships a much
  // larger, unreadable artifact.
  mode: 'production',
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
