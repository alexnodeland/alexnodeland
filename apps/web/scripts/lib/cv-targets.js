/**
 * The CV artifacts, named once.
 *
 * `build-cv.js` typesets this list and `check-cv-text.js` verifies it, so the
 * guard cannot fall out of step with the generator by checking a variant that
 * is no longer built — or, worse, quietly not checking a new one.
 */

const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

/** Loads `src/config/cv.ts` through Babel, as the build script does. */
const loadCVConfig = () => {
  require('@babel/register')({
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    cwd: ROOT,
    only: [path.join(ROOT, 'src')],
  });
  return require(path.join(ROOT, 'src', 'config', 'cv.ts'));
};

/**
 * @returns {Array<{variant: string, name: string, data: object, maxPages: number|null}>}
 *   `maxPages` is null where the document is allowed to run long.
 */
const cvTargets = () => {
  const { CV_ARTIFACTS, buildVariant } = loadCVConfig();

  return Object.entries(CV_ARTIFACTS).map(([variant, artifact]) => ({
    variant,
    ...artifact,
    data: buildVariant(variant),
  }));
};

module.exports = {
  ROOT,
  OUT_DIR: path.join(ROOT, 'static', 'cv'),
  loadCVConfig,
  cvTargets,
};
