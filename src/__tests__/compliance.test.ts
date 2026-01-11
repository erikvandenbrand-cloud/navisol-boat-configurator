/**
 * Compliance Pack Tests
 * Tests for certification management, chapter scaffolds, attachments, and finalization
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities
import '@/domain/__tests__/testUtils';

import {
  CE_CHAPTER_SCAFFOLD,
  CE_CHECKLIST_SCAFFOLD,
  ES_TRIN_CHAPTER_SCAFFOLD,
  LLOYDS_CHAPTER_SCAFFOLD,
  getChapterScaffold,
  getChapterChecklist,
  getCertificationStats,
  getChapterChecklistStats,
  isCertificationFullyFinalized,
  CERTIFICATION_LABELS,
  CHECKLIST_TYPE_LABELS,
  CHECKLIST_STATUS_LABELS,
  type ComplianceCertification,
  type ComplianceChapter,
  type ComplianceChapterStatus,
  type ComplianceChecklistItem,
  type ChecklistItemStatus,
  generateUUID,
} from '@/domain/models';

// ============================================
// SCAFFOLD TESTS
// ============================================

describe('CE Chapter Scaffold', () => {
  test('CE scaffold has exactly 15 chapters', () => {
    expect(CE_CHAPTER_SCAFFOLD.length).toBe(15);
  });

  test('CE scaffold chapters are numbered 1-15', () => {
    for (let i = 0; i < CE_CHAPTER_SCAFFOLD.length; i++) {
      expect(CE_CHAPTER_SCAFFOLD[i].chapterNumber).toBe(String(i + 1));
    }
  });

  test('each CE chapter has required fields', () => {
    for (const chapter of CE_CHAPTER_SCAFFOLD) {
      expect(chapter.title).toBeTruthy();
      expect(chapter.chapterNumber).toBeTruthy();
      expect(typeof chapter.sortOrder).toBe('number');
    }
  });

  test('CE scaffold includes key chapters', () => {
    const titles = CE_CHAPTER_SCAFFOLD.map(c => c.title);
    expect(titles).toContain('General Description');
    expect(titles).toContain('Stability and Buoyancy');
    expect(titles).toContain('Propulsion Installation');
    expect(titles).toContain('Electrical System');
    expect(titles).toContain("Owner's Manual and DoC");
  });
});

describe('ES-TRIN Chapter Scaffold', () => {
  test('ES-TRIN scaffold has 5 chapters', () => {
    expect(ES_TRIN_CHAPTER_SCAFFOLD.length).toBe(5);
  });

  test('ES-TRIN scaffold includes key chapters', () => {
    const titles = ES_TRIN_CHAPTER_SCAFFOLD.map(c => c.title);
    expect(titles).toContain('Shipbuilding');
    expect(titles).toContain('Machinery');
    expect(titles).toContain('Safety Equipment');
  });
});

describe('Lloyds Chapter Scaffold', () => {
  test('Lloyds scaffold has 5 chapters', () => {
    expect(LLOYDS_CHAPTER_SCAFFOLD.length).toBe(5);
  });

  test('Lloyds scaffold includes key chapters', () => {
    const titles = LLOYDS_CHAPTER_SCAFFOLD.map(c => c.title);
    expect(titles).toContain('Classification and Survey');
    expect(titles).toContain('Hull Structure');
  });
});

describe('getChapterScaffold', () => {
  test('returns CE scaffold for CE type', () => {
    const scaffold = getChapterScaffold('CE');
    expect(scaffold.length).toBe(15);
  });

  test('returns ES-TRIN scaffold for ES_TRIN type', () => {
    const scaffold = getChapterScaffold('ES_TRIN');
    expect(scaffold.length).toBe(5);
  });

  test('returns Lloyds scaffold for LLOYDS type', () => {
    const scaffold = getChapterScaffold('LLOYDS');
    expect(scaffold.length).toBe(5);
  });

  test('returns empty array for OTHER type', () => {
    const scaffold = getChapterScaffold('OTHER');
    expect(scaffold.length).toBe(0);
  });
});

// ============================================
// CERTIFICATION STATS TESTS
// ============================================

describe('getCertificationStats', () => {
  function createMockCertification(
    chapters: { status: ComplianceChapterStatus; attachmentCount: number; sections?: { status: ComplianceChapterStatus; attachmentCount: number }[] }[]
  ): ComplianceCertification {
    return {
      id: generateUUID(),
      projectId: 'proj-1',
      type: 'CE',
      name: 'Test Cert',
      version: 1,
      status: 'DRAFT',
      chapters: chapters.map((ch, i) => ({
        id: generateUUID(),
        certificationId: 'cert-1',
        chapterNumber: String(i + 1),
        title: `Chapter ${i + 1}`,
        status: ch.status,
        attachments: Array(ch.attachmentCount).fill({
          id: generateUUID(),
          type: 'CERTIFICATE' as const,
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1000,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Test User',
        }),
        sections: (ch.sections || []).map((sec, j) => ({
          id: generateUUID(),
          chapterId: 'ch-1',
          sectionNumber: `${i + 1}.${j + 1}`,
          title: `Section ${i + 1}.${j + 1}`,
          status: sec.status,
          attachments: Array(sec.attachmentCount).fill({
            id: generateUUID(),
            type: 'CERTIFICATE' as const,
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 500,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Test User',
          }),
          sortOrder: j + 1,
        })),
        sortOrder: i + 1,
      })),
      createdAt: new Date().toISOString(),
      createdBy: 'Test User',
    };
  }

  test('calculates stats for empty certification', () => {
    const cert = createMockCertification([]);
    const stats = getCertificationStats(cert);
    expect(stats.totalChapters).toBe(0);
    expect(stats.finalChapters).toBe(0);
    expect(stats.percentComplete).toBe(0);
  });

  test('calculates stats for certification with draft chapters', () => {
    const cert = createMockCertification([
      { status: 'DRAFT', attachmentCount: 2 },
      { status: 'DRAFT', attachmentCount: 1 },
    ]);
    const stats = getCertificationStats(cert);
    expect(stats.totalChapters).toBe(2);
    expect(stats.finalChapters).toBe(0);
    expect(stats.totalAttachments).toBe(3);
    expect(stats.percentComplete).toBe(0);
  });

  test('calculates stats for partially finalized certification', () => {
    const cert = createMockCertification([
      { status: 'FINAL', attachmentCount: 1 },
      { status: 'DRAFT', attachmentCount: 1 },
    ]);
    const stats = getCertificationStats(cert);
    expect(stats.totalChapters).toBe(2);
    expect(stats.finalChapters).toBe(1);
    expect(stats.percentComplete).toBe(50);
  });

  test('calculates stats including sections', () => {
    const cert = createMockCertification([
      {
        status: 'FINAL',
        attachmentCount: 1,
        sections: [
          { status: 'FINAL', attachmentCount: 2 },
          { status: 'DRAFT', attachmentCount: 0 },
        ],
      },
    ]);
    const stats = getCertificationStats(cert);
    expect(stats.totalChapters).toBe(1);
    expect(stats.finalChapters).toBe(1);
    expect(stats.totalSections).toBe(2);
    expect(stats.finalSections).toBe(1);
    expect(stats.totalAttachments).toBe(3);
    // 1 chapter + 2 sections = 3 items; 1 final chapter + 1 final section = 2 final
    expect(stats.percentComplete).toBe(67); // Math.round(2/3 * 100)
  });
});

describe('isCertificationFullyFinalized', () => {
  test('returns false for DRAFT certification', () => {
    const cert: ComplianceCertification = {
      id: 'cert-1',
      projectId: 'proj-1',
      type: 'CE',
      name: 'Test',
      version: 1,
      status: 'DRAFT',
      chapters: [],
      createdAt: new Date().toISOString(),
      createdBy: 'Test',
    };
    expect(isCertificationFullyFinalized(cert)).toBe(false);
  });

  test('returns false for FINAL certification with DRAFT chapter', () => {
    const cert: ComplianceCertification = {
      id: 'cert-1',
      projectId: 'proj-1',
      type: 'CE',
      name: 'Test',
      version: 1,
      status: 'FINAL',
      chapters: [
        {
          id: 'ch-1',
          certificationId: 'cert-1',
          chapterNumber: '1',
          title: 'Chapter 1',
          status: 'DRAFT',
          attachments: [],
          sections: [],
          sortOrder: 1,
        },
      ],
      createdAt: new Date().toISOString(),
      createdBy: 'Test',
    };
    expect(isCertificationFullyFinalized(cert)).toBe(false);
  });

  test('returns true for fully FINAL certification', () => {
    const cert: ComplianceCertification = {
      id: 'cert-1',
      projectId: 'proj-1',
      type: 'CE',
      name: 'Test',
      version: 1,
      status: 'FINAL',
      chapters: [
        {
          id: 'ch-1',
          certificationId: 'cert-1',
          chapterNumber: '1',
          title: 'Chapter 1',
          status: 'FINAL',
          attachments: [],
          sections: [
            {
              id: 'sec-1',
              chapterId: 'ch-1',
              sectionNumber: '1.1',
              title: 'Section 1.1',
              status: 'FINAL',
              attachments: [],
              sortOrder: 1,
            },
          ],
          sortOrder: 1,
        },
      ],
      createdAt: new Date().toISOString(),
      createdBy: 'Test',
      finalizedAt: new Date().toISOString(),
      finalizedBy: 'Test',
    };
    expect(isCertificationFullyFinalized(cert)).toBe(true);
  });
});

// ============================================
// CERTIFICATION LABELS TESTS
// ============================================

describe('CERTIFICATION_LABELS', () => {
  test('has labels for all certification types', () => {
    expect(CERTIFICATION_LABELS.CE).toBe('CE Marking (RCD)');
    expect(CERTIFICATION_LABELS.ES_TRIN).toBe('ES-TRIN');
    expect(CERTIFICATION_LABELS.LLOYDS).toBe('Lloyds Classification');
    expect(CERTIFICATION_LABELS.OTHER).toBe('Other Certification');
  });
});

// ============================================
// LOCKING TESTS
// ============================================

describe('Finalization Locking Rules', () => {
  test('DRAFT certification can be modified', () => {
    const cert: ComplianceCertification = {
      id: 'cert-1',
      projectId: 'proj-1',
      type: 'CE',
      name: 'Test',
      version: 1,
      status: 'DRAFT',
      chapters: [],
      createdAt: new Date().toISOString(),
      createdBy: 'Test',
    };
    // In a DRAFT certification, modifications are allowed
    expect(cert.status).toBe('DRAFT');
    expect(cert.finalizedAt).toBeUndefined();
  });

  test('FINAL certification has finalization metadata', () => {
    const now = new Date().toISOString();
    const cert: ComplianceCertification = {
      id: 'cert-1',
      projectId: 'proj-1',
      type: 'CE',
      name: 'Test',
      version: 1,
      status: 'FINAL',
      chapters: [],
      createdAt: now,
      createdBy: 'Test',
      finalizedAt: now,
      finalizedBy: 'Admin',
    };
    expect(cert.status).toBe('FINAL');
    expect(cert.finalizedAt).toBeTruthy();
    expect(cert.finalizedBy).toBe('Admin');
  });

  test('FINAL chapter has finalization metadata', () => {
    const now = new Date().toISOString();
    const chapter: ComplianceChapter = {
      id: 'ch-1',
      certificationId: 'cert-1',
      chapterNumber: '1',
      title: 'Chapter 1',
      status: 'FINAL',
      attachments: [],
      sections: [],
      sortOrder: 1,
      finalizedAt: now,
      finalizedBy: 'Admin',
    };
    expect(chapter.status).toBe('FINAL');
    expect(chapter.finalizedAt).toBeTruthy();
    expect(chapter.finalizedBy).toBe('Admin');
  });
});

// ============================================
// ATTACHMENT TYPE TESTS
// ============================================

describe('Attachment Structure', () => {
  test('attachment has required fields', () => {
    const attachment = {
      id: generateUUID(),
      type: 'CERTIFICATE' as const,
      filename: 'test-cert.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 12345,
      dataUrl: 'data:application/pdf;base64,test',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Test User',
    };

    expect(attachment.id).toBeTruthy();
    expect(attachment.type).toBe('CERTIFICATE');
    expect(attachment.filename).toBe('test-cert.pdf');
    expect(attachment.mimeType).toBe('application/pdf');
    expect(attachment.sizeBytes).toBe(12345);
    expect(attachment.dataUrl).toContain('base64');
  });

  test('attachment supports external URL', () => {
    const attachment = {
      id: generateUUID(),
      type: 'DRAWING' as const,
      filename: 'drawing.dwg',
      mimeType: 'application/acad',
      sizeBytes: 50000,
      url: 'https://example.com/drawing.dwg',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Test User',
    };

    expect(attachment.url).toBe('https://example.com/drawing.dwg');
    expect(attachment.dataUrl).toBeUndefined();
  });
});

// ============================================
// IMPORT/EXPORT COMPATIBILITY TESTS
// ============================================

describe('Import/Export Compatibility', () => {
  test('compliance packs serialize to JSON', () => {
    const cert: ComplianceCertification = {
      id: 'cert-123',
      projectId: 'proj-456',
      type: 'CE',
      name: 'CE Marking (RCD)',
      version: 1,
      status: 'DRAFT',
      chapters: [
        {
          id: 'ch-1',
          certificationId: 'cert-123',
          chapterNumber: '1',
          title: 'General Description',
          description: 'Test description',
          status: 'DRAFT',
          attachments: [
            {
              id: 'att-1',
              type: 'CERTIFICATE',
              filename: 'test.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 1000,
              dataUrl: 'data:application/pdf;base64,dGVzdA==',
              uploadedAt: '2024-01-01T00:00:00.000Z',
              uploadedBy: 'Test User',
            },
          ],
          sections: [],
          sortOrder: 1,
        },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
      createdBy: 'Test User',
    };

    const json = JSON.stringify(cert);
    const parsed = JSON.parse(json) as ComplianceCertification;

    expect(parsed.id).toBe('cert-123');
    expect(parsed.type).toBe('CE');
    expect(parsed.chapters.length).toBe(1);
    expect(parsed.chapters[0].attachments.length).toBe(1);
    expect(parsed.chapters[0].attachments[0].dataUrl).toContain('base64');
  });

  test('compliance packs survive stringify-parse roundtrip', () => {
    const original: ComplianceCertification = {
      id: generateUUID(),
      projectId: generateUUID(),
      type: 'ES_TRIN',
      name: 'ES-TRIN Certification',
      version: 2,
      status: 'FINAL',
      chapters: ES_TRIN_CHAPTER_SCAFFOLD.map((template, i) => ({
        id: generateUUID(),
        certificationId: 'cert-1',
        chapterNumber: template.chapterNumber,
        title: template.title,
        description: template.description,
        status: 'FINAL' as ComplianceChapterStatus,
        attachments: [],
        sections: [],
        sortOrder: template.sortOrder,
        finalizedAt: '2024-01-15T00:00:00.000Z',
        finalizedBy: 'Admin',
      })),
      createdAt: '2024-01-01T00:00:00.000Z',
      createdBy: 'Test User',
      finalizedAt: '2024-01-15T00:00:00.000Z',
      finalizedBy: 'Admin',
    };

    const json = JSON.stringify(original);
    const parsed = JSON.parse(json) as ComplianceCertification;

    expect(parsed.id).toBe(original.id);
    expect(parsed.type).toBe('ES_TRIN');
    expect(parsed.status).toBe('FINAL');
    expect(parsed.chapters.length).toBe(5);
    expect(parsed.finalizedAt).toBe('2024-01-15T00:00:00.000Z');
  });
});

// ============================================
// CE CHECKLIST SCAFFOLD TESTS
// ============================================

describe('CE Checklist Scaffold', () => {
  test('CE checklist scaffold covers all 15 chapters', () => {
    for (let i = 1; i <= 15; i++) {
      const chapterItems = CE_CHECKLIST_SCAFFOLD[String(i)];
      expect(chapterItems).toBeDefined();
      expect(chapterItems.length).toBeGreaterThan(0);
    }
  });

  test('each checklist item has required fields', () => {
    for (const [chapterNum, items] of Object.entries(CE_CHECKLIST_SCAFFOLD)) {
      for (const item of items) {
        expect(item.title).toBeTruthy();
        expect(['DOC', 'INSPECTION', 'CALC', 'CONFIRM']).toContain(item.type);
        expect(typeof item.mandatory).toBe('boolean');
        expect(typeof item.sortOrder).toBe('number');
      }
    }
  });

  test('Chapter 1 (General Description) has identification items', () => {
    const chapter1 = CE_CHECKLIST_SCAFFOLD['1'];
    const titles = chapter1.map(i => i.title);
    expect(titles.some(t => t.includes('HIN') || t.includes('identification'))).toBe(true);
  });

  test('Chapter 15 (DoC) has mandatory DoC item', () => {
    const chapter15 = CE_CHECKLIST_SCAFFOLD['15'];
    const docItem = chapter15.find(i => i.title.includes('Declaration of Conformity'));
    expect(docItem).toBeDefined();
    expect(docItem?.mandatory).toBe(true);
  });

  test('Chapter 10 (Gas System) has optional items', () => {
    const chapter10 = CE_CHECKLIST_SCAFFOLD['10'];
    const optionalItems = chapter10.filter(i => !i.mandatory);
    expect(optionalItems.length).toBeGreaterThan(0);
  });
});

describe('getChapterChecklist', () => {
  test('returns CE checklist for CE type', () => {
    const checklist = getChapterChecklist('CE', '1');
    expect(checklist.length).toBeGreaterThan(0);
  });

  test('returns empty array for non-existent chapter', () => {
    const checklist = getChapterChecklist('CE', '99');
    expect(checklist.length).toBe(0);
  });

  test('returns empty array for non-CE types', () => {
    const checklist = getChapterChecklist('ES_TRIN', '1');
    expect(checklist.length).toBe(0);
  });
});

// ============================================
// CHECKLIST STATS TESTS
// ============================================

describe('getChapterChecklistStats', () => {
  function createMockChapter(items: { status: ChecklistItemStatus; mandatory: boolean }[]): ComplianceChapter {
    return {
      id: generateUUID(),
      certificationId: 'cert-1',
      chapterNumber: '1',
      title: 'Test Chapter',
      status: 'DRAFT',
      attachments: [],
      sections: [],
      checklist: items.map((item, i) => ({
        id: generateUUID(),
        chapterId: 'ch-1',
        title: `Item ${i + 1}`,
        type: 'DOC' as const,
        status: item.status,
        mandatory: item.mandatory,
        attachments: [],
        sortOrder: i + 1,
      })),
      sortOrder: 1,
    };
  }

  test('calculates stats for empty checklist', () => {
    const chapter = createMockChapter([]);
    const stats = getChapterChecklistStats(chapter);
    expect(stats.total).toBe(0);
    expect(stats.passed).toBe(0);
    expect(stats.percentComplete).toBe(0);
  });

  test('calculates stats for all NOT_STARTED', () => {
    const chapter = createMockChapter([
      { status: 'NOT_STARTED', mandatory: true },
      { status: 'NOT_STARTED', mandatory: false },
    ]);
    const stats = getChapterChecklistStats(chapter);
    expect(stats.total).toBe(2);
    expect(stats.passed).toBe(0);
    expect(stats.notStarted).toBe(2);
    expect(stats.percentComplete).toBe(0);
  });

  test('calculates stats for mixed statuses', () => {
    const chapter = createMockChapter([
      { status: 'PASSED', mandatory: true },
      { status: 'FAILED', mandatory: true },
      { status: 'IN_PROGRESS', mandatory: false },
      { status: 'NOT_STARTED', mandatory: false },
    ]);
    const stats = getChapterChecklistStats(chapter);
    expect(stats.total).toBe(4);
    expect(stats.passed).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.inProgress).toBe(1);
    expect(stats.notStarted).toBe(1);
    expect(stats.percentComplete).toBe(25); // 1 passed out of 4
  });

  test('NA items reduce applicable count', () => {
    const chapter = createMockChapter([
      { status: 'PASSED', mandatory: true },
      { status: 'NA', mandatory: false },
    ]);
    const stats = getChapterChecklistStats(chapter);
    expect(stats.total).toBe(2);
    expect(stats.na).toBe(1);
    // 1 passed out of (2 - 1 NA) = 1 applicable = 100%
    expect(stats.percentComplete).toBe(100);
  });

  test('mandatory stats track correctly', () => {
    const chapter = createMockChapter([
      { status: 'PASSED', mandatory: true },
      { status: 'NA', mandatory: true },
      { status: 'FAILED', mandatory: true },
      { status: 'PASSED', mandatory: false },
    ]);
    const stats = getChapterChecklistStats(chapter);
    expect(stats.mandatory).toBe(3);
    expect(stats.mandatoryComplete).toBe(2); // PASSED + NA
  });
});

// ============================================
// CHECKLIST STATUS LABELS TESTS
// ============================================

describe('Checklist Labels', () => {
  test('has labels for all checklist types', () => {
    expect(CHECKLIST_TYPE_LABELS.DOC).toBe('Documentation');
    expect(CHECKLIST_TYPE_LABELS.INSPECTION).toBe('Inspection');
    expect(CHECKLIST_TYPE_LABELS.CALC).toBe('Calculation');
    expect(CHECKLIST_TYPE_LABELS.CONFIRM).toBe('Confirmation');
  });

  test('has labels for all checklist statuses', () => {
    expect(CHECKLIST_STATUS_LABELS.NOT_STARTED).toBe('Not Started');
    expect(CHECKLIST_STATUS_LABELS.IN_PROGRESS).toBe('In Progress');
    expect(CHECKLIST_STATUS_LABELS.PASSED).toBe('Passed');
    expect(CHECKLIST_STATUS_LABELS.FAILED).toBe('Failed');
    expect(CHECKLIST_STATUS_LABELS.NA).toBe('N/A');
  });
});

// ============================================
// NA RULES TESTS
// ============================================

describe('NA Status Rules', () => {
  test('NA item should have naReason', () => {
    const item: ComplianceChecklistItem = {
      id: 'item-1',
      chapterId: 'ch-1',
      title: 'Gas system check',
      type: 'INSPECTION',
      status: 'NA',
      mandatory: false,
      attachments: [],
      naReason: 'No gas system installed',
      sortOrder: 1,
    };
    expect(item.status).toBe('NA');
    expect(item.naReason).toBeTruthy();
  });

  test('NA counts as complete for mandatory tracking', () => {
    const chapter: ComplianceChapter = {
      id: 'ch-1',
      certificationId: 'cert-1',
      chapterNumber: '10',
      title: 'Gas System',
      status: 'DRAFT',
      attachments: [],
      sections: [],
      checklist: [
        {
          id: 'item-1',
          chapterId: 'ch-1',
          title: 'Gas detection test',
          type: 'INSPECTION',
          status: 'NA',
          mandatory: true,
          naReason: 'No gas system installed',
          attachments: [],
          sortOrder: 1,
        },
      ],
      sortOrder: 10,
    };
    const stats = getChapterChecklistStats(chapter);
    expect(stats.mandatoryComplete).toBe(1);
  });
});

// ============================================
// FINAL LOCKING FOR CHECKLIST TESTS
// ============================================

describe('Checklist FINAL Locking', () => {
  test('FINAL chapter checklist items preserve their status', () => {
    const chapter: ComplianceChapter = {
      id: 'ch-1',
      certificationId: 'cert-1',
      chapterNumber: '1',
      title: 'General Description',
      status: 'FINAL',
      finalizedAt: new Date().toISOString(),
      finalizedBy: 'Admin',
      attachments: [],
      sections: [],
      checklist: [
        {
          id: 'item-1',
          chapterId: 'ch-1',
          title: 'HIN verification',
          type: 'DOC',
          status: 'PASSED',
          mandatory: true,
          attachments: [],
          verifiedBy: 'Inspector',
          verifiedAt: new Date().toISOString(),
          sortOrder: 1,
        },
      ],
      sortOrder: 1,
    };

    // When chapter is FINAL, checklist items are locked
    expect(chapter.status).toBe('FINAL');
    expect(chapter.checklist[0].status).toBe('PASSED');
    expect(chapter.checklist[0].verifiedBy).toBe('Inspector');
  });

  test('checklist items have verification metadata when passed/failed', () => {
    const item: ComplianceChecklistItem = {
      id: 'item-1',
      chapterId: 'ch-1',
      title: 'Stability calculation',
      type: 'CALC',
      status: 'PASSED',
      mandatory: true,
      attachments: [],
      verifiedBy: 'Engineer',
      verifiedAt: '2024-01-15T10:30:00.000Z',
      sortOrder: 1,
    };

    expect(item.verifiedBy).toBe('Engineer');
    expect(item.verifiedAt).toBeTruthy();
  });
});

// ============================================
// CHECKLIST COUNT IN STATS TESTS
// ============================================

describe('Certification Stats with Checklist', () => {
  test('getCertificationStats includes checklist counts', () => {
    const cert: ComplianceCertification = {
      id: 'cert-1',
      projectId: 'proj-1',
      type: 'CE',
      name: 'Test Cert',
      version: 1,
      status: 'DRAFT',
      chapters: [
        {
          id: 'ch-1',
          certificationId: 'cert-1',
          chapterNumber: '1',
          title: 'Chapter 1',
          status: 'DRAFT',
          attachments: [],
          sections: [],
          checklist: [
            {
              id: 'item-1',
              chapterId: 'ch-1',
              title: 'Item 1',
              type: 'DOC',
              status: 'PASSED',
              mandatory: true,
              attachments: [],
              sortOrder: 1,
            },
            {
              id: 'item-2',
              chapterId: 'ch-1',
              title: 'Item 2',
              type: 'INSPECTION',
              status: 'NOT_STARTED',
              mandatory: false,
              attachments: [],
              sortOrder: 2,
            },
          ],
          sortOrder: 1,
        },
      ],
      createdAt: new Date().toISOString(),
      createdBy: 'Test',
    };

    const stats = getCertificationStats(cert);
    expect(stats.totalChecklistItems).toBe(2);
    expect(stats.passedChecklistItems).toBe(1);
    expect(stats.mandatoryChecklistItems).toBe(1);
    expect(stats.mandatoryPassedItems).toBe(1);
    expect(stats.checklistPercentComplete).toBe(50);
  });
});

// ============================================
// VALIDATION WARNINGS TESTS
// ============================================

import {
  validateChapterChecklist,
  validateCertification,
  getChapterWarningsSummary,
} from '@/domain/models';

describe('validateChapterChecklist', () => {
  function createChapterWithChecklist(items: { status: ChecklistItemStatus; mandatory: boolean }[]): ComplianceChapter {
    return {
      id: 'ch-1',
      certificationId: 'cert-1',
      chapterNumber: '1',
      title: 'Test Chapter',
      status: 'DRAFT',
      attachments: [],
      sections: [],
      checklist: items.map((item, i) => ({
        id: `item-${i + 1}`,
        chapterId: 'ch-1',
        title: `Item ${i + 1}`,
        type: 'DOC' as const,
        status: item.status,
        mandatory: item.mandatory,
        attachments: [],
        sortOrder: i + 1,
      })),
      sortOrder: 1,
    };
  }

  test('returns no warnings for all PASSED mandatory items', () => {
    const chapter = createChapterWithChecklist([
      { status: 'PASSED', mandatory: true },
      { status: 'PASSED', mandatory: true },
    ]);
    const result = validateChapterChecklist(chapter);
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBe(0);
    expect(result.failedMandatoryCount).toBe(0);
    expect(result.incompleteMandatoryCount).toBe(0);
  });

  test('returns no warnings for NA mandatory items', () => {
    const chapter = createChapterWithChecklist([
      { status: 'NA', mandatory: true },
      { status: 'PASSED', mandatory: true },
    ]);
    const result = validateChapterChecklist(chapter);
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBe(0);
  });

  test('returns error warning for FAILED mandatory items', () => {
    const chapter = createChapterWithChecklist([
      { status: 'FAILED', mandatory: true },
      { status: 'PASSED', mandatory: true },
    ]);
    const result = validateChapterChecklist(chapter);
    expect(result.isValid).toBe(false);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].level).toBe('ERROR');
    expect(result.failedMandatoryCount).toBe(1);
  });

  test('returns warning for NOT_STARTED mandatory items', () => {
    const chapter = createChapterWithChecklist([
      { status: 'NOT_STARTED', mandatory: true },
      { status: 'PASSED', mandatory: true },
    ]);
    const result = validateChapterChecklist(chapter);
    expect(result.isValid).toBe(false);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].level).toBe('WARNING');
    expect(result.incompleteMandatoryCount).toBe(1);
  });

  test('returns warning for IN_PROGRESS mandatory items', () => {
    const chapter = createChapterWithChecklist([
      { status: 'IN_PROGRESS', mandatory: true },
      { status: 'PASSED', mandatory: true },
    ]);
    const result = validateChapterChecklist(chapter);
    expect(result.isValid).toBe(false);
    expect(result.incompleteMandatoryCount).toBe(1);
  });

  test('ignores non-mandatory items regardless of status', () => {
    const chapter = createChapterWithChecklist([
      { status: 'FAILED', mandatory: false },
      { status: 'NOT_STARTED', mandatory: false },
      { status: 'PASSED', mandatory: true },
    ]);
    const result = validateChapterChecklist(chapter);
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBe(0);
    expect(result.totalMandatory).toBe(1);
  });

  test('combines multiple warning types', () => {
    const chapter = createChapterWithChecklist([
      { status: 'FAILED', mandatory: true },
      { status: 'NOT_STARTED', mandatory: true },
      { status: 'IN_PROGRESS', mandatory: true },
      { status: 'PASSED', mandatory: true },
    ]);
    const result = validateChapterChecklist(chapter);
    expect(result.isValid).toBe(false);
    expect(result.failedMandatoryCount).toBe(1);
    expect(result.incompleteMandatoryCount).toBe(2);
    expect(result.warnings.length).toBe(3);
    expect(result.warnings.filter(w => w.level === 'ERROR').length).toBe(1);
    expect(result.warnings.filter(w => w.level === 'WARNING').length).toBe(2);
  });

  test('returns chapter info in result', () => {
    const chapter = createChapterWithChecklist([{ status: 'PASSED', mandatory: true }]);
    const result = validateChapterChecklist(chapter);
    expect(result.chapterId).toBe('ch-1');
    expect(result.chapterNumber).toBe('1');
    expect(result.chapterTitle).toBe('Test Chapter');
  });
});

describe('validateCertification', () => {
  function createCertWithChapters(
    chaptersData: { items: { status: ChecklistItemStatus; mandatory: boolean }[] }[]
  ): ComplianceCertification {
    return {
      id: 'cert-1',
      projectId: 'proj-1',
      type: 'CE',
      name: 'Test Cert',
      version: 1,
      status: 'DRAFT',
      chapters: chaptersData.map((ch, chIdx) => ({
        id: `ch-${chIdx + 1}`,
        certificationId: 'cert-1',
        chapterNumber: String(chIdx + 1),
        title: `Chapter ${chIdx + 1}`,
        status: 'DRAFT' as ComplianceChapterStatus,
        attachments: [],
        sections: [],
        checklist: ch.items.map((item, itemIdx) => ({
          id: `item-${chIdx + 1}-${itemIdx + 1}`,
          chapterId: `ch-${chIdx + 1}`,
          title: `Item ${chIdx + 1}.${itemIdx + 1}`,
          type: 'DOC' as const,
          status: item.status,
          mandatory: item.mandatory,
          attachments: [],
          sortOrder: itemIdx + 1,
        })),
        sortOrder: chIdx + 1,
      })),
      createdAt: new Date().toISOString(),
      createdBy: 'Test',
    };
  }

  test('returns valid for all chapters with complete mandatory items', () => {
    const cert = createCertWithChapters([
      { items: [{ status: 'PASSED', mandatory: true }] },
      { items: [{ status: 'NA', mandatory: true }] },
    ]);
    const result = validateCertification(cert);
    expect(result.isValid).toBe(true);
    expect(result.totalFailedMandatory).toBe(0);
    expect(result.totalIncompleteMandatory).toBe(0);
  });

  test('aggregates warnings across chapters', () => {
    const cert = createCertWithChapters([
      { items: [{ status: 'FAILED', mandatory: true }] },
      { items: [{ status: 'NOT_STARTED', mandatory: true }] },
      { items: [{ status: 'PASSED', mandatory: true }] },
    ]);
    const result = validateCertification(cert);
    expect(result.isValid).toBe(false);
    expect(result.totalFailedMandatory).toBe(1);
    expect(result.totalIncompleteMandatory).toBe(1);
    expect(result.warnings.length).toBe(2);
    expect(result.chapterResults.length).toBe(3);
  });

  test('generates finalize summary for warnings', () => {
    const cert = createCertWithChapters([
      { items: [{ status: 'FAILED', mandatory: true }, { status: 'NOT_STARTED', mandatory: true }] },
    ]);
    const result = validateCertification(cert);
    expect(result.finalizeSummary).toContain('1 failed mandatory item');
    expect(result.finalizeSummary).toContain('1 incomplete mandatory item');
    expect(result.finalizeSummary).toContain('Warning');
  });

  test('generates ready summary when valid', () => {
    const cert = createCertWithChapters([
      { items: [{ status: 'PASSED', mandatory: true }] },
    ]);
    const result = validateCertification(cert);
    expect(result.finalizeSummary).toContain('Ready to finalize');
  });

  test('canFinalize is always true (user can finalize with warnings)', () => {
    const cert = createCertWithChapters([
      { items: [{ status: 'FAILED', mandatory: true }] },
    ]);
    const result = validateCertification(cert);
    expect(result.canFinalize).toBe(true);
  });

  test('chapter results contain individual validation', () => {
    const cert = createCertWithChapters([
      { items: [{ status: 'FAILED', mandatory: true }] },
      { items: [{ status: 'PASSED', mandatory: true }] },
    ]);
    const result = validateCertification(cert);
    expect(result.chapterResults[0].isValid).toBe(false);
    expect(result.chapterResults[0].failedMandatoryCount).toBe(1);
    expect(result.chapterResults[1].isValid).toBe(true);
    expect(result.chapterResults[1].failedMandatoryCount).toBe(0);
  });
});

describe('getChapterWarningsSummary', () => {
  function createChapter(items: { status: ChecklistItemStatus; mandatory: boolean }[]): ComplianceChapter {
    return {
      id: 'ch-1',
      certificationId: 'cert-1',
      chapterNumber: '1',
      title: 'Test Chapter',
      status: 'DRAFT',
      attachments: [],
      sections: [],
      checklist: items.map((item, i) => ({
        id: `item-${i + 1}`,
        chapterId: 'ch-1',
        title: `Item ${i + 1}`,
        type: 'DOC' as const,
        status: item.status,
        mandatory: item.mandatory,
        attachments: [],
        sortOrder: i + 1,
      })),
      sortOrder: 1,
    };
  }

  test('returns hasErrors true for FAILED mandatory', () => {
    const chapter = createChapter([{ status: 'FAILED', mandatory: true }]);
    const result = getChapterWarningsSummary(chapter);
    expect(result.hasErrors).toBe(true);
    expect(result.hasWarnings).toBe(false);
    expect(result.errorCount).toBe(1);
  });

  test('returns hasWarnings true for incomplete mandatory', () => {
    const chapter = createChapter([{ status: 'NOT_STARTED', mandatory: true }]);
    const result = getChapterWarningsSummary(chapter);
    expect(result.hasErrors).toBe(false);
    expect(result.hasWarnings).toBe(true);
    expect(result.warningCount).toBe(1);
  });

  test('returns summary for errors and warnings', () => {
    const chapter = createChapter([
      { status: 'FAILED', mandatory: true },
      { status: 'NOT_STARTED', mandatory: true },
    ]);
    const result = getChapterWarningsSummary(chapter);
    expect(result.summary).toContain('1 failed');
    expect(result.summary).toContain('1 incomplete');
  });

  test('returns "All mandatory complete" when no issues', () => {
    const chapter = createChapter([{ status: 'PASSED', mandatory: true }]);
    const result = getChapterWarningsSummary(chapter);
    expect(result.hasErrors).toBe(false);
    expect(result.hasWarnings).toBe(false);
    expect(result.summary).toBe('All mandatory complete');
  });

  test('returns empty summary for chapter without mandatory items', () => {
    const chapter = createChapter([{ status: 'NOT_STARTED', mandatory: false }]);
    const result = getChapterWarningsSummary(chapter);
    expect(result.summary).toBe('');
  });
});

// ============================================
// FINALIZE CONFIRMATION BEHAVIOR TESTS
// ============================================

describe('Finalize Confirmation Behavior', () => {
  test('validation detects issues that would be locked by finalization', () => {
    // Simulate a certification with issues
    const cert: ComplianceCertification = {
      id: 'cert-1',
      projectId: 'proj-1',
      type: 'CE',
      name: 'Test Cert',
      version: 1,
      status: 'DRAFT',
      chapters: [
        {
          id: 'ch-1',
          certificationId: 'cert-1',
          chapterNumber: '1',
          title: 'General Description',
          status: 'DRAFT',
          attachments: [],
          sections: [],
          checklist: [
            {
              id: 'item-1',
              chapterId: 'ch-1',
              title: 'HIN Verification',
              type: 'DOC',
              status: 'FAILED',
              mandatory: true,
              attachments: [],
              sortOrder: 1,
            },
            {
              id: 'item-2',
              chapterId: 'ch-1',
              title: 'Dimensions',
              type: 'DOC',
              status: 'NOT_STARTED',
              mandatory: true,
              attachments: [],
              sortOrder: 2,
            },
          ],
          sortOrder: 1,
        },
      ],
      createdAt: new Date().toISOString(),
      createdBy: 'Test',
    };

    const validation = validateCertification(cert);

    // These are the values that would be shown in finalize confirmation dialog
    expect(validation.isValid).toBe(false);
    expect(validation.totalFailedMandatory).toBe(1);
    expect(validation.totalIncompleteMandatory).toBe(1);
    expect(validation.finalizeSummary).toContain('Warning');
    expect(validation.finalizeSummary).toContain('failed');
    expect(validation.finalizeSummary).toContain('incomplete');

    // User CAN still finalize (with confirmation)
    expect(validation.canFinalize).toBe(true);
  });

  test('validation confirms clean state before finalization', () => {
    const cert: ComplianceCertification = {
      id: 'cert-1',
      projectId: 'proj-1',
      type: 'CE',
      name: 'Test Cert',
      version: 1,
      status: 'DRAFT',
      chapters: [
        {
          id: 'ch-1',
          certificationId: 'cert-1',
          chapterNumber: '1',
          title: 'General Description',
          status: 'DRAFT',
          attachments: [],
          sections: [],
          checklist: [
            {
              id: 'item-1',
              chapterId: 'ch-1',
              title: 'HIN Verification',
              type: 'DOC',
              status: 'PASSED',
              mandatory: true,
              attachments: [],
              verifiedBy: 'Inspector',
              verifiedAt: new Date().toISOString(),
              sortOrder: 1,
            },
          ],
          sortOrder: 1,
        },
      ],
      createdAt: new Date().toISOString(),
      createdBy: 'Test',
    };

    const validation = validateCertification(cert);

    expect(validation.isValid).toBe(true);
    expect(validation.totalFailedMandatory).toBe(0);
    expect(validation.totalIncompleteMandatory).toBe(0);
    expect(validation.finalizeSummary).toContain('Ready to finalize');
  });

  test('warnings include chapter context for UI display', () => {
    const cert: ComplianceCertification = {
      id: 'cert-1',
      projectId: 'proj-1',
      type: 'CE',
      name: 'Test Cert',
      version: 1,
      status: 'DRAFT',
      chapters: [
        {
          id: 'ch-5',
          certificationId: 'cert-1',
          chapterNumber: '5',
          title: 'Cockpit and Hull Openings',
          status: 'DRAFT',
          attachments: [],
          sections: [],
          checklist: [
            {
              id: 'item-1',
              chapterId: 'ch-5',
              title: 'Cockpit drainage',
              type: 'INSPECTION',
              status: 'FAILED',
              mandatory: true,
              attachments: [],
              sortOrder: 1,
            },
          ],
          sortOrder: 5,
        },
      ],
      createdAt: new Date().toISOString(),
      createdBy: 'Test',
    };

    const validation = validateCertification(cert);
    const warning = validation.warnings[0];

    // Warning should include context for UI
    expect(warning.chapterId).toBe('ch-5');
    expect(warning.chapterNumber).toBe('5');
    expect(warning.itemId).toBe('item-1');
    expect(warning.itemTitle).toBe('Cockpit drainage');
    expect(warning.level).toBe('ERROR');
  });
});
