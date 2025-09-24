# 🤝 Contributing Guide

Thank you for your interest in contributing to the Alex Nodeland website! This guide will help you get started with contributing to this project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Style Guidelines](#style-guidelines)

## 📜 Code of Conduct

This project follows a code of conduct that we expect all contributors to follow:

- **Be respectful** - Treat everyone with respect and kindness
- **Be constructive** - Provide helpful feedback and suggestions
- **Be patient** - Remember that everyone is learning and growing
- **Be inclusive** - Welcome contributors from all backgrounds

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- A GitHub account

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/yourusername/alexnodeland.git
   cd alexnodeland
   ```

3. **Add upstream remote**:

   ```bash
   git remote add upstream https://github.com/alexnodeland/alexnodeland.git
   ```

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run develop

# Build for production
npm run build
```

## 🔄 Development Process

### 1. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

**Branch naming conventions:**

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `style/description` - Code style changes
- `refactor/description` - Code refactoring

### 2. Make Changes

- Make your changes following the [style guidelines](#style-guidelines)
- Test your changes thoroughly
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run development server
npm run develop

# Build for production
npm run build

# Test production build
npm run serve
```

### 4. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add dark mode toggle

- Add ThemeToggle component
- Update layout to include theme toggle
- Add dark mode CSS variables
- Persist theme preference in localStorage"
```

**Commit message format:**

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 5. Push and Create PR

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a pull request on GitHub
```

## 📝 Pull Request Process

### Before Submitting

- [ ] **Code follows style guidelines**
- [ ] **Self-review completed**
- [ ] **Changes are tested**
- [ ] **Documentation updated**
- [ ] **No console errors**
- [ ] **Responsive design tested**

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Tested on different screen sizes
- [ ] No console errors

## Screenshots (if applicable)
Add screenshots to help explain your changes

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have made corresponding changes to documentation
```

### Review Process

1. **Automated checks** - GitHub Actions will run tests
2. **Code review** - Maintainers will review your code
3. **Feedback** - Address any feedback or requested changes
4. **Approval** - Once approved, your PR will be merged

## 🐛 Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** - Check if your issue already exists
2. **Check documentation** - Review docs and troubleshooting guides
3. **Test latest version** - Ensure you're using the latest code

### Issue Templates

**Bug Report:**

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Environment
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Node.js version: [e.g. 18.0.0]

## Screenshots
If applicable, add screenshots
```

**Feature Request:**

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why would this feature be useful?

## Proposed Solution
How would you like this to work?

## Alternatives
Any alternative solutions you've considered?

## Additional Context
Any other context about the feature request
```

## 🎨 Style Guidelines

### TypeScript

```typescript
// Use interfaces for props
interface ComponentProps {
  title: string;
  description?: string;
}

// Use functional components
const MyComponent: React.FC<ComponentProps> = ({ title, description }) => {
  return <div>{title}</div>;
};

// Use const assertions
const colors = ['red', 'green', 'blue'] as const;
```

### SCSS

```scss
// Use CSS custom properties
.component {
  color: var(--text-primary);
  background: var(--bg-primary);
}

// Use BEM methodology
.component {
  &__element {
    // styles
  }
  
  &--modifier {
    // styles
  }
}

// Use meaningful class names
.experience-item {
  // not .exp-item or .exp
}
```

### MD

```md
---
title: "Page Title"
description: "Page description"
---

import Layout from '../components/layout'
import SEO from '../components/seo'

<Layout>
  <SEO title="Page Title" />
  <div className="page">
    <h1>Hello World</h1>
  </div>
</Layout>
```

### Git

```bash
# Use descriptive commit messages
git commit -m "feat: add dark mode support"

# Use conventional commits
feat: add new feature
fix: fix bug
docs: update documentation
style: format code
refactor: refactor code
test: add tests
chore: maintenance
```

## 📚 Resources

- [Gatsby Documentation](https://www.gatsbyjs.com/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [SCSS Documentation](https://sass-lang.com/documentation)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

## 🆘 Getting Help

- **Documentation**: Check the [docs](./) directory
- **Issues**: Search existing [GitHub Issues](https://github.com/alexnodeland/alexnodeland/issues)
- **Discussions**: Use [GitHub Discussions](https://github.com/alexnodeland/alexnodeland/discussions)
- **Email**: Contact [Alex Nodeland](mailto:alex@ournature.studio)

## 🙏 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing! 🎉
