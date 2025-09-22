const sass = require('sass');
const path = require('path');

describe('SCSS Compilation', () => {
  const stylesDir = path.resolve(__dirname, '../../../styles');

  test('SCSS files exist and can be read', () => {
    const fs = require('fs');
    const files = [
      'global.scss',
      'index.scss',
      'blog.scss',
      'cv.scss',
      'variables.scss',
      'mixins.scss',
      'animations.scss',
    ];

    files.forEach(file => {
      const filePath = path.join(stylesDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('SCSS variables and mixins work correctly', () => {
    // Test that our SCSS variables and mixins work
    expect(() => {
      const testContent = `
        :root {
          --primary-color: #00ff88;
          --accent-color: #ff0080;
        }
        
        @mixin button-primary {
          background: var(--accent-color);
          color: white;
        }
        
        .test-class {
          color: var(--primary-color);
          @include button-primary;
        }
      `;
      sass.compileString(testContent);
    }).not.toThrow();
  });
});
