require('@babel/register')({
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
});

module.exports = require('./gatsby-config.ts').default;
