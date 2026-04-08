/**
 * Procedure Service - v4
 * Manages operating procedures for boat models
 */

import type {
  LibraryProcedure,
  ProcedureVersion,
} from '@/domain/models';
import { Result, Ok, Err } from '@/domain/models';
import { ProcedureRepository } from '@/data/repositories/LibraryRepository';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// PROCEDURE CATEGORIES
// ============================================

export const PROCEDURE_CATEGORIES = [
  { id: 'operation', label: 'Operation', description: 'How to operate the vessel' },
  { id: 'safety', label: 'Safety', description: 'Safety procedures and emergency protocols' },
  { id: 'maintenance', label: 'Maintenance', description: 'Regular maintenance procedures' },
  { id: 'electrical', label: 'Electrical', description: 'Electrical system procedures' },
  { id: 'propulsion', label: 'Propulsion', description: 'Propulsion system procedures' },
  { id: 'navigation', label: 'Navigation', description: 'Navigation equipment usage' },
];

// ============================================
// DEFAULT PROCEDURES
// ============================================

const DEFAULT_PROCEDURES = [
  {
    category: 'operation',
    title: 'Pre-Departure Checklist',
    content: `# Pre-Departure Checklist

Before leaving the dock, complete the following checks:

## Weather & Conditions
- [ ] Check weather forecast for the planned route
- [ ] Note wind speed and direction
- [ ] Check tide tables if relevant
- [ ] Inform someone ashore of your float plan

## Safety Equipment
- [ ] Verify all life jackets are on board (1 per person minimum)
- [ ] Check fire extinguisher accessibility
- [ ] Confirm first aid kit is complete
- [ ] Test VHF radio
- [ ] Check navigation lights operation

## Vessel Systems
- [ ] Check battery charge level (minimum 80% for departure)
- [ ] Verify bilge is dry
- [ ] Test bilge pump operation
- [ ] Check steering response
- [ ] Verify all hatches are secured

## Navigation
- [ ] Update charts if required
- [ ] Set up GPS route if planned
- [ ] Confirm compass operation
- [ ] Check radar function (if equipped)

## Final Checks
- [ ] Remove shore power connection
- [ ] Untie mooring lines systematically
- [ ] Verify fenders are ready for arrival
`,
  },
  {
    category: 'safety',
    title: 'Man Overboard Procedure',
    content: `# Man Overboard (MOB) Procedure

## Immediate Actions
1. **SHOUT** "Man overboard!" to alert crew
2. **POINT** - Designate someone to point continuously at the person in the water
3. **THROW** - Deploy lifering or floatation device toward person
4. **PRESS** - Activate MOB button on GPS/chartplotter

## Recovery Approach

### Power Vessels
1. Reduce speed immediately
2. Note position on GPS
3. Circle back keeping person in sight
4. Approach from downwind
5. Stop engines before person reaches propeller zone
6. Use throwing line or boat hook to assist recovery

## After Recovery
1. Check for injuries and treat hypothermia
2. Contact coast guard if medical attention needed
3. Log the incident with time, location, conditions
`,
  },
  {
    category: 'electrical',
    title: 'Battery System Operation',
    content: `# Battery System Operation

## Daily Monitoring
- Check battery state of charge on display panel
- Note any warning indicators
- Verify shore charger connection when docked

## Charging Procedures

### Shore Power Charging
1. Connect shore power cable to vessel
2. Connect to shore power outlet
3. Verify charger activation on panel
4. Target full charge before departure

### Solar Charging (if equipped)
- Solar system charges automatically
- Monitor via display panel
- Ensure panels are clean and unobstructed

## Low Battery Protocol
If battery drops below 20%:
1. Reduce non-essential loads
2. Return to shore if possible
3. Contact marina for assistance if needed

## Winter Storage
1. Fully charge batteries before storage
2. Disconnect battery main switch
3. Consider trickle charger for extended storage
`,
  },
  {
    category: 'maintenance',
    title: 'Monthly Maintenance Schedule',
    content: `# Monthly Maintenance Schedule

## Hull & Deck
- [ ] Inspect hull for damage or growth
- [ ] Clean waterline
- [ ] Check anodes
- [ ] Inspect deck hardware and rails
- [ ] Lubricate hinges and latches

## Propulsion System
- [ ] Check propeller for damage
- [ ] Inspect shaft seals (if applicable)
- [ ] Verify motor mounts
- [ ] Check cooling system

## Electrical
- [ ] Inspect battery terminals
- [ ] Check all lighting
- [ ] Test navigation equipment
- [ ] Verify bilge pump operation

## Safety Equipment
- [ ] Inspect life jackets
- [ ] Check fire extinguisher pressure
- [ ] Verify first aid kit contents
- [ ] Test VHF radio
- [ ] Check flare expiry dates

## Documentation
- [ ] Update maintenance log
- [ ] Note any items requiring attention
- [ ] Schedule any professional service needed
`,
  },
];

// ============================================
// PROCEDURE SERVICE
// ============================================

export const ProcedureService = {
  /**
   * Get all procedure categories
   */
  getCategories() {
    return PROCEDURE_CATEGORIES;
  },

  /**
   * Get all procedures
   */
  async getAllProcedures(): Promise<LibraryProcedure[]> {
    return ProcedureRepository.getAll();
  },

  /**
   * Get procedure with versions
   */
  async getProcedureWithVersions(procedureId: string): Promise<{
    procedure: LibraryProcedure;
    versions: ProcedureVersion[];
  } | null> {
    const procedure = await ProcedureRepository.getById(procedureId);
    if (!procedure) return null;

    const versions = await ProcedureRepository.getVersions(procedureId);
    return { procedure, versions };
  },

  /**
   * Get procedures by category
   */
  async getProceduresByCategory(category: string): Promise<LibraryProcedure[]> {
    const all = await ProcedureRepository.getAll();
    return all.filter(p => p.category === category);
  },

  /**
   * Create a new procedure
   */
  async createProcedure(
    category: string,
    title: string,
    content: string,
    context: AuditContext
  ): Promise<Result<LibraryProcedure, string>> {
    try {
      const procedure = await ProcedureRepository.create({
        category,
        title,
        description: title,
      });

      // Create initial version
      await ProcedureRepository.createVersion(
        procedure.id,
        '1.0',
        content,
        [], // applicable to all models
        context.userId
      );

      await AuditService.logCreate(context, 'Procedure', procedure.id, {
        category,
        title,
      });

      return Ok(procedure);
    } catch (error) {
      return Err(`Failed to create procedure: ${error}`);
    }
  },

  /**
   * Create new version of a procedure
   */
  async createVersion(
    procedureId: string,
    versionLabel: string,
    content: string,
    applicableModelIds: string[],
    context: AuditContext
  ): Promise<Result<ProcedureVersion, string>> {
    try {
      const version = await ProcedureRepository.createVersion(
        procedureId,
        versionLabel,
        content,
        applicableModelIds,
        context.userId
      );

      await AuditService.logCreate(context, 'ProcedureVersion', version.id, {
        procedureId,
        versionLabel,
      });

      return Ok(version);
    } catch (error) {
      return Err(`Failed to create version: ${error}`);
    }
  },

  /**
   * Approve a procedure version
   */
  async approveVersion(
    versionId: string,
    context: AuditContext
  ): Promise<Result<ProcedureVersion, string>> {
    try {
      const version = await ProcedureRepository.approveVersion(versionId, context.userId);
      if (!version) {
        return Err('Procedure version not found');
      }

      await AuditService.logApproval(context, 'ProcedureVersion', versionId, version.versionLabel);

      return Ok(version);
    } catch (error) {
      return Err(`Failed to approve: ${error}`);
    }
  },

  /**
   * Delete a procedure
   */
  async deleteProcedure(
    procedureId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    try {
      const procedure = await ProcedureRepository.getById(procedureId);
      if (!procedure) {
        return Err('Procedure not found');
      }

      await ProcedureRepository.delete(procedureId);

      await AuditService.log(
        context,
        'UPDATE',
        'Procedure',
        procedureId,
        `Deleted procedure: ${procedure.title}`
      );

      return Ok(undefined);
    } catch (error) {
      return Err(`Failed to delete: ${error}`);
    }
  },

  /**
   * Initialize default procedures if none exist
   */
  async initializeDefaultProcedures(context: AuditContext): Promise<void> {
    const existing = await ProcedureRepository.getAll();
    if (existing.length > 0) return;

    for (const proc of DEFAULT_PROCEDURES) {
      await this.createProcedure(proc.category, proc.title, proc.content, context);
    }
  },

  /**
   * Render procedure content (Markdown to HTML)
   */
  renderProcedureContent(content: string): string {
    // Simple markdown conversion
    let html = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      // Lists
      .replace(/^- \[ \] (.*$)/gim, '<li class="checkbox"><input type="checkbox" disabled /> $1</li>')
      .replace(/^- \[x\] (.*$)/gim, '<li class="checkbox"><input type="checkbox" checked disabled /> $1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br />');

    // Wrap in container
    return `<div class="procedure-content"><p>${html}</p></div>`;
  },
};
