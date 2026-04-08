/**
 * Work Instruction Service - v4
 * Single write path for all work instruction operations
 *
 * Architecture notes:
 * - All mutations go through this service (no ad-hoc repository writes)
 * - Explicit actions only (no background sync, no auto-save)
 * - AI draft generation returns draft data for user review (no auto-publish)
 * - Uses AuditService for tracking changes
 */

import type {
  WorkInstruction,
  WorkInstructionComment,
  WorkInstructionAttachment,
  CreateWorkInstructionInput,
  UpdateWorkInstructionInput,
  AddWorkInstructionAttachmentInput,
  AddWorkInstructionCommentInput,
  GenerateWorkInstructionDraftInput,
  WorkInstructionDraft,
  WorkInstructionFilters,
} from '@/domain/models/work-instruction';
import type { ProductionStageCode } from '@/domain/models/production';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { WorkInstructionRepository, WorkInstructionCommentRepository } from '@/data/repositories/WorkInstructionRepository';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { DEFAULT_PRODUCTION_STAGES } from '@/domain/models/production';
import { SettingsService } from './SettingsService';

// ============================================
// WORK INSTRUCTION SERVICE
// ============================================

export const WorkInstructionService = {
  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get all work instructions
   */
  async getAll(): Promise<WorkInstruction[]> {
    return WorkInstructionRepository.getAll();
  },

  /**
   * Get work instruction by ID
   */
  async getById(id: string): Promise<WorkInstruction | null> {
    return WorkInstructionRepository.getById(id);
  },

  /**
   * Get work instructions with filters
   */
  async getFiltered(filters: WorkInstructionFilters): Promise<WorkInstruction[]> {
    let results = await WorkInstructionRepository.getAll();

    if (filters.stageCategory) {
      results = results.filter((wi) => wi.stageCategory === filters.stageCategory);
    }

    if (filters.scope) {
      results = results.filter((wi) => wi.scope === filters.scope);
    }

    if (filters.modelRef) {
      results = results.filter((wi) => wi.modelRef === filters.modelRef);
    }

    if (filters.status) {
      results = results.filter((wi) => wi.status === filters.status);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      results = results.filter(
        (wi) =>
          wi.title.toLowerCase().includes(query) ||
          wi.content.toLowerCase().includes(query)
      );
    }

    return results.sort((a, b) => a.title.localeCompare(b.title));
  },

  /**
   * Get work instructions grouped by stage category
   */
  async getGroupedByStageCategory(): Promise<Map<ProductionStageCode, WorkInstruction[]>> {
    const all = await WorkInstructionRepository.getAll();
    const grouped = new Map<ProductionStageCode, WorkInstruction[]>();

    // Initialize with all stage categories in order
    for (const stage of DEFAULT_PRODUCTION_STAGES) {
      grouped.set(stage.code, []);
    }

    // Group work instructions
    for (const wi of all) {
      const list = grouped.get(wi.stageCategory) || [];
      list.push(wi);
      grouped.set(wi.stageCategory, list);
    }

    // Sort within each group
    for (const [key, list] of grouped) {
      grouped.set(key, list.sort((a, b) => a.title.localeCompare(b.title)));
    }

    return grouped;
  },

  /**
   * Get published work instructions only
   */
  async getPublished(): Promise<WorkInstruction[]> {
    return WorkInstructionRepository.getPublished();
  },

  /**
   * Get comments for a work instruction
   */
  async getComments(workInstructionId: string): Promise<WorkInstructionComment[]> {
    return WorkInstructionCommentRepository.getByWorkInstructionId(workInstructionId);
  },

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  /**
   * Create a new work instruction
   */
  async create(
    input: CreateWorkInstructionInput,
    context: AuditContext
  ): Promise<Result<WorkInstruction, string>> {
    // Validate input
    if (!input.title || input.title.trim() === '') {
      return Err('Title is required');
    }

    // Validate modelRef is provided when scope is modelSpecific
    if (input.scope === 'modelSpecific' && !input.modelRef) {
      return Err('Model reference is required for model-specific instructions');
    }

    // Clear modelRef if scope is general
    const modelRef = input.scope === 'general' ? undefined : input.modelRef;

    const workInstruction: WorkInstruction = {
      id: generateUUID(),
      title: input.title.trim(),
      stageCategory: input.stageCategory,
      scope: input.scope,
      modelRef,
      content: input.content || '',
      attachments: [],
      status: 'draft',
      createdAt: now(),
      createdBy: context.userId,
      updatedAt: now(),
      updatedBy: context.userId,
    };

    await WorkInstructionRepository.save(workInstruction);

    await AuditService.logCreate(context, 'WorkInstruction', workInstruction.id, {
      title: workInstruction.title,
      stageCategory: workInstruction.stageCategory,
      scope: workInstruction.scope,
    });

    return Ok(workInstruction);
  },

  /**
   * Update a work instruction
   */
  async update(
    id: string,
    input: UpdateWorkInstructionInput,
    context: AuditContext
  ): Promise<Result<WorkInstruction, string>> {
    const existing = await WorkInstructionRepository.getById(id);
    if (!existing) {
      return Err('Work instruction not found');
    }

    // Validate title if provided
    if (input.title !== undefined && input.title.trim() === '') {
      return Err('Title cannot be empty');
    }

    // Handle scope/modelRef consistency
    let modelRef = existing.modelRef;
    if (input.scope !== undefined) {
      if (input.scope === 'general') {
        modelRef = undefined;
      } else if (input.scope === 'modelSpecific') {
        modelRef = input.modelRef || existing.modelRef;
        if (!modelRef) {
          return Err('Model reference is required for model-specific instructions');
        }
      }
    } else if (input.modelRef !== undefined) {
      modelRef = input.modelRef;
    }

    const updated: WorkInstruction = {
      ...existing,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      stageCategory: input.stageCategory !== undefined ? input.stageCategory : existing.stageCategory,
      scope: input.scope !== undefined ? input.scope : existing.scope,
      modelRef,
      content: input.content !== undefined ? input.content : existing.content,
      updatedAt: now(),
      updatedBy: context.userId,
    };

    await WorkInstructionRepository.save(updated);

    await AuditService.logUpdate(
      context,
      'WorkInstruction',
      id,
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>
    );

    return Ok(updated);
  },

  /**
   * Publish a work instruction (explicit action)
   */
  async publish(
    id: string,
    context: AuditContext
  ): Promise<Result<WorkInstruction, string>> {
    const existing = await WorkInstructionRepository.getById(id);
    if (!existing) {
      return Err('Work instruction not found');
    }

    if (existing.status === 'published') {
      return Err('Work instruction is already published');
    }

    // Validate content is not empty
    if (!existing.content || existing.content.trim() === '') {
      return Err('Cannot publish work instruction with empty content');
    }

    const updated: WorkInstruction = {
      ...existing,
      status: 'published',
      updatedAt: now(),
      updatedBy: context.userId,
    };

    await WorkInstructionRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'WorkInstruction',
      id,
      `Published work instruction: ${existing.title}`
    );

    return Ok(updated);
  },

  /**
   * Unpublish a work instruction (revert to draft)
   */
  async unpublish(
    id: string,
    context: AuditContext
  ): Promise<Result<WorkInstruction, string>> {
    const existing = await WorkInstructionRepository.getById(id);
    if (!existing) {
      return Err('Work instruction not found');
    }

    if (existing.status === 'draft') {
      return Err('Work instruction is already a draft');
    }

    const updated: WorkInstruction = {
      ...existing,
      status: 'draft',
      updatedAt: now(),
      updatedBy: context.userId,
    };

    await WorkInstructionRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'WorkInstruction',
      id,
      `Reverted work instruction to draft: ${existing.title}`
    );

    return Ok(updated);
  },

  /**
   * Delete a work instruction
   */
  async delete(
    id: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const existing = await WorkInstructionRepository.getById(id);
    if (!existing) {
      return Err('Work instruction not found');
    }

    // Delete associated comments first
    await WorkInstructionCommentRepository.deleteByWorkInstructionId(id);

    // Delete the work instruction
    await WorkInstructionRepository.delete(id);

    await AuditService.log(
      context,
      'DELETE',
      'WorkInstruction',
      id,
      `Deleted work instruction: ${existing.title}`
    );

    return Ok(undefined);
  },

  // ============================================
  // ATTACHMENT OPERATIONS
  // ============================================

  /**
   * Add an attachment to a work instruction
   */
  async addAttachment(
    id: string,
    input: AddWorkInstructionAttachmentInput,
    context: AuditContext
  ): Promise<Result<WorkInstructionAttachment, string>> {
    const existing = await WorkInstructionRepository.getById(id);
    if (!existing) {
      return Err('Work instruction not found');
    }

    const attachment: WorkInstructionAttachment = {
      id: generateUUID(),
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      dataUrl: input.dataUrl,
      url: input.url,
      description: input.description,
      uploadedAt: now(),
      uploadedBy: context.userId,
    };

    const updated: WorkInstruction = {
      ...existing,
      attachments: [...existing.attachments, attachment],
      updatedAt: now(),
      updatedBy: context.userId,
    };

    await WorkInstructionRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'WorkInstruction',
      id,
      `Added attachment: ${input.filename}`
    );

    return Ok(attachment);
  },

  /**
   * Remove an attachment from a work instruction
   */
  async removeAttachment(
    id: string,
    attachmentId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const existing = await WorkInstructionRepository.getById(id);
    if (!existing) {
      return Err('Work instruction not found');
    }

    const attachment = existing.attachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      return Err('Attachment not found');
    }

    const updated: WorkInstruction = {
      ...existing,
      attachments: existing.attachments.filter((a) => a.id !== attachmentId),
      updatedAt: now(),
      updatedBy: context.userId,
    };

    await WorkInstructionRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'WorkInstruction',
      id,
      `Removed attachment: ${attachment.filename}`
    );

    return Ok(undefined);
  },

  // ============================================
  // COMMENT OPERATIONS (append-only)
  // ============================================

  /**
   * Add a comment to a work instruction
   */
  async addComment(
    workInstructionId: string,
    input: AddWorkInstructionCommentInput,
    context: AuditContext
  ): Promise<Result<WorkInstructionComment, string>> {
    const existing = await WorkInstructionRepository.getById(workInstructionId);
    if (!existing) {
      return Err('Work instruction not found');
    }

    if (!input.body || input.body.trim() === '') {
      return Err('Comment body is required');
    }

    const comment: WorkInstructionComment = {
      id: generateUUID(),
      workInstructionId,
      body: input.body.trim(),
      createdAt: now(),
      createdBy: context.userId,
      createdByName: context.userName,
    };

    await WorkInstructionCommentRepository.save(comment);

    await AuditService.log(
      context,
      'CREATE',
      'WorkInstructionComment',
      comment.id,
      `Added comment to work instruction: ${existing.title}`
    );

    return Ok(comment);
  },

  // ============================================
  // AI DRAFT GENERATION
  // ============================================

  /**
   * Generate a draft work instruction using AI
   * Returns draft data for user review - does NOT auto-save or auto-publish
   */
  async generateDraft(
    input: GenerateWorkInstructionDraftInput
  ): Promise<Result<WorkInstructionDraft, string>> {
    // Find stage info for context
    const stage = DEFAULT_PRODUCTION_STAGES.find((s) => s.code === input.stageCategory);
    if (!stage) {
      return Err('Invalid stage category');
    }

    // In a real implementation, this would call an AI service
    // For now, generate a template based on stage
    const title = `${stage.name} Work Instruction`;

    const content = `# ${stage.name} Work Instruction

## Overview
This work instruction covers the procedures for the **${stage.name}** stage of production.

## Prerequisites
- [ ] Previous stage completed and signed off
- [ ] Required materials available
- [ ] Work area prepared

## Safety Requirements
- Wear appropriate PPE
- Follow all safety protocols
- Report any hazards immediately

## Procedure

### Step 1: Preparation
Describe preparation steps here...

### Step 2: Execution
Describe main work steps here...

### Step 3: Quality Check
Describe quality verification steps here...

## Completion Criteria
- [ ] All steps completed
- [ ] Quality checks passed
- [ ] Documentation updated
- [ ] Work area cleaned

## Notes
${input.additionalContext || 'Add any additional notes or model-specific instructions here.'}

---
*This draft was generated automatically. Please review and edit before publishing.*
`;

    return Ok({
      title,
      content,
    });
  },

  // ============================================
  // DUPLICATE
  // ============================================

  /**
   * Duplicate a work instruction
   * Creates a copy with "(Copy)" suffix, as draft
   */
  async duplicate(
    id: string,
    context: AuditContext
  ): Promise<Result<WorkInstruction, string>> {
    const existing = await WorkInstructionRepository.getById(id);
    if (!existing) {
      return Err('Work instruction not found');
    }

    const duplicate: WorkInstruction = {
      id: generateUUID(),
      title: `${existing.title} (Copy)`,
      stageCategory: existing.stageCategory,
      scope: existing.scope,
      modelRef: existing.modelRef,
      content: existing.content,
      attachments: existing.attachments.map((a) => ({
        ...a,
        id: generateUUID(), // New IDs for attachments
        uploadedAt: now(),
        uploadedBy: context.userId,
      })),
      status: 'draft', // Always start as draft
      createdAt: now(),
      createdBy: context.userId,
      updatedAt: now(),
      updatedBy: context.userId,
    };

    await WorkInstructionRepository.save(duplicate);

    await AuditService.log(
      context,
      'CREATE',
      'WorkInstruction',
      duplicate.id,
      `Duplicated work instruction from: ${existing.title}`
    );

    return Ok(duplicate);
  },

  // ============================================
  // SAMPLE DATA INITIALIZATION
  // ============================================

  /**
   * Initialize sample work instructions for demo purposes
   * Only seeds once - uses persistent flag to prevent re-seeding after deletion
   */
  async initializeSamples(context: AuditContext): Promise<void> {
    // Check the persistent initialization flag
    const alreadyInitialized = await SettingsService.hasInitialized('sampleWorkInstructions');
    if (alreadyInitialized) {
      return; // Already initialized (flag set)
    }

    // Also check if data exists (for backward compatibility)
    const existing = await WorkInstructionRepository.getAll();
    if (existing.length > 0) {
      // Data exists but flag not set - set the flag and return
      await SettingsService.markInitialized('sampleWorkInstructions');
      return;
    }

    const samples: Array<{
      title: string;
      stageCategory: typeof DEFAULT_PRODUCTION_STAGES[number]['code'];
      content: string;
    }> = [
      {
        title: 'Hull Preparation Checklist',
        stageCategory: 'PREP',
        content: `# Hull Preparation Checklist

## Overview
This instruction covers the preparation stage before hull construction begins.

## Materials Required
- [ ] Aluminium sheets (per BOM)
- [ ] Welding consumables
- [ ] Cutting templates
- [ ] Safety equipment

## Preparation Steps

### 1. Material Inspection
- Verify aluminium grade matches specification
- Check for surface defects or damage
- Confirm dimensions against cutting list

### 2. Work Area Setup
- Clear work area of debris
- Position welding equipment
- Set up ventilation systems
- Prepare cutting table

### 3. Template Preparation
- Verify template accuracy
- Mark cutting lines on material
- Double-check measurements

## Quality Checkpoints
- [ ] All materials inspected and approved
- [ ] Work area safety check completed
- [ ] Templates verified against drawings
- [ ] Tools calibrated and ready

## Sign-off
Supervisor approval required before proceeding to Hull Construction.
`,
      },
      {
        title: 'Hull Welding Procedures',
        stageCategory: 'HULL',
        content: `# Hull Welding Procedures

## Overview
Standard welding procedures for aluminium hull construction.

## Safety Requirements
- Full face welding shield
- Welding gloves and apron
- Proper ventilation active
- Fire extinguisher within reach

## Welding Parameters

### MIG Welding Settings
| Material Thickness | Wire Speed | Voltage | Gas Flow |
|-------------------|------------|---------|----------|
| 3mm | 4.5 m/min | 19V | 15 L/min |
| 5mm | 5.5 m/min | 21V | 18 L/min |
| 6mm | 6.0 m/min | 23V | 20 L/min |

### TIG Welding Settings
| Thickness | Amperage | Gas Flow |
|-----------|----------|----------|
| 3mm | 90-110A | 12 L/min |
| 5mm | 130-150A | 15 L/min |

## Procedure

### 1. Joint Preparation
- Clean surfaces with acetone
- Remove oxide layer (within 4 hours of welding)
- Ensure proper fit-up gap

### 2. Tack Welding
- Tack at 100mm intervals
- Check alignment after each tack
- Adjust as needed before full welding

### 3. Full Welding
- Weld in sequence per drawing
- Maintain consistent travel speed
- Allow cooling between passes

## Quality Inspection
- [ ] Visual inspection (no porosity, undercut)
- [ ] Penetrant test on critical welds
- [ ] Dimensional check post-welding
`,
      },
      {
        title: 'Electrical System Installation',
        stageCategory: 'ELECTRICAL',
        content: `# Electrical System Installation

## Overview
Procedures for installing the vessel's electrical systems.

## Safety
- Main power isolated before work
- Lockout/Tagout procedures in place
- Insulated tools only

## Components

### Distribution Panel
1. Mount main distribution panel
2. Connect shore power inlet
3. Install battery charger
4. Connect battery bank

### Wiring
- Use marine-grade tinned copper wire
- Follow color coding standards
- Label all circuits
- Secure with cable ties every 300mm

### Testing
- [ ] Continuity test all circuits
- [ ] Insulation resistance test (>1MΩ)
- [ ] Polarity check
- [ ] Load test at 80% capacity

## Documentation
Update as-built drawings with actual wire runs and connection points.
`,
      },
      {
        title: 'Final Inspection Checklist',
        stageCategory: 'FINAL',
        content: `# Final Inspection Checklist

## Overview
Comprehensive inspection before handover to client.

## Documentation Review
- [ ] Technical file complete
- [ ] CE Declaration signed
- [ ] Owner's manual prepared
- [ ] Warranty documentation ready

## Visual Inspection
- [ ] Hull exterior (no damage, proper finish)
- [ ] Deck hardware secure
- [ ] Windows and hatches sealed
- [ ] Interior finish complete

## Systems Testing
- [ ] Engine start and run test
- [ ] All electrical circuits functional
- [ ] Navigation lights operational
- [ ] Bilge pumps tested
- [ ] Fire suppression system checked

## Safety Equipment
- [ ] Life jackets present (correct quantity)
- [ ] Fire extinguishers mounted and charged
- [ ] First aid kit complete
- [ ] Distress signals valid date

## Sea Trial Items
- [ ] Steering response normal
- [ ] Throttle response smooth
- [ ] No unusual vibrations
- [ ] GPS and instruments calibrated

## Sign-off
Quality Manager and Production Manager signatures required.
`,
      },
    ];

    for (const sample of samples) {
      const instruction: WorkInstruction = {
        id: generateUUID(),
        title: sample.title,
        stageCategory: sample.stageCategory,
        scope: 'general',
        content: sample.content,
        attachments: [],
        status: 'published',
        createdAt: now(),
        createdBy: context.userId,
        updatedAt: now(),
        updatedBy: context.userId,
      };

      await WorkInstructionRepository.save(instruction);
    }

    // Mark as initialized so deleted data won't be re-seeded
    await SettingsService.markInitialized('sampleWorkInstructions');

    console.log(`Created ${samples.length} sample work instructions`);
  },
};
