/**
 * Workflow Tests - v4
 * Tests for status transitions and milestone effects
 */

import { StatusMachine } from '../workflow';
import type { ProjectStatus } from '../models';

describe('StatusMachine', () => {
  describe('canTransition', () => {
    it('should allow DRAFT -> QUOTED', () => {
      expect(StatusMachine.canTransition('DRAFT', 'QUOTED')).toBe(true);
    });

    it('should allow QUOTED -> OFFER_SENT', () => {
      expect(StatusMachine.canTransition('QUOTED', 'OFFER_SENT')).toBe(true);
    });

    it('should allow OFFER_SENT -> ORDER_CONFIRMED', () => {
      expect(StatusMachine.canTransition('OFFER_SENT', 'ORDER_CONFIRMED')).toBe(true);
    });

    it('should NOT allow DRAFT -> ORDER_CONFIRMED (skip)', () => {
      expect(StatusMachine.canTransition('DRAFT', 'ORDER_CONFIRMED')).toBe(false);
    });

    it('should NOT allow DELIVERED -> IN_PRODUCTION (backward)', () => {
      expect(StatusMachine.canTransition('DELIVERED', 'IN_PRODUCTION')).toBe(false);
    });

    it('should allow QUOTED -> DRAFT (revision)', () => {
      expect(StatusMachine.canTransition('QUOTED', 'DRAFT')).toBe(true);
    });

    it('should NOT allow any transitions from CLOSED', () => {
      const statuses: ProjectStatus[] = [
        'DRAFT', 'QUOTED', 'OFFER_SENT', 'ORDER_CONFIRMED',
        'IN_PRODUCTION', 'READY_FOR_DELIVERY', 'DELIVERED'
      ];
      statuses.forEach(status => {
        expect(StatusMachine.canTransition('CLOSED', status)).toBe(false);
      });
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return [QUOTED] for DRAFT', () => {
      expect(StatusMachine.getValidNextStatuses('DRAFT')).toEqual(['QUOTED']);
    });

    it('should return [DRAFT, OFFER_SENT] for QUOTED', () => {
      expect(StatusMachine.getValidNextStatuses('QUOTED')).toEqual(['DRAFT', 'OFFER_SENT']);
    });

    it('should return empty array for CLOSED', () => {
      expect(StatusMachine.getValidNextStatuses('CLOSED')).toEqual([]);
    });
  });

  describe('isMilestone', () => {
    it('should identify OFFER_SENT as milestone', () => {
      expect(StatusMachine.isMilestone('OFFER_SENT')).toBe(true);
    });

    it('should identify ORDER_CONFIRMED as milestone', () => {
      expect(StatusMachine.isMilestone('ORDER_CONFIRMED')).toBe(true);
    });

    it('should identify DELIVERED as milestone', () => {
      expect(StatusMachine.isMilestone('DELIVERED')).toBe(true);
    });

    it('should NOT identify DRAFT as milestone', () => {
      expect(StatusMachine.isMilestone('DRAFT')).toBe(false);
    });

    it('should identify IN_PRODUCTION as milestone', () => {
      expect(StatusMachine.isMilestone('IN_PRODUCTION')).toBe(true);
    });
  });

  describe('getMilestoneEffects', () => {
    it('should return LOCK_QUOTE for OFFER_SENT', () => {
      const effects = StatusMachine.getMilestoneEffects('OFFER_SENT');
      expect(effects).toHaveLength(1);
      expect(effects[0].type).toBe('LOCK_QUOTE');
    });

    it('should return 3 effects for ORDER_CONFIRMED', () => {
      const effects = StatusMachine.getMilestoneEffects('ORDER_CONFIRMED');
      expect(effects).toHaveLength(3);
      expect(effects.map(e => e.type)).toContain('FREEZE_CONFIGURATION');
      expect(effects.map(e => e.type)).toContain('GENERATE_BOM');
      expect(effects.map(e => e.type)).toContain('PIN_LIBRARY_VERSIONS');
    });

    it('should return FINALIZE_DOCUMENTS for DELIVERED', () => {
      const effects = StatusMachine.getMilestoneEffects('DELIVERED');
      expect(effects).toHaveLength(1);
      expect(effects[0].type).toBe('FINALIZE_DOCUMENTS');
    });

    it('should return empty array for non-milestone status', () => {
      expect(StatusMachine.getMilestoneEffects('DRAFT')).toEqual([]);
      expect(StatusMachine.getMilestoneEffects('QUOTED')).toEqual([]);
    });

    it('should return INITIALIZE_PRODUCTION for IN_PRODUCTION', () => {
      const effects = StatusMachine.getMilestoneEffects('IN_PRODUCTION');
      expect(effects).toHaveLength(1);
      expect(effects[0].type).toBe('INITIALIZE_PRODUCTION');
    });
  });

  describe('isEditable', () => {
    it('should return true for DRAFT', () => {
      expect(StatusMachine.isEditable('DRAFT')).toBe(true);
    });

    it('should return true for QUOTED', () => {
      expect(StatusMachine.isEditable('QUOTED')).toBe(true);
    });

    it('should return true for OFFER_SENT', () => {
      expect(StatusMachine.isEditable('OFFER_SENT')).toBe(true);
    });

    it('should return false for ORDER_CONFIRMED', () => {
      expect(StatusMachine.isEditable('ORDER_CONFIRMED')).toBe(false);
    });

    it('should return false for IN_PRODUCTION', () => {
      expect(StatusMachine.isEditable('IN_PRODUCTION')).toBe(false);
    });

    it('should return false for DELIVERED', () => {
      expect(StatusMachine.isEditable('DELIVERED')).toBe(false);
    });
  });

  describe('isFrozen', () => {
    it('should return false for DRAFT', () => {
      expect(StatusMachine.isFrozen('DRAFT')).toBe(false);
    });

    it('should return true for ORDER_CONFIRMED', () => {
      expect(StatusMachine.isFrozen('ORDER_CONFIRMED')).toBe(true);
    });

    it('should return true for IN_PRODUCTION', () => {
      expect(StatusMachine.isFrozen('IN_PRODUCTION')).toBe(true);
    });

    it('should return true for DELIVERED', () => {
      expect(StatusMachine.isFrozen('DELIVERED')).toBe(true);
    });
  });

  describe('isLocked', () => {
    it('should return false for ORDER_CONFIRMED', () => {
      expect(StatusMachine.isLocked('ORDER_CONFIRMED')).toBe(false);
    });

    it('should return true for DELIVERED', () => {
      expect(StatusMachine.isLocked('DELIVERED')).toBe(true);
    });

    it('should return true for CLOSED', () => {
      expect(StatusMachine.isLocked('CLOSED')).toBe(true);
    });
  });

  describe('validateTransition', () => {
    it('should return valid for allowed transition', () => {
      const result = StatusMachine.validateTransition('DRAFT', 'QUOTED', {
        hasQuoteDraft: true,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for disallowed transition', () => {
      const result = StatusMachine.validateTransition('DRAFT', 'DELIVERED', {});
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require confirmation for milestone transitions', () => {
      const result = StatusMachine.validateTransition('OFFER_SENT', 'ORDER_CONFIRMED', {
        hasQuoteAccepted: true,
        configurationItemCount: 5,
      });
      expect(result.requiresConfirmation).toBe(true);
      expect(result.milestoneEffects?.length).toBeGreaterThan(0);
    });

    it('should warn about empty configuration', () => {
      const result = StatusMachine.validateTransition('OFFER_SENT', 'ORDER_CONFIRMED', {
        hasQuoteAccepted: true,
        configurationItemCount: 0,
      });
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
