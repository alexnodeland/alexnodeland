const path = require('path');

// Jest's stand-in for webpack's file loader (see `transform` in
// jest.config.js): a binary asset imported for its URL resolves to
// `/static/<its own file name>`.
module.exports = {
  process(_source, filename) {
    return {
      code: `module.exports = ${JSON.stringify(`/static/${path.basename(filename)}`)};`,
    };
  },
};
