/**
 * Navigation Tests
 * Tests for URL-based navigation and route parsing
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import {
  buildQueryString,
  parseQueryString,
  buildPath,
  buildHashPath,
  describeFilters,
  resolveActivityLink,
  isValidProjectStatus,
  isValidQuoteStatus,
} from '@/v4/navigation';
import type { ProjectFilters } from '@/v4/navigation';

// ============================================
// QUERY STRING TESTS
// ============================================

describe('buildQueryString', () => {
  test('returns empty string for empty filters', () => {
    const result = buildQueryString({});
    expect(result).toBe('');
  });

  test('builds query string with status filter', () => {
    const result = buildQueryString({ status: 'DRAFT' });
    expect(result).toBe('?status=DRAFT');
  });

  test('builds query string with quoteStatus filter', () => {
    const result = buildQueryString({ quoteStatus: 'SENT' });
    expect(result).toBe('?quoteStatus=SENT');
  });

  test('builds query string with clientId filter', () => {
    const result = buildQueryString({ clientId: 'client-123' });
    expect(result).toBe('?clientId=client-123');
  });

  test('builds query string with multiple filters', () => {
    const result = buildQueryString({
      status: 'IN_PRODUCTION',
      quoteStatus: 'ACCEPTED',
    });
    expect(result).toContain('status=IN_PRODUCTION');
    expect(result).toContain('quoteStatus=ACCEPTED');
  });
});

describe('parseQueryString', () => {
  test('returns empty filters for empty string', () => {
    const result = parseQueryString('');
    expect(result).toEqual({});
  });

  test('parses status from query string', () => {
    const result = parseQueryString('?status=DRAFT');
    expect(result.status).toBe('DRAFT');
  });

  test('parses quoteStatus from query string', () => {
    const result = parseQueryString('?quoteStatus=SENT');
    expect(result.quoteStatus).toBe('SENT');
  });

  test('parses clientId from query string', () => {
    const result = parseQueryString('?clientId=client-456');
    expect(result.clientId).toBe('client-456');
  });

  test('ignores invalid status values', () => {
    const result = parseQueryString('?status=INVALID_STATUS');
    expect(result.status).toBeUndefined();
  });

  test('ignores invalid quoteStatus values', () => {
    const result = parseQueryString('?quoteStatus=INVALID_QUOTE');
    expect(result.quoteStatus).toBeUndefined();
  });

  test('parses multiple filters', () => {
    const result = parseQueryString('?status=ORDER_CONFIRMED&clientId=abc');
    expect(result.status).toBe('ORDER_CONFIRMED');
    expect(result.clientId).toBe('abc');
  });
});

describe('buildPath', () => {
  test('returns base path without filters', () => {
    const result = buildPath('projects');
    expect(result).toBe('/projects');
  });

  test('returns base path with empty filters', () => {
    const result = buildPath('projects', {});
    expect(result).toBe('/projects');
  });

  test('appends query string with filters', () => {
    const result = buildPath('projects', { status: 'QUOTED' });
    expect(result).toBe('/projects?status=QUOTED');
  });
});

// ============================================
// HASH ROUTING TESTS
// ============================================

describe('buildHashPath', () => {
  test('returns hash path for screen', () => {
    const result = buildHashPath('projects');
    expect(result).toBe('#/projects');
  });

  test('returns hash path for dashboard', () => {
    const result = buildHashPath('dashboard');
    expect(result).toBe('#/dashboard');
  });

  test('returns hash path with filters', () => {
    const result = buildHashPath('projects', { status: 'DRAFT' });
    expect(result).toBe('#/projects?status=DRAFT');
  });

  test('returns hash path with empty filters', () => {
    const result = buildHashPath('projects', {});
    expect(result).toBe('#/projects');
  });

  test('returns hash path with multiple filters', () => {
    const result = buildHashPath('projects', {
      status: 'IN_PRODUCTION',
      clientId: 'client-1',
    });
    expect(result).toContain('#/projects?');
    expect(result).toContain('status=IN_PRODUCTION');
    expect(result).toContain('clientId=client-1');
  });
});

describe('Hash routing integration', () => {
  test('hash path query string can be parsed back', () => {
    const hashPath = buildHashPath('projects', { status: 'QUOTED' });
    // Extract query part after ?
    const queryPart = hashPath.split('?')[1];
    const parsed = parseQueryString(`?${queryPart}`);
    expect(parsed.status).toBe('QUOTED');
  });

  test('hash path without filters has no query part', () => {
    const hashPath = buildHashPath('clients');
    expect(hashPath).toBe('#/clients');
    expect(hashPath.includes('?')).toBe(false);
  });
});

// ============================================
// VALIDATION TESTS
// ============================================

describe('isValidProjectStatus', () => {
  test('validates DRAFT as valid status', () => {
    expect(isValidProjectStatus('DRAFT')).toBe(true);
  });

  test('validates IN_PRODUCTION as valid status', () => {
    expect(isValidProjectStatus('IN_PRODUCTION')).toBe(true);
  });

  test('validates DELIVERED as valid status', () => {
    expect(isValidProjectStatus('DELIVERED')).toBe(true);
  });

  test('rejects invalid status', () => {
    expect(isValidProjectStatus('INVALID')).toBe(false);
  });

  test('rejects empty string', () => {
    expect(isValidProjectStatus('')).toBe(false);
  });
});

describe('isValidQuoteStatus', () => {
  test('validates DRAFT as valid quote status', () => {
    expect(isValidQuoteStatus('DRAFT')).toBe(true);
  });

  test('validates SENT as valid quote status', () => {
    expect(isValidQuoteStatus('SENT')).toBe(true);
  });

  test('validates ACCEPTED as valid quote status', () => {
    expect(isValidQuoteStatus('ACCEPTED')).toBe(true);
  });

  test('rejects invalid quote status', () => {
    expect(isValidQuoteStatus('INVALID')).toBe(false);
  });
});

// ============================================
// ACTIVITY LINK TESTS
// ============================================

describe('resolveActivityLink', () => {
  test('resolves Project entity to projectId', () => {
    const result = resolveActivityLink('Project', 'proj-123');
    expect(result).toEqual({ projectId: 'proj-123' });
  });

  test('resolves ProjectConfiguration entity to projectId', () => {
    const result = resolveActivityLink('ProjectConfiguration', 'proj-456');
    expect(result).toEqual({ projectId: 'proj-456' });
  });

  test('resolves ProjectQuote with metadata', () => {
    const result = resolveActivityLink('ProjectQuote', 'quote-1', {
      projectId: 'proj-789',
    });
    expect(result).toEqual({ projectId: 'proj-789' });
  });

  test('returns null for ProjectQuote without projectId in metadata', () => {
    const result = resolveActivityLink('ProjectQuote', 'quote-1', {});
    expect(result).toBeNull();
  });

  test('returns null for unrelated entity types', () => {
    const result = resolveActivityLink('LibraryArticle', 'art-123');
    expect(result).toBeNull();
  });

  test('returns null for User entity', () => {
    const result = resolveActivityLink('User', 'user-123');
    expect(result).toBeNull();
  });
});

// ============================================
// FILTER DESCRIPTION TESTS
// ============================================

describe('describeFilters', () => {
  test('returns "All Projects" for empty filters', () => {
    const result = describeFilters({});
    expect(result).toBe('All Projects');
  });

  test('describes status filter', () => {
    const result = describeFilters({ status: 'DRAFT' });
    expect(result).toBe('Status: Draft');
  });

  test('describes IN_PRODUCTION status', () => {
    const result = describeFilters({ status: 'IN_PRODUCTION' });
    expect(result).toBe('Status: In Production');
  });

  test('describes quoteStatus filter', () => {
    const result = describeFilters({ quoteStatus: 'SENT' });
    expect(result).toBe('Quote Status: SENT');
  });

  test('describes multiple filters', () => {
    const result = describeFilters({
      status: 'ORDER_CONFIRMED',
      quoteStatus: 'ACCEPTED',
    });
    expect(result).toContain('Status: Order Confirmed');
    expect(result).toContain('Quote Status: ACCEPTED');
  });
});

// ============================================
// ROUNDTRIP TESTS
// ============================================

describe('Query string roundtrip', () => {
  test('filters survive build-parse roundtrip', () => {
    const original: ProjectFilters = {
      status: 'QUOTED',
      quoteStatus: 'SENT',
      clientId: 'client-abc',
    };

    const queryString = buildQueryString(original);
    const parsed = parseQueryString(queryString);

    expect(parsed).toEqual(original);
  });

  test('empty filters survive roundtrip', () => {
    const original: ProjectFilters = {};
    const queryString = buildQueryString(original);
    const parsed = parseQueryString(queryString);
    expect(parsed).toEqual(original);
  });
});
