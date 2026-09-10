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
            // Replace any import.meta reference in test environment
            if (path.node.meta.name === 'import') {
              if (path.node.property.name === 'url') {
                path.replaceWithSourceString('"file:///mock-path/test.js"');
              } else if (path.node.property.name === 'meta') {
                // Handle import.meta itself
                path.replaceWithSourceString('{}');
              }
            }
          },
          // Handle typeof import checks
          UnaryExpression(path) {
            if (
              path.node.operator === 'typeof' &&
              path.node.argument.type === 'Identifier' &&
              path.node.argument.name === 'import'
            ) {
              path.replaceWithSourceString('"undefined"');
            }
          },
          // Handle direct import references in conditional expressions
          Identifier(path) {
            if (
              path.node.name === 'import' &&
              path.parent.type === 'BinaryExpression' &&
              path.parent.operator === '!=='
            ) {
              path.replaceWithSourceString('undefined');
            }
          },
        },
      };
    },
  ],
};
