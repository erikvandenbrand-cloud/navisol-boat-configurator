/**
 * Project Invariants Module
 *
 * Dev-only assertions for validating project data integrity.
 */

export {
  assertProjectIntegrity,
  assertProjectIntegrityStrict,
  normalizeDateToYYYYMMDD,
  type IntegrityViolation,
  type IntegrityResult,
} from './assertProjectIntegrity';
