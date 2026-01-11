/**
 * Navigation Tests - v4
 * Tests for URL query param routing and activity link resolution
 */

import { describe, it, expect } from 'bun:test';
import {
  buildQueryString,
  buildPath,
  parseQueryString,
  isValidProjectStatus,
  isValidQuoteStatus,
  resolveActivityLink,
  describeFilters,
  type ProjectFilters,
} from '@/v4/navigation';

// ============================================
// TEST 1: QUERY STRING BUILDING
// ============================================

describe('Query String Building', () => {
  it('should build empty string for no filters', () => {
    const result = buildQueryString({});
    expect(result).toBe('');
  });

  it('should build query string with status filter', () => {
    const result = buildQueryString({ status: 'DRAFT' });
    expect(result).toBe('?status=DRAFT');
  });

  it('should build query string with quote status filter', () => {
    const result = buildQueryString({ quoteStatus: 'SENT' });
    expect(result).toBe('?quoteStatus=SENT');
  });

  it('should build query string with multiple filters', () => {
    const result = buildQueryString({
      status: 'ORDER_CONFIRMED',
      quoteStatus: 'ACCEPTED',
    });
    expect(result).toContain('status=ORDER_CONFIRMED');
    expect(result).toContain('quoteStatus=ACCEPTED');
    expect(result.startsWith('?')).toBe(true);
  });

  it('should build full path with filters', () => {
    const result = buildPath('projects', { status: 'IN_PRODUCTION' });
    expect(result).toBe('/projects?status=IN_PRODUCTION');
  });

  it('should build path without query string when no filters', () => {
    const result = buildPath('projects');
    expect(result).toBe('/projects');
  });
});

// ============================================
// TEST 2: QUERY STRING PARSING
// ============================================

describe('Query String Parsing', () => {
  it('should parse empty query string', () => {
    const result = parseQueryString('');
    expect(result).toEqual({});
  });

  it('should parse status from query string', () => {
    const result = parseQueryString('?status=QUOTED');
    expect(result.status).toBe('QUOTED');
  });

  it('should parse quoteStatus from query string', () => {
    const result = parseQueryString('?quoteStatus=DRAFT');
    expect(result.quoteStatus).toBe('DRAFT');
  });

  it('should parse multiple params', () => {
    const result = parseQueryString('?status=DELIVERED&quoteStatus=ACCEPTED');
    expect(result.status).toBe('DELIVERED');
    expect(result.quoteStatus).toBe('ACCEPTED');
  });

  it('should ignore invalid status values', () => {
    const result = parseQueryString('?status=INVALID_STATUS');
    expect(result.status).toBeUndefined();
  });

  it('should ignore invalid quoteStatus values', () => {
    const result = parseQueryString('?quoteStatus=INVALID');
    expect(result.quoteStatus).toBeUndefined();
  });
});

// ============================================
// TEST 3: ACTIVITY LINK RESOLUTION
// ============================================

describe('Activity Link Resolution', () => {
  it('should resolve Project entity to projectId', () => {
    const result = resolveActivityLink('Project', 'proj-123');
    expect(result).toEqual({ projectId: 'proj-123' });
  });

  it('should resolve ProjectConfiguration entity to projectId', () => {
    const result = resolveActivityLink('ProjectConfiguration', 'proj-456');
    expect(result).toEqual({ projectId: 'proj-456' });
  });

  it('should resolve ProjectQuote with metadata to projectId', () => {
    const result = resolveActivityLink('ProjectQuote', 'quote-789', {
      projectId: 'proj-abc',
    });
    expect(result).toEqual({ projectId: 'proj-abc' });
  });

  it('should resolve ProjectDocument with metadata to projectId', () => {
    const result = resolveActivityLink('ProjectDocument', 'doc-123', {
      projectId: 'proj-def',
    });
    expect(result).toEqual({ projectId: 'proj-def' });
  });

  it('should return null for entities without project reference', () => {
    const result = resolveActivityLink('Client', 'client-123');
    expect(result).toBeNull();
  });

  it('should return null for unknown entity types', () => {
    const result = resolveActivityLink('UnknownEntity', 'unknown-id');
    expect(result).toBeNull();
  });

  it('should return null when metadata lacks projectId', () => {
    const result = resolveActivityLink('ProjectQuote', 'quote-123', {
      someOtherField: 'value',
    });
    expect(result).toBeNull();
  });
});

// ============================================
// TEST 4: VALIDATION
// ============================================

describe('Status Validation', () => {
  it('should validate correct project statuses', () => {
    expect(isValidProjectStatus('DRAFT')).toBe(true);
    expect(isValidProjectStatus('QUOTED')).toBe(true);
    expect(isValidProjectStatus('ORDER_CONFIRMED')).toBe(true);
    expect(isValidProjectStatus('IN_PRODUCTION')).toBe(true);
    expect(isValidProjectStatus('DELIVERED')).toBe(true);
  });

  it('should reject invalid project statuses', () => {
    expect(isValidProjectStatus('INVALID')).toBe(false);
    expect(isValidProjectStatus('')).toBe(false);
    expect(isValidProjectStatus('draft')).toBe(false); // case-sensitive
  });

  it('should validate correct quote statuses', () => {
    expect(isValidQuoteStatus('DRAFT')).toBe(true);
    expect(isValidQuoteStatus('SENT')).toBe(true);
    expect(isValidQuoteStatus('ACCEPTED')).toBe(true);
    expect(isValidQuoteStatus('REJECTED')).toBe(true);
  });

  it('should reject invalid quote statuses', () => {
    expect(isValidQuoteStatus('INVALID')).toBe(false);
    expect(isValidQuoteStatus('PENDING')).toBe(false);
  });
});

// ============================================
// TEST 5: FILTER DESCRIPTION
// ============================================

describe('Filter Description', () => {
  it('should describe status filter', () => {
    const result = describeFilters({ status: 'DRAFT' });
    expect(result).toBe('Status: Draft');
  });

  it('should describe quote status filter', () => {
    const result = describeFilters({ quoteStatus: 'SENT' });
    expect(result).toBe('Quote Status: SENT');
  });

  it('should describe empty filters as All Projects', () => {
    const result = describeFilters({});
    expect(result).toBe('All Projects');
  });
});
