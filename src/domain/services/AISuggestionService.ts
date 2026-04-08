/**
 * AI Suggestion Service - v4
 *
 * Provides scoped AI suggestions for TEXT AUTHORING ONLY.
 * This is a MOCK implementation - in production, this would call an LLM API.
 *
 * GOVERNANCE CONSTRAINTS:
 * - AI is restricted to text-authoring surfaces (narrative content)
 * - AI is NOT available for numeric fields, specifications, or identity data
 * - AI is suggestion-only, never authoritative
 * - AI output is never auto-inserted - user must explicitly accept
 * - No AI influence on compliance status, costs, or workflow
 * - No persistent AI metadata stored in domain models
 *
 * ALLOWED SCOPES:
 * - owners-manual-section: Free-form narrative sections in Owner's Manual
 * - compliance-text-snippet: User-authored compliance narrative text
 *
 * NOT ALLOWED:
 * - Vessel identity numeric fields (LOA, beam, displacement, etc.)
 * - Design category, max persons, max load
 * - WIN, builder address, year of construction
 * - Any field that becomes a "source of truth" for compliance
 */

import type { Project } from '@/domain/models';

// ============================================
// TYPES
// ============================================

/**
 * AI suggestion scopes - restricted to text-authoring surfaces only.
 * These are narrative text fields where AI can assist drafting.
 */
export type AISuggestionScope =
  | 'owners-manual-section'      // Free-form narrative in Owner's Manual blocks
  | 'compliance-text-snippet';   // User-authored compliance narrative

export interface AISuggestionRequest {
  /** The scope/type of content being suggested (text-authoring only) */
  scope: AISuggestionScope;
  /** Section or block identifier for context */
  sectionId?: string;
  /** Sub-section identifier for more specific context */
  subSectionId?: string;
  /** Existing content to use as context (if any) */
  currentContent?: string;
  /** Project context for generating relevant content (read-only, for context) */
  projectContext?: {
    projectTitle?: string;
    boatModel?: string;
    designCategory?: string;
    systems?: string[];
  };
}

export interface AISuggestionResult {
  /** The suggested text content */
  suggestion: string;
  /** Whether this is a placeholder/demo (always true for mock) */
  isDemo: boolean;
  /** Timestamp of generation */
  generatedAt: string;
}

// ============================================
// MOCK CONTENT TEMPLATES
// ============================================

/**
 * Owner's Manual section templates by chapter/subchapter.
 * These are narrative templates for user-authored content.
 */
const OWNERS_MANUAL_TEMPLATES: Record<string, Record<string, string>> = {
  'general-information': {
    'vessel-identification': `This document provides essential information about your vessel, including its identification numbers, specifications, and intended use. Please keep this manual with the vessel at all times and ensure all operators are familiar with its contents.`,
    'manufacturer': `The vessel was manufactured in accordance with European regulations for recreational craft. Our commitment to quality and safety is reflected in every aspect of the vessel's design and construction.`,
    'intended-use': `This vessel is designed and certified for the conditions specified on the builder's plate. Operating the vessel outside these parameters may void the warranty and compromise safety.`,
    'ce-marking': `This vessel bears the CE mark in accordance with Directive 2013/53/EU (Recreational Craft Directive). The CE mark indicates conformity with essential safety requirements for design, construction, and equipment.`,
  },
  'safety-information': {
    'general-safety': `Safety is paramount when operating this vessel. Before each voyage, conduct a pre-departure checklist, ensure all safety equipment is aboard and serviceable, and brief all passengers on emergency procedures.`,
    'emergency-procedures': `In an emergency: (1) Alert all aboard, (2) Don life jackets, (3) Assess the situation, (4) Take appropriate action, (5) Call for assistance on VHF Channel 16 if needed. The emergency kit is located [specify location].`,
    'fire-safety': `Fire extinguishers are located [specify locations]. In case of fire: (1) Alert all aboard, (2) Cut fuel supply if safe to do so, (3) Fight fire if small and contained, (4) Evacuate if fire spreads, (5) Call for assistance.`,
    'man-overboard': `If a person falls overboard: (1) Shout "Man overboard!" and point at the person, (2) Throw a lifebuoy, (3) Do not lose sight of the person, (4) Maneuver to recover, (5) If unable to recover, call for assistance immediately.`,
  },
  'operating-instructions': {
    'pre-departure': `Before departure: Check weather forecast, verify fuel and water levels, test all navigation lights, ensure VHF radio is operational, complete the pre-departure checklist, file a float plan with someone ashore.`,
    'starting-engine': `[For electric propulsion] Ensure shore power is disconnected, check battery state of charge on the display, turn the main battery switch to ON, activate the control panel, follow the motor controller startup sequence.`,
    'navigation': `Observe all navigation rules (COLREGS). Maintain a proper lookout at all times. Use appropriate navigation lights from sunset to sunrise and in reduced visibility. Stay clear of shipping lanes when possible.`,
    'anchoring': `When anchoring: (1) Approach the anchorage slowly, (2) Check depth and bottom type, (3) Lower anchor while reversing slowly, (4) Set anchor with reverse thrust, (5) Verify anchor is holding before shutting down.`,
  },
  'systems': {
    'electrical': `The vessel is equipped with a DC electrical system. The main battery switch is located [specify]. Never modify electrical systems without qualified assistance.`,
    'fuel': `[If applicable] Refuel in well-ventilated areas only. Check for fuel leaks regularly. Never smoke or use open flames near fuel systems.`,
    'propulsion': `[For electric propulsion] Monitor battery state of charge and plan routes accordingly. Regenerative braking may be available at reduced speeds.`,
    'shore-power': `Shore power connection allows charging while moored. Use only approved shore power cables. Ensure the galvanic isolator is functioning. Never connect shore power with wet hands or in wet conditions.`,
  },
  'maintenance': {
    'general-maintenance': `Regular maintenance extends vessel life and ensures safety. Keep a maintenance log. Follow the maintenance schedule in this manual. Use only recommended fluids and parts.`,
    'engine-maintenance': `[For electric propulsion] Electric motors require minimal maintenance. Check connections annually. Keep motor housing clean. Have the system professionally inspected as recommended.`,
    'hull-maintenance': `Clean the hull regularly to prevent fouling. Inspect and treat antifouling as needed. Check hull fittings for corrosion. Store the vessel appropriately during winter months.`,
  },
};

/**
 * Compliance text snippet templates.
 * These are user-authored narrative sections, not spec fields.
 */
const COMPLIANCE_TEXT_TEMPLATES: Record<string, string> = {
  'scope-note': `This standard applies to the vessel's [specific system or aspect]. Compliance is demonstrated through [testing/documentation/inspection].`,
  'test-summary': `Testing was conducted in accordance with the referenced standard. Results confirm compliance with the applicable requirements.`,
  'inspection-notes': `Visual inspection confirms proper installation and condition of [components]. No defects or non-conformities observed.`,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateGenericSuggestion(request: AISuggestionRequest): string {
  const { currentContent, projectContext } = request;

  // If there's existing content, suggest an expansion
  if (currentContent && currentContent.trim().length > 10) {
    return `${currentContent}\n\n[Consider expanding this section with additional details about safety considerations, operating procedures, or maintenance requirements as applicable.]`;
  }

  // Generic suggestion based on context
  if (projectContext?.boatModel) {
    return `This section provides information specific to the ${projectContext.boatModel}. [Add detailed content relevant to this section.]`;
  }

  return `[Enter detailed content for this section. Consider including relevant safety information, operating procedures, or technical specifications as appropriate for the context.]`;
}

// ============================================
// AI SUGGESTION SERVICE
// ============================================

export const AISuggestionService = {
  /**
   * Generate an AI suggestion for the given request.
   * This is a MOCK implementation that returns template-based content.
   *
   * IMPORTANT: Only text-authoring scopes are supported.
   * This service does NOT generate suggestions for spec/numeric fields.
   *
   * @param request The suggestion request with context
   * @returns A promise resolving to the suggestion result
   */
  async generateSuggestion(request: AISuggestionRequest): Promise<AISuggestionResult> {
    // Simulate API delay (150-400ms)
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250));

    let suggestion = '';

    switch (request.scope) {
      case 'owners-manual-section': {
        const chapterTemplates = OWNERS_MANUAL_TEMPLATES[request.sectionId || ''] || {};
        const template = chapterTemplates[request.subSectionId || ''];

        if (template) {
          suggestion = template;
        } else {
          suggestion = generateGenericSuggestion(request);
        }
        break;
      }

      case 'compliance-text-snippet': {
        const snippetType = request.sectionId || '';
        suggestion = COMPLIANCE_TEXT_TEMPLATES[snippetType] || generateGenericSuggestion(request);
        break;
      }

      default:
        suggestion = generateGenericSuggestion(request);
        break;
    }

    return {
      suggestion,
      isDemo: true,
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Generate a suggestion for an Owner's Manual section.
   * This is for narrative text content only.
   */
  async suggestOwnerManualSection(
    chapterId: string,
    subchapterId: string,
    currentContent: string,
    project?: Project
  ): Promise<AISuggestionResult> {
    return this.generateSuggestion({
      scope: 'owners-manual-section',
      sectionId: chapterId,
      subSectionId: subchapterId,
      currentContent,
      projectContext: {
        projectTitle: project?.title,
        boatModel: project?.vesselIdentity?.modelName,
        designCategory: project?.vesselIdentity?.designCategory,
        systems: project?.systems,
      },
    });
  },

  /**
   * Check if AI suggestions are available.
   * In production, this might check API availability.
   */
  isAvailable(): boolean {
    return true;
  },
};
