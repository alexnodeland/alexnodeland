# List available recipes
default:
    @just --list

# Install dependencies
install:
    npm install

# Start dev server
dev:
    npm run develop

# Alias for dev
start: dev

# Production build
build:
    npm run build

# Serve production build
serve:
    npm run serve

# Clean Gatsby cache and public dir
clean:
    npm run clean

# Run tests
test:
    npm test

# Run tests in watch mode
test-watch:
    npm run test:watch

# Run tests with coverage
test-coverage:
    npm run test:coverage

# Run unit tests only
test-unit:
    npm run test:unit

# Run integration tests only
test-integration:
    npm run test:integration

# Run end-to-end tests
test-e2e:
    npm run test:e2e

# Run all tests (unit + integration + e2e)
test-all:
    npm run test:all

# Lint source files
lint:
    npm run lint

# Lint and auto-fix
lint-fix:
    npm run lint:fix

# Format source files
format:
    npm run format

# Run TypeScript type checking
type-check:
    npm run type-check

# Run all code quality checks
quality:
    npm run code-quality

# Run all code quality checks with auto-fix
quality-fix:
    npm run code-quality:fix
