/**
 * Dev-only utilities and test helpers
 *
 * This module is excluded from production builds.
 * All exports are guarded to throw if imported in production.
 *
 * @dev-only
 */

// Guard: Prevent import in production
if (process.env.NODE_ENV === 'production') {
  throw new Error(
    '__dev__ module should not be imported in production! ' +
    'Check your imports and ensure dev-only code is not bundled.'
  );
}

export { runMigrationTest, createLegacyProject, getExpectedWorkItems } from './migration-test';
export { MigrationTestPanel } from './MigrationTestPanel';
