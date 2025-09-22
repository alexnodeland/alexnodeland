#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running comprehensive test suite...\n');

// Run unit tests with coverage
console.log('📊 Running unit tests with coverage...');
try {
  execSync('npm run test:coverage', { stdio: 'inherit' });
  console.log('✅ Unit tests completed successfully\n');
} catch (error) {
  console.error('❌ Unit tests failed');
  process.exit(1);
}

// Check if coverage directory exists
const coverageDir = path.join(__dirname, '..', 'coverage');
if (fs.existsSync(coverageDir)) {
  console.log('📈 Coverage report generated in ./coverage/');
  
  // Read coverage summary
  const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');
  if (fs.existsSync(coverageSummaryPath)) {
    const coverage = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
    const total = coverage.total;
    
    console.log('\n📊 Coverage Summary:');
    console.log(`  Lines: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
    console.log(`  Functions: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
    console.log(`  Branches: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);
    console.log(`  Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);
    
    // Check if coverage meets threshold
    const threshold = 80;
    const meetsThreshold = Object.values(total).every(metric => metric.pct >= threshold);
    
    if (meetsThreshold) {
      console.log(`\n✅ Coverage meets threshold of ${threshold}%`);
    } else {
      console.log(`\n⚠️  Coverage below threshold of ${threshold}%`);
      console.log('Consider adding more tests to improve coverage.');
    }
  }
}

// Run integration tests
console.log('\n🔗 Running integration tests...');
try {
  execSync('npm run test:integration', { stdio: 'inherit' });
  console.log('✅ Integration tests completed successfully\n');
} catch (error) {
  console.error('❌ Integration tests failed');
  process.exit(1);
}

// Run end-to-end tests (if not in CI)
if (!process.env.CI) {
  console.log('🌐 Running end-to-end tests...');
  try {
    execSync('npm run test:e2e', { stdio: 'inherit' });
    console.log('✅ End-to-end tests completed successfully\n');
  } catch (error) {
    console.error('❌ End-to-end tests failed');
    console.log('Note: E2E tests require the development server to be running');
  }
} else {
  console.log('⏭️  Skipping E2E tests in CI environment\n');
}

console.log('🎉 All tests completed!');
console.log('\n📋 Test Summary:');
console.log('  ✅ Unit tests with coverage');
console.log('  ✅ Integration tests');
if (!process.env.CI) {
  console.log('  ✅ End-to-end tests');
} else {
  console.log('  ⏭️  End-to-end tests (skipped in CI)');
}

console.log('\n📚 For more information, see TESTING.md');
