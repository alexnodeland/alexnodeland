module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [
    function () {
      return {
        visitor: {
          MetaProperty(path) {
            // Replace import.meta.url with a mock URL in test environment
            if (
              path.node.meta.name === 'import' &&
              path.node.property.name === 'url'
            ) {
              path.replaceWithSourceString('"file:///mock-path/test.js"');
            }
          },
        },
      };
    },
  ],
};
