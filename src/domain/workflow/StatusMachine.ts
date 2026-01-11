/**
 * Project Status Machine - v4
 * Handles project status transitions with validation
 */

import type { ProjectStatus } from '@/domain/models';
import { Result, Ok, Err } from '@/domain/models';

// ============================================
// STATUS TRANSITION RULES
// ============================================

const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['QUOTED'],
  QUOTED: ['DRAFT', 'OFFER_SENT'],
  OFFER_SENT: ['QUOTED', 'ORDER_CONFIRMED'], // Can go back to QUOTED if rejected
  ORDER_CONFIRMED: ['IN_PRODUCTION'],
  IN_PRODUCTION: ['READY_FOR_DELIVERY'],
  READY_FOR_DELIVERY: ['IN_PRODUCTION', 'DELIVERED'], // Can go back if issues found
  DELIVERED: ['CLOSED'],
  CLOSED: [], // Terminal state
};

// Milestones that trigger special effects
export const MILESTONE_STATUSES: ProjectStatus[] = [
  'OFFER_SENT',
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'DELIVERED',
];

// Statuses that require certain prerequisites
const STATUS_PREREQUISITES: Partial<Record<ProjectStatus, string[]>> = {
  QUOTED: ['has_quote_draft'],
  OFFER_SENT: ['has_quote_sent'],
  ORDER_CONFIRMED: ['has_quote_accepted'],
  DELIVERED: ['delivery_checklist_complete'],
};

// ============================================
// STATUS MACHINE
// ============================================

export interface TransitionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresConfirmation: boolean;
  milestoneEffects?: MilestoneEffect[];
}

export interface MilestoneEffect {
  type: 'LOCK_QUOTE' | 'FREEZE_CONFIGURATION' | 'GENERATE_BOM' | 'PIN_LIBRARY_VERSIONS' | 'FINALIZE_DOCUMENTS' | 'INITIALIZE_PRODUCTION';
  description: string;
}

export const StatusMachine = {
  /**
   * Check if a transition is valid
   */
  canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  },

  /**
   * Get all valid next statuses from current status
   */
  getValidNextStatuses(current: ProjectStatus): ProjectStatus[] {
    return VALID_TRANSITIONS[current] || [];
  },

  /**
   * Check if status is a milestone
   */
  isMilestone(status: ProjectStatus): boolean {
    return MILESTONE_STATUSES.includes(status);
  },

  /**
   * Get milestone effects for a transition
   */
  getMilestoneEffects(to: ProjectStatus): MilestoneEffect[] {
    const effects: MilestoneEffect[] = [];

    switch (to) {
      case 'OFFER_SENT':
        effects.push({
          type: 'LOCK_QUOTE',
          description: 'Quote will be locked and PDF snapshot created',
        });
        break;

      case 'ORDER_CONFIRMED':
        effects.push(
          {
            type: 'FREEZE_CONFIGURATION',
            description: 'Configuration will be frozen as snapshot',
          },
          {
            type: 'GENERATE_BOM',
            description: 'Bill of Materials baseline will be generated',
          },
          {
            type: 'PIN_LIBRARY_VERSIONS',
            description: 'Library versions will be pinned to project',
          }
        );
        break;

      case 'IN_PRODUCTION':
        effects.push({
          type: 'INITIALIZE_PRODUCTION',
          description: 'Production stages will be initialized',
        });
        break;

      case 'DELIVERED':
        effects.push({
          type: 'FINALIZE_DOCUMENTS',
          description: 'All documents will be finalized',
        });
        break;
    }

    return effects;
  },

  /**
   * Validate a transition with full checks
   */
  validateTransition(
    from: ProjectStatus,
    to: ProjectStatus,
    context: {
      hasQuoteDraft?: boolean;
      hasQuoteSent?: boolean;
      hasQuoteAccepted?: boolean;
      deliveryChecklistComplete?: boolean;
      configurationItemCount?: number;
    }
  ): TransitionValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let requiresConfirmation = false;

    // Check if transition is valid at all
    if (!this.canTransition(from, to)) {
      errors.push(`Cannot transition from ${from} to ${to}`);
      return { isValid: false, errors, warnings, requiresConfirmation };
    }

    // Check prerequisites
    const prerequisites = STATUS_PREREQUISITES[to];
    if (prerequisites) {
      for (const prereq of prerequisites) {
        switch (prereq) {
          case 'has_quote_draft':
            if (!context.hasQuoteDraft) {
              errors.push('A quote draft is required before marking as Quoted');
            }
            break;
          case 'has_quote_sent':
            if (!context.hasQuoteSent) {
              errors.push('Quote must be marked as sent before proceeding');
            }
            break;
          case 'has_quote_accepted':
            if (!context.hasQuoteAccepted) {
              errors.push('Quote must be accepted by client before confirming order');
            }
            break;
          case 'delivery_checklist_complete':
            if (!context.deliveryChecklistComplete) {
              warnings.push('Delivery checklist is not complete');
              requiresConfirmation = true;
            }
            break;
        }
      }
    }

    // Add warnings for significant transitions
    if (to === 'ORDER_CONFIRMED') {
      requiresConfirmation = true;
      if (!context.configurationItemCount || context.configurationItemCount === 0) {
        warnings.push('Configuration has no items - BOM will be empty');
      }
    }

    if (to === 'DELIVERED') {
      requiresConfirmation = true;
    }

    // Get milestone effects
    const milestoneEffects = this.getMilestoneEffects(to);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiresConfirmation: requiresConfirmation || milestoneEffects.length > 0,
      milestoneEffects,
    };
  },

  /**
   * Get display info for a status
   */
  getStatusInfo(status: ProjectStatus): {
    label: string;
    description: string;
    color: string;
    bgColor: string;
  } {
    const info: Record<ProjectStatus, { label: string; description: string; color: string; bgColor: string }> = {
      DRAFT: {
        label: 'Draft',
        description: 'Project is being configured',
        color: 'text-slate-700',
        bgColor: 'bg-slate-100',
      },
      QUOTED: {
        label: 'Quoted',
        description: 'Quote has been generated',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
      },
      OFFER_SENT: {
        label: 'Offer Sent',
        description: 'Quote sent to client, awaiting response',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-100',
      },
      ORDER_CONFIRMED: {
        label: 'Order Confirmed',
        description: 'Client has accepted, configuration frozen',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
      },
      IN_PRODUCTION: {
        label: 'In Production',
        description: 'Boat is being built',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
      },
      READY_FOR_DELIVERY: {
        label: 'Ready for Delivery',
        description: 'Production complete, awaiting handover',
        color: 'text-cyan-700',
        bgColor: 'bg-cyan-100',
      },
      DELIVERED: {
        label: 'Delivered',
        description: 'Boat delivered to client',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-100',
      },
      CLOSED: {
        label: 'Closed',
        description: 'Project completed and archived',
        color: 'text-slate-500',
        bgColor: 'bg-slate-50',
      },
    };

    return info[status];
  },

  /**
   * Check if project is editable (before ORDER_CONFIRMED)
   */
  isEditable(status: ProjectStatus): boolean {
    const editableStatuses: ProjectStatus[] = ['DRAFT', 'QUOTED', 'OFFER_SENT'];
    return editableStatuses.includes(status);
  },

  /**
   * Check if project is frozen (after ORDER_CONFIRMED)
   */
  isFrozen(status: ProjectStatus): boolean {
    const frozenStatuses: ProjectStatus[] = [
      'ORDER_CONFIRMED',
      'IN_PRODUCTION',
      'READY_FOR_DELIVERY',
      'DELIVERED',
      'CLOSED',
    ];
    return frozenStatuses.includes(status);
  },

  /**
   * Check if project is locked (after DELIVERED)
   */
  isLocked(status: ProjectStatus): boolean {
    const lockedStatuses: ProjectStatus[] = ['DELIVERED', 'CLOSED'];
    return lockedStatuses.includes(status);
  },
};
