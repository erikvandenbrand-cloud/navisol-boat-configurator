/**
 * Lifecycle Transitions Tests
 * Tests for the Quote → Production workflow
 *
 * Flow: DRAFT → QUOTED → OFFER_SENT → ORDER_CONFIRMED → IN_PRODUCTION
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';
import { clearAllTestData } from '@/domain/__tests__/testUtils';

import { StatusMachine } from '@/domain/workflow/StatusMachine';
import { hasPermission, ROLE_PERMISSIONS, type UserRole } from '@/domain/models/user';
import type { ProjectStatus } from '@/domain/models';

// ============================================
// STATUS MACHINE TRANSITION TESTS
// ============================================

describe('StatusMachine - Valid Transitions', () => {
  test('DRAFT can transition to QUOTED', () => {
    expect(StatusMachine.canTransition('DRAFT', 'QUOTED')).toBe(true);
  });

  test('QUOTED can transition to OFFER_SENT', () => {
    expect(StatusMachine.canTransition('QUOTED', 'OFFER_SENT')).toBe(true);
  });

  test('OFFER_SENT can transition to ORDER_CONFIRMED', () => {
    expect(StatusMachine.canTransition('OFFER_SENT', 'ORDER_CONFIRMED')).toBe(true);
  });

  test('ORDER_CONFIRMED can transition to IN_PRODUCTION', () => {
    expect(StatusMachine.canTransition('ORDER_CONFIRMED', 'IN_PRODUCTION')).toBe(true);
  });

  test('IN_PRODUCTION can transition to READY_FOR_DELIVERY', () => {
    expect(StatusMachine.canTransition('IN_PRODUCTION', 'READY_FOR_DELIVERY')).toBe(true);
  });

  test('DELIVERED can transition to CLOSED', () => {
    expect(StatusMachine.canTransition('DELIVERED', 'CLOSED')).toBe(true);
  });
});

describe('StatusMachine - Invalid Transitions', () => {
  test('DRAFT cannot transition directly to ORDER_CONFIRMED', () => {
    expect(StatusMachine.canTransition('DRAFT', 'ORDER_CONFIRMED')).toBe(false);
  });

  test('DRAFT cannot transition directly to IN_PRODUCTION', () => {
    expect(StatusMachine.canTransition('DRAFT', 'IN_PRODUCTION')).toBe(false);
  });

  test('OFFER_SENT cannot transition directly to IN_PRODUCTION', () => {
    expect(StatusMachine.canTransition('OFFER_SENT', 'IN_PRODUCTION')).toBe(false);
  });

  test('CLOSED cannot transition to any status', () => {
    const statuses: ProjectStatus[] = ['DRAFT', 'QUOTED', 'OFFER_SENT', 'ORDER_CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DELIVERY', 'DELIVERED'];
    for (const status of statuses) {
      expect(StatusMachine.canTransition('CLOSED', status)).toBe(false);
    }
  });
});

describe('StatusMachine - Backward Transitions', () => {
  test('QUOTED can go back to DRAFT', () => {
    expect(StatusMachine.canTransition('QUOTED', 'DRAFT')).toBe(true);
  });

  test('OFFER_SENT can go back to QUOTED', () => {
    expect(StatusMachine.canTransition('OFFER_SENT', 'QUOTED')).toBe(true);
  });

  test('READY_FOR_DELIVERY can go back to IN_PRODUCTION', () => {
    expect(StatusMachine.canTransition('READY_FOR_DELIVERY', 'IN_PRODUCTION')).toBe(true);
  });

  test('ORDER_CONFIRMED cannot go back (frozen point)', () => {
    expect(StatusMachine.canTransition('ORDER_CONFIRMED', 'OFFER_SENT')).toBe(false);
  });
});

// ============================================
// TRANSITION VALIDATION TESTS
// ============================================

describe('StatusMachine - Transition Validation', () => {
  test('ORDER_CONFIRMED requires accepted quote', () => {
    const validation = StatusMachine.validateTransition('OFFER_SENT', 'ORDER_CONFIRMED', {
      hasQuoteAccepted: false,
    });
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Quote must be accepted by client before confirming order');
  });

  test('ORDER_CONFIRMED is valid with accepted quote', () => {
    const validation = StatusMachine.validateTransition('OFFER_SENT', 'ORDER_CONFIRMED', {
      hasQuoteAccepted: true,
      configurationItemCount: 5,
    });
    expect(validation.isValid).toBe(true);
  });

  test('IN_PRODUCTION transition from ORDER_CONFIRMED is valid', () => {
    const validation = StatusMachine.validateTransition('ORDER_CONFIRMED', 'IN_PRODUCTION', {});
    expect(validation.isValid).toBe(true);
  });

  test('ORDER_CONFIRMED warns about empty configuration', () => {
    const validation = StatusMachine.validateTransition('OFFER_SENT', 'ORDER_CONFIRMED', {
      hasQuoteAccepted: true,
      configurationItemCount: 0,
    });
    expect(validation.isValid).toBe(true); // Still valid
    expect(validation.warnings).toContain('Configuration has no items - BOM will be empty');
  });
});

// ============================================
// MILESTONE EFFECTS TESTS
// ============================================

describe('StatusMachine - Milestone Effects', () => {
  test('ORDER_CONFIRMED triggers configuration freeze and BOM generation', () => {
    const effects = StatusMachine.getMilestoneEffects('ORDER_CONFIRMED');
    const effectTypes = effects.map(e => e.type);
    expect(effectTypes).toContain('FREEZE_CONFIGURATION');
    expect(effectTypes).toContain('GENERATE_BOM');
    expect(effectTypes).toContain('PIN_LIBRARY_VERSIONS');
  });

  test('IN_PRODUCTION triggers production initialization', () => {
    const effects = StatusMachine.getMilestoneEffects('IN_PRODUCTION');
    const effectTypes = effects.map(e => e.type);
    expect(effectTypes).toContain('INITIALIZE_PRODUCTION');
  });

  test('OFFER_SENT triggers quote lock', () => {
    const effects = StatusMachine.getMilestoneEffects('OFFER_SENT');
    const effectTypes = effects.map(e => e.type);
    expect(effectTypes).toContain('LOCK_QUOTE');
  });

  test('DELIVERED triggers document finalization', () => {
    const effects = StatusMachine.getMilestoneEffects('DELIVERED');
    const effectTypes = effects.map(e => e.type);
    expect(effectTypes).toContain('FINALIZE_DOCUMENTS');
  });
});

// ============================================
// STATUS PROPERTIES TESTS
// ============================================

describe('StatusMachine - Status Properties', () => {
  test('DRAFT is editable', () => {
    expect(StatusMachine.isEditable('DRAFT')).toBe(true);
  });

  test('QUOTED is editable', () => {
    expect(StatusMachine.isEditable('QUOTED')).toBe(true);
  });

  test('OFFER_SENT is editable', () => {
    expect(StatusMachine.isEditable('OFFER_SENT')).toBe(true);
  });

  test('ORDER_CONFIRMED is frozen', () => {
    expect(StatusMachine.isFrozen('ORDER_CONFIRMED')).toBe(true);
    expect(StatusMachine.isEditable('ORDER_CONFIRMED')).toBe(false);
  });

  test('IN_PRODUCTION is frozen', () => {
    expect(StatusMachine.isFrozen('IN_PRODUCTION')).toBe(true);
  });

  test('DELIVERED is locked', () => {
    expect(StatusMachine.isLocked('DELIVERED')).toBe(true);
  });

  test('CLOSED is locked', () => {
    expect(StatusMachine.isLocked('CLOSED')).toBe(true);
  });
});

// ============================================
// PERMISSION TESTS
// ============================================

describe('Project Transition Permissions', () => {
  test('ADMIN can transition projects', () => {
    expect(hasPermission('ADMIN', 'project:transition')).toBe(true);
  });

  test('MANAGER can transition projects', () => {
    expect(hasPermission('MANAGER', 'project:transition')).toBe(true);
  });

  test('SALES can transition projects (for order confirmation)', () => {
    expect(hasPermission('SALES', 'project:transition')).toBe(true);
  });

  test('PRODUCTION cannot transition projects', () => {
    expect(hasPermission('PRODUCTION', 'project:transition')).toBe(false);
  });

  test('VIEWER cannot transition projects', () => {
    expect(hasPermission('VIEWER', 'project:transition')).toBe(false);
  });
});

describe('Quote Permissions', () => {
  test('SALES can create and send quotes', () => {
    expect(hasPermission('SALES', 'quote:create')).toBe(true);
    expect(hasPermission('SALES', 'quote:send')).toBe(true);
  });

  test('PRODUCTION can only read quotes', () => {
    expect(hasPermission('PRODUCTION', 'quote:read')).toBe(true);
    expect(hasPermission('PRODUCTION', 'quote:create')).toBe(false);
    expect(hasPermission('PRODUCTION', 'quote:send')).toBe(false);
  });
});

describe('Production Permissions', () => {
  test('PRODUCTION can update production stages', () => {
    expect(hasPermission('PRODUCTION', 'production:update')).toBe(true);
    expect(hasPermission('PRODUCTION', 'production:comment')).toBe(true);
    expect(hasPermission('PRODUCTION', 'production:photo')).toBe(true);
  });

  test('SALES can only read production', () => {
    expect(hasPermission('SALES', 'production:read')).toBe(true);
    expect(hasPermission('SALES', 'production:update')).toBe(false);
  });
});

// ============================================
// VALID NEXT STATUSES TESTS
// ============================================

describe('StatusMachine - getValidNextStatuses', () => {
  test('DRAFT can only go to QUOTED', () => {
    const next = StatusMachine.getValidNextStatuses('DRAFT');
    expect(next).toEqual(['QUOTED']);
  });

  test('QUOTED can go to DRAFT or OFFER_SENT', () => {
    const next = StatusMachine.getValidNextStatuses('QUOTED');
    expect(next).toContain('DRAFT');
    expect(next).toContain('OFFER_SENT');
  });

  test('OFFER_SENT can go to QUOTED or ORDER_CONFIRMED', () => {
    const next = StatusMachine.getValidNextStatuses('OFFER_SENT');
    expect(next).toContain('QUOTED');
    expect(next).toContain('ORDER_CONFIRMED');
  });

  test('ORDER_CONFIRMED can only go to IN_PRODUCTION', () => {
    const next = StatusMachine.getValidNextStatuses('ORDER_CONFIRMED');
    expect(next).toEqual(['IN_PRODUCTION']);
  });

  test('IN_PRODUCTION can go to READY_FOR_DELIVERY', () => {
    const next = StatusMachine.getValidNextStatuses('IN_PRODUCTION');
    expect(next).toContain('READY_FOR_DELIVERY');
  });
});

// ============================================
// STATUS INFO TESTS
// ============================================

describe('StatusMachine - getStatusInfo', () => {
  test('returns correct info for DRAFT', () => {
    const info = StatusMachine.getStatusInfo('DRAFT');
    expect(info.label).toBe('Draft');
    expect(info.description).toContain('configured');
  });

  test('returns correct info for ORDER_CONFIRMED', () => {
    const info = StatusMachine.getStatusInfo('ORDER_CONFIRMED');
    expect(info.label).toBe('Order Confirmed');
    expect(info.description).toContain('frozen');
  });

  test('returns correct info for IN_PRODUCTION', () => {
    const info = StatusMachine.getStatusInfo('IN_PRODUCTION');
    expect(info.label).toBe('In Production');
    expect(info.description).toContain('built');
  });
});
