/**
 * Compliance Service - v4
 * Manages certification packs, chapters, sections, and attachments
 * Supports CE, ES-TRIN, Lloyds and custom certifications
 */

import type {
  ComplianceCertification,
  ComplianceChapter,
  ComplianceSection,
  ComplianceAttachment,
  ComplianceChecklistItem,
  CertificationType,
  ComplianceChapterStatus,
  ChecklistItemStatus,
  CreateCertificationInput,
  CreateChapterInput,
  CreateSectionInput,
  AddComplianceAttachmentInput,
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
} from '@/domain/models';
import {
  getChapterScaffold,
  getChapterChecklist,
  CERTIFICATION_LABELS,
} from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';

// ============================================
// COMPLIANCE SERVICE
// ============================================

export const ComplianceService = {
  // ============================================
  // CERTIFICATION CRUD
  // ============================================

  /**
   * Initialize a certification pack for a project
   * Creates the chapter scaffold based on certification type
   */
  async initializeCertification(
    projectId: string,
    input: CreateCertificationInput,
    context: AuditContext
  ): Promise<Result<ComplianceCertification, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Check if this certification type already exists
    const existingPacks = project.compliancePacks || [];
    const existingOfType = existingPacks.find(p => p.type === input.type && p.status !== 'FINAL');
    if (existingOfType) {
      return Err(`A ${CERTIFICATION_LABELS[input.type]} certification is already in progress`);
    }

    const certId = generateUUID();
    const timestamp = now();

    // Get the scaffold for this certification type
    const scaffold = getChapterScaffold(input.type);

    // Create chapters from scaffold with checklist items
    const chapters: ComplianceChapter[] = scaffold.map((template) => {
      const chapterId = generateUUID();
      const checklistScaffold = getChapterChecklist(input.type, template.chapterNumber);

      // Create checklist items from scaffold
      const checklist: ComplianceChecklistItem[] = checklistScaffold.map((item) => ({
        id: generateUUID(),
        chapterId,
        title: item.title,
        type: item.type,
        status: 'NOT_STARTED' as ChecklistItemStatus,
        mandatory: item.mandatory,
        notes: item.notes,
        attachments: [],
        sortOrder: item.sortOrder,
      }));

      return {
        id: chapterId,
        certificationId: certId,
        chapterNumber: template.chapterNumber,
        title: template.title,
        description: template.description,
        status: 'DRAFT' as ComplianceChapterStatus,
        attachments: [],
        sections: [],
        checklist,
        notes: template.notes,
        sortOrder: template.sortOrder,
      };
    });

    const certification: ComplianceCertification = {
      id: certId,
      projectId,
      type: input.type,
      name: input.name || CERTIFICATION_LABELS[input.type],
      version: 1,
      status: 'DRAFT',
      chapters,
      notes: input.notes,
      createdAt: timestamp,
      createdBy: context.userName,
    };

    // Update project
    const updatedPacks = [...existingPacks, certification];
    await ProjectRepository.update(projectId, {
      compliancePacks: updatedPacks,
    });

    await AuditService.log(
      context,
      'CREATE',
      'ComplianceCertification',
      certId,
      `Initialized ${CERTIFICATION_LABELS[input.type]} certification for project`,
      { metadata: { projectId, type: input.type } }
    );

    return Ok(certification);
  },

  /**
   * Get a certification by ID
   */
  async getCertification(
    projectId: string,
    certificationId: string
  ): Promise<Result<ComplianceCertification, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const cert = (project.compliancePacks || []).find(p => p.id === certificationId);
    if (!cert) {
      return Err('Certification not found');
    }

    return Ok(cert);
  },

  /**
   * Get all certifications for a project
   */
  async getCertifications(projectId: string): Promise<Result<ComplianceCertification[], string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    return Ok(project.compliancePacks || []);
  },

  /**
   * Update certification notes
   */
  async updateCertificationNotes(
    projectId: string,
    certificationId: string,
    notes: string,
    context: AuditContext
  ): Promise<Result<ComplianceCertification, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Cannot modify a finalized certification');
    }

    const updated = { ...cert, notes };
    packs[certIndex] = updated;

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    return Ok(updated);
  },

  /**
   * Duplicate a certification (for creating new versions of finalized certs)
   */
  async duplicateCertification(
    projectId: string,
    certificationId: string,
    context: AuditContext
  ): Promise<Result<ComplianceCertification, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const original = packs.find(p => p.id === certificationId);
    if (!original) {
      return Err('Certification not found');
    }

    const timestamp = now();
    const newCertId = generateUUID();

    // Deep clone chapters, sections, and checklist items
    const newChapters: ComplianceChapter[] = original.chapters.map(ch => {
      const newChapterId = generateUUID();
      return {
        ...ch,
        id: newChapterId,
        certificationId: newCertId,
        status: 'DRAFT' as ComplianceChapterStatus,
        finalizedAt: undefined,
        finalizedBy: undefined,
        sections: ch.sections.map(sec => ({
          ...sec,
          id: generateUUID(),
          chapterId: newChapterId,
          status: 'DRAFT' as ComplianceChapterStatus,
          finalizedAt: undefined,
          finalizedBy: undefined,
          attachments: [...sec.attachments],
          checklist: (sec.checklist || []).map(item => ({
            ...item,
            id: generateUUID(),
            chapterId: newChapterId,
            sectionId: sec.id, // Will be updated below
            status: 'NOT_STARTED' as ChecklistItemStatus, // Reset status
            verifiedBy: undefined,
            verifiedAt: undefined,
            attachments: [...item.attachments],
          })),
        })),
        attachments: [...ch.attachments],
        checklist: (ch.checklist || []).map(item => ({
          ...item,
          id: generateUUID(),
          chapterId: newChapterId,
          status: 'NOT_STARTED' as ChecklistItemStatus, // Reset status
          verifiedBy: undefined,
          verifiedAt: undefined,
          attachments: [...item.attachments],
        })),
      };
    });

    // Fix section references (sectionId in checklist items)
    for (let i = 0; i < newChapters.length; i++) {
      const originalChapter = original.chapters[i];
      for (let j = 0; j < newChapters[i].sections.length; j++) {
        const newSectionId = newChapters[i].sections[j].id;
        for (const item of newChapters[i].sections[j].checklist || []) {
          item.sectionId = newSectionId;
        }
      }
    }

    // Calculate new version number
    const sameTypeVersions = packs.filter(p => p.type === original.type).length;

    const newCert: ComplianceCertification = {
      id: newCertId,
      projectId,
      type: original.type,
      name: original.name,
      version: sameTypeVersions + 1,
      status: 'DRAFT',
      chapters: newChapters,
      notes: `Duplicated from v${original.version}`,
      createdAt: timestamp,
      createdBy: context.userName,
    };

    const updatedPacks = [...packs, newCert];
    await ProjectRepository.update(projectId, { compliancePacks: updatedPacks });

    await AuditService.log(
      context,
      'CREATE',
      'ComplianceCertification',
      newCertId,
      `Duplicated ${CERTIFICATION_LABELS[original.type]} certification v${original.version} to v${newCert.version}`,
      { metadata: { projectId, originalId: certificationId } }
    );

    return Ok(newCert);
  },

  // ============================================
  // CHAPTER MANAGEMENT
  // ============================================

  /**
   * Add a custom chapter to a certification
   */
  async addChapter(
    projectId: string,
    certificationId: string,
    input: CreateChapterInput,
    context: AuditContext
  ): Promise<Result<ComplianceChapter, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Cannot modify a finalized certification');
    }

    const chapterId = generateUUID();
    const chapter: ComplianceChapter = {
      id: chapterId,
      certificationId,
      chapterNumber: input.chapterNumber,
      title: input.title,
      description: input.description,
      status: 'DRAFT',
      attachments: [],
      sections: [],
      checklist: [],
      notes: input.notes,
      sortOrder: input.sortOrder ?? cert.chapters.length + 1,
    };

    const updatedChapters = [...cert.chapters, chapter];
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    await AuditService.log(
      context,
      'CREATE',
      'ComplianceChapter',
      chapterId,
      `Added chapter "${input.title}" to ${cert.name}`,
      { metadata: { projectId, certificationId } }
    );

    return Ok(chapter);
  },

  /**
   * Update a chapter
   */
  async updateChapter(
    projectId: string,
    certificationId: string,
    chapterId: string,
    updates: Partial<Pick<ComplianceChapter, 'title' | 'description' | 'notes'>>,
    context: AuditContext
  ): Promise<Result<ComplianceChapter, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    if (chapter.status === 'FINAL') {
      return Err('Cannot modify a finalized chapter');
    }

    const updated = { ...chapter, ...updates };
    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updated;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    return Ok(updated);
  },

  /**
   * Finalize a chapter (lock it)
   */
  async finalizeChapter(
    projectId: string,
    certificationId: string,
    chapterId: string,
    context: AuditContext
  ): Promise<Result<ComplianceChapter, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Certification is already finalized');
    }

    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    if (chapter.status === 'FINAL') {
      return Err('Chapter is already finalized');
    }

    const timestamp = now();
    const updated: ComplianceChapter = {
      ...chapter,
      status: 'FINAL',
      finalizedAt: timestamp,
      finalizedBy: context.userName,
    };

    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updated;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    await AuditService.log(
      context,
      'UPDATE',
      'ComplianceChapter',
      chapterId,
      `Finalized chapter "${chapter.title}" in ${cert.name}`,
      { metadata: { projectId, certificationId } }
    );

    return Ok(updated);
  },

  // ============================================
  // SECTION MANAGEMENT
  // ============================================

  /**
   * Add a section to a chapter
   */
  async addSection(
    projectId: string,
    certificationId: string,
    chapterId: string,
    input: CreateSectionInput,
    context: AuditContext
  ): Promise<Result<ComplianceSection, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Cannot modify a finalized certification');
    }

    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    if (chapter.status === 'FINAL') {
      return Err('Cannot modify a finalized chapter');
    }

    const sectionId = generateUUID();
    const section: ComplianceSection = {
      id: sectionId,
      chapterId,
      sectionNumber: input.sectionNumber,
      title: input.title,
      description: input.description,
      status: 'DRAFT',
      attachments: [],
      checklist: [],
      notes: input.notes,
      sortOrder: input.sortOrder ?? chapter.sections.length + 1,
    };

    const updatedSections = [...chapter.sections, section];
    const updatedChapter = { ...chapter, sections: updatedSections };
    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    return Ok(section);
  },

  /**
   * Finalize a section (lock it)
   */
  async finalizeSection(
    projectId: string,
    certificationId: string,
    chapterId: string,
    sectionId: string,
    context: AuditContext
  ): Promise<Result<ComplianceSection, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    const sectionIndex = chapter.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) {
      return Err('Section not found');
    }

    const section = chapter.sections[sectionIndex];
    if (section.status === 'FINAL') {
      return Err('Section is already finalized');
    }

    const timestamp = now();
    const updated: ComplianceSection = {
      ...section,
      status: 'FINAL',
      finalizedAt: timestamp,
      finalizedBy: context.userName,
    };

    const updatedSections = [...chapter.sections];
    updatedSections[sectionIndex] = updated;
    const updatedChapter = { ...chapter, sections: updatedSections };
    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    return Ok(updated);
  },

  // ============================================
  // ATTACHMENTS
  // ============================================

  /**
   * Add an attachment to a chapter
   */
  async addChapterAttachment(
    projectId: string,
    certificationId: string,
    chapterId: string,
    input: AddComplianceAttachmentInput,
    context: AuditContext
  ): Promise<Result<ComplianceAttachment, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Cannot modify a finalized certification');
    }

    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    if (chapter.status === 'FINAL') {
      return Err('Cannot modify a finalized chapter');
    }

    const timestamp = now();
    const attachment: ComplianceAttachment = {
      id: generateUUID(),
      type: input.type,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      dataUrl: input.dataUrl,
      url: input.url,
      uploadedAt: timestamp,
      uploadedBy: context.userName,
      notes: input.notes,
    };

    const updatedAttachments = [...chapter.attachments, attachment];
    const updatedChapter = { ...chapter, attachments: updatedAttachments };
    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    await AuditService.log(
      context,
      'CREATE',
      'ComplianceAttachment',
      attachment.id,
      `Added attachment "${input.filename}" to chapter "${chapter.title}"`,
      { metadata: { projectId, certificationId, chapterId } }
    );

    return Ok(attachment);
  },

  /**
   * Add an attachment to a section
   */
  async addSectionAttachment(
    projectId: string,
    certificationId: string,
    chapterId: string,
    sectionId: string,
    input: AddComplianceAttachmentInput,
    context: AuditContext
  ): Promise<Result<ComplianceAttachment, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Cannot modify a finalized certification');
    }

    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    const sectionIndex = chapter.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) {
      return Err('Section not found');
    }

    const section = chapter.sections[sectionIndex];
    if (section.status === 'FINAL') {
      return Err('Cannot modify a finalized section');
    }

    const timestamp = now();
    const attachment: ComplianceAttachment = {
      id: generateUUID(),
      type: input.type,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      dataUrl: input.dataUrl,
      url: input.url,
      uploadedAt: timestamp,
      uploadedBy: context.userName,
      notes: input.notes,
    };

    const updatedAttachments = [...section.attachments, attachment];
    const updatedSection = { ...section, attachments: updatedAttachments };
    const updatedSections = [...chapter.sections];
    updatedSections[sectionIndex] = updatedSection;
    const updatedChapter = { ...chapter, sections: updatedSections };
    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    return Ok(attachment);
  },

  /**
   * Remove an attachment from a chapter
   */
  async removeChapterAttachment(
    projectId: string,
    certificationId: string,
    chapterId: string,
    attachmentId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Cannot modify a finalized certification');
    }

    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    if (chapter.status === 'FINAL') {
      return Err('Cannot modify a finalized chapter');
    }

    const attachment = chapter.attachments.find(a => a.id === attachmentId);
    if (!attachment) {
      return Err('Attachment not found');
    }

    const updatedAttachments = chapter.attachments.filter(a => a.id !== attachmentId);
    const updatedChapter = { ...chapter, attachments: updatedAttachments };
    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    await AuditService.log(
      context,
      'DELETE',
      'ComplianceAttachment',
      attachmentId,
      `Removed attachment "${attachment.filename}" from chapter "${chapter.title}"`,
      { metadata: { projectId, certificationId, chapterId } }
    );

    return Ok(undefined);
  },

  // ============================================
  // FINALIZATION
  // ============================================

  /**
   * Finalize entire certification (locks all chapters and sections)
   */
  async finalizeCertification(
    projectId: string,
    certificationId: string,
    context: AuditContext
  ): Promise<Result<ComplianceCertification, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Certification is already finalized');
    }

    const timestamp = now();

    // Finalize all chapters and sections
    const finalizedChapters = cert.chapters.map(ch => ({
      ...ch,
      status: 'FINAL' as ComplianceChapterStatus,
      finalizedAt: ch.finalizedAt || timestamp,
      finalizedBy: ch.finalizedBy || context.userName,
      sections: ch.sections.map(sec => ({
        ...sec,
        status: 'FINAL' as ComplianceChapterStatus,
        finalizedAt: sec.finalizedAt || timestamp,
        finalizedBy: sec.finalizedBy || context.userName,
      })),
    }));

    const updated: ComplianceCertification = {
      ...cert,
      status: 'FINAL',
      chapters: finalizedChapters,
      finalizedAt: timestamp,
      finalizedBy: context.userName,
    };

    packs[certIndex] = updated;
    await ProjectRepository.update(projectId, { compliancePacks: packs });

    await AuditService.log(
      context,
      'UPDATE',
      'ComplianceCertification',
      certificationId,
      `Finalized ${cert.name} certification`,
      { metadata: { projectId } }
    );

    return Ok(updated);
  },

  // ============================================
  // CHECKLIST MANAGEMENT
  // ============================================

  /**
   * Add a checklist item to a chapter
   */
  async addChecklistItem(
    projectId: string,
    certificationId: string,
    chapterId: string,
    input: CreateChecklistItemInput,
    context: AuditContext
  ): Promise<Result<ComplianceChecklistItem, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Cannot modify a finalized certification');
    }

    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    if (chapter.status === 'FINAL') {
      return Err('Cannot modify a finalized chapter');
    }

    const itemId = generateUUID();
    const item: ComplianceChecklistItem = {
      id: itemId,
      chapterId,
      title: input.title,
      type: input.type,
      status: 'NOT_STARTED',
      mandatory: input.mandatory,
      notes: input.notes,
      attachments: [],
      sortOrder: input.sortOrder ?? (chapter.checklist?.length || 0) + 1,
    };

    const updatedChecklist = [...(chapter.checklist || []), item];
    const updatedChapter = { ...chapter, checklist: updatedChecklist };
    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    return Ok(item);
  },

  /**
   * Update a checklist item
   */
  async updateChecklistItem(
    projectId: string,
    certificationId: string,
    chapterId: string,
    itemId: string,
    updates: UpdateChecklistItemInput,
    context: AuditContext
  ): Promise<Result<ComplianceChecklistItem, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Cannot modify a finalized certification');
    }

    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    if (chapter.status === 'FINAL') {
      return Err('Cannot modify a finalized chapter');
    }

    const checklist = chapter.checklist || [];
    const itemIndex = checklist.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      return Err('Checklist item not found');
    }

    const item = checklist[itemIndex];

    // Validate NA status requires reason
    if (updates.status === 'NA' && !updates.naReason && !item.naReason) {
      return Err('NA status requires a reason');
    }

    const timestamp = now();
    const updated: ComplianceChecklistItem = {
      ...item,
      ...updates,
      // Set verification info when status changes to PASSED or FAILED
      verifiedBy: (updates.status === 'PASSED' || updates.status === 'FAILED') ? context.userName : item.verifiedBy,
      verifiedAt: (updates.status === 'PASSED' || updates.status === 'FAILED') ? timestamp : item.verifiedAt,
    };

    const updatedChecklist = [...checklist];
    updatedChecklist[itemIndex] = updated;
    const updatedChapter = { ...chapter, checklist: updatedChecklist };
    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    return Ok(updated);
  },

  /**
   * Update checklist item status (convenience method)
   */
  async updateChecklistStatus(
    projectId: string,
    certificationId: string,
    chapterId: string,
    itemId: string,
    status: ChecklistItemStatus,
    naReason?: string,
    context?: AuditContext
  ): Promise<Result<ComplianceChecklistItem, string>> {
    const auditContext = context || { userId: 'system', userName: 'System' };
    return this.updateChecklistItem(
      projectId,
      certificationId,
      chapterId,
      itemId,
      { status, naReason },
      auditContext
    );
  },

  /**
   * Remove a checklist item
   */
  async removeChecklistItem(
    projectId: string,
    certificationId: string,
    chapterId: string,
    itemId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Cannot modify a finalized certification');
    }

    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    if (chapter.status === 'FINAL') {
      return Err('Cannot modify a finalized chapter');
    }

    const checklist = chapter.checklist || [];
    const itemIndex = checklist.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      return Err('Checklist item not found');
    }

    const item = checklist[itemIndex];

    const updatedChecklist = checklist.filter(i => i.id !== itemId);
    const updatedChapter = { ...chapter, checklist: updatedChecklist };
    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    await AuditService.log(
      context,
      'DELETE',
      'ComplianceChecklistItem',
      itemId,
      `Removed checklist item "${item.title}" from chapter "${chapter.title}"`,
      { metadata: { projectId, certificationId, chapterId } }
    );

    return Ok(undefined);
  },

  /**
   * Add attachment to a checklist item
   */
  async addChecklistAttachment(
    projectId: string,
    certificationId: string,
    chapterId: string,
    itemId: string,
    input: AddComplianceAttachmentInput,
    context: AuditContext
  ): Promise<Result<ComplianceAttachment, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Cannot modify a finalized certification');
    }

    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    if (chapter.status === 'FINAL') {
      return Err('Cannot modify a finalized chapter');
    }

    const checklist = chapter.checklist || [];
    const itemIndex = checklist.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      return Err('Checklist item not found');
    }

    const item = checklist[itemIndex];
    const timestamp = now();

    const attachment: ComplianceAttachment = {
      id: generateUUID(),
      type: input.type,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      dataUrl: input.dataUrl,
      url: input.url,
      uploadedAt: timestamp,
      uploadedBy: context.userName,
      notes: input.notes,
    };

    const updatedItem = { ...item, attachments: [...item.attachments, attachment] };
    const updatedChecklist = [...checklist];
    updatedChecklist[itemIndex] = updatedItem;
    const updatedChapter = { ...chapter, checklist: updatedChecklist };
    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    return Ok(attachment);
  },

  /**
   * Remove attachment from a checklist item
   */
  async removeChecklistAttachment(
    projectId: string,
    certificationId: string,
    chapterId: string,
    itemId: string,
    attachmentId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const packs = project.compliancePacks || [];
    const certIndex = packs.findIndex(p => p.id === certificationId);
    if (certIndex === -1) {
      return Err('Certification not found');
    }

    const cert = packs[certIndex];
    if (cert.status === 'FINAL') {
      return Err('Cannot modify a finalized certification');
    }

    const chapterIndex = cert.chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      return Err('Chapter not found');
    }

    const chapter = cert.chapters[chapterIndex];
    if (chapter.status === 'FINAL') {
      return Err('Cannot modify a finalized chapter');
    }

    const checklist = chapter.checklist || [];
    const itemIndex = checklist.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      return Err('Checklist item not found');
    }

    const item = checklist[itemIndex];
    const updatedAttachments = item.attachments.filter(a => a.id !== attachmentId);
    const updatedItem = { ...item, attachments: updatedAttachments };
    const updatedChecklist = [...checklist];
    updatedChecklist[itemIndex] = updatedItem;
    const updatedChapter = { ...chapter, checklist: updatedChecklist };
    const updatedChapters = [...cert.chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    packs[certIndex] = { ...cert, chapters: updatedChapters };

    await ProjectRepository.update(projectId, { compliancePacks: packs });

    return Ok(undefined);
  },
};
