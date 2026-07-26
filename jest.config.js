module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/setupTests.js',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/content/**/*',
    '!src/types/**/*',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  transform: {
    '^.+\\.(js|jsx|mjs|ts|tsx)$': 'babel-jest',
  },
  // .mjs is how the retrieval and prompt modules are written so that the
  // browser worker, plain Node eval scripts, and these tests can all import
  // the same file without a build step in between.
  moduleFileExtensions: ['js', 'jsx', 'mjs', 'ts', 'tsx', 'json'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.cache/',
    '<rootDir>/e2e/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(gatsby|gatsby-script|gatsby-link|react-markdown|remark.*|rehype.*|unified|bail|is-plain-obj|trough|vfile.*|unist.*|property-information|hast.*|html-void-elements|comma-separated-tokens|space-separated-tokens|micromark.*|decode-named-character-reference|character-entities|mdast.*|parse-entities|character-reference-invalid|is-decimal|is-hexadecimal|is-alphanumerical|is-alphabetical)/)',
  ],
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
};
