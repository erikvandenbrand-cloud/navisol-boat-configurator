/**
 * Article Extensions Tests
 * Tests for weightKg and attachments fields on ArticleVersion
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';
import { clearAllTestData } from '@/domain/__tests__/testUtils';

import type {
  ArticleVersion,
  ArticleAttachment,
  AttachmentType,
  CreateArticleInput,
  CreateArticleVersionInput,
} from '@/domain/models';
import { ATTACHMENT_TYPE_LABELS } from '@/domain/models';

// ============================================
// MODEL TESTS
// ============================================

describe('ArticleAttachment Type', () => {
  test('AttachmentType includes all expected types', () => {
    const expectedTypes: AttachmentType[] = ['3D', 'CNC', 'MANUAL', 'CERTIFICATE', 'DRAWING', 'DATASHEET', 'OTHER'];

    for (const type of expectedTypes) {
      expect(ATTACHMENT_TYPE_LABELS[type]).toBeDefined();
    }
  });

  test('ATTACHMENT_TYPE_LABELS has user-friendly labels', () => {
    expect(ATTACHMENT_TYPE_LABELS['3D']).toBe('3D Model');
    expect(ATTACHMENT_TYPE_LABELS['CNC']).toBe('CNC File');
    expect(ATTACHMENT_TYPE_LABELS['MANUAL']).toBe('Manual');
    expect(ATTACHMENT_TYPE_LABELS['CERTIFICATE']).toBe('Certificate');
    expect(ATTACHMENT_TYPE_LABELS['DRAWING']).toBe('Drawing');
    expect(ATTACHMENT_TYPE_LABELS['DATASHEET']).toBe('Datasheet');
    expect(ATTACHMENT_TYPE_LABELS['OTHER']).toBe('Other');
  });
});

describe('ArticleVersion with weightKg', () => {
  test('ArticleVersion can have weightKg field', () => {
    const version: Partial<ArticleVersion> = {
      id: 'v1',
      articleId: 'art1',
      versionNumber: 1,
      status: 'DRAFT',
      sellPrice: 1000,
      vatRate: 21,
      weightKg: 15.5,
    };

    expect(version.weightKg).toBe(15.5);
  });

  test('ArticleVersion weightKg is optional', () => {
    const version: Partial<ArticleVersion> = {
      id: 'v1',
      articleId: 'art1',
      versionNumber: 1,
      status: 'DRAFT',
      sellPrice: 1000,
      vatRate: 21,
    };

    expect(version.weightKg).toBeUndefined();
  });

  test('weightKg can be zero', () => {
    const version: Partial<ArticleVersion> = {
      id: 'v1',
      articleId: 'art1',
      versionNumber: 1,
      status: 'DRAFT',
      sellPrice: 1000,
      vatRate: 21,
      weightKg: 0,
    };

    expect(version.weightKg).toBe(0);
  });

  test('weightKg can be decimal', () => {
    const version: Partial<ArticleVersion> = {
      id: 'v1',
      articleId: 'art1',
      versionNumber: 1,
      status: 'DRAFT',
      sellPrice: 1000,
      vatRate: 21,
      weightKg: 0.125,
    };

    expect(version.weightKg).toBe(0.125);
  });
});

describe('ArticleVersion with attachments', () => {
  test('ArticleVersion can have empty attachments array', () => {
    const version: Partial<ArticleVersion> = {
      id: 'v1',
      articleId: 'art1',
      versionNumber: 1,
      status: 'DRAFT',
      sellPrice: 1000,
      vatRate: 21,
      attachments: [],
    };

    expect(version.attachments).toEqual([]);
  });

  test('ArticleVersion attachments is optional', () => {
    const version: Partial<ArticleVersion> = {
      id: 'v1',
      articleId: 'art1',
      versionNumber: 1,
      status: 'DRAFT',
      sellPrice: 1000,
      vatRate: 21,
    };

    expect(version.attachments).toBeUndefined();
  });

  test('ArticleVersion can have multiple attachments', () => {
    const attachments: ArticleAttachment[] = [
      {
        id: 'att1',
        type: '3D',
        filename: 'model.step',
        mimeType: 'application/step',
        sizeBytes: 1024000,
        uploadedAt: '2025-01-08T10:00:00Z',
        uploadedBy: 'user1',
      },
      {
        id: 'att2',
        type: 'CERTIFICATE',
        filename: 'ce-cert.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 256000,
        uploadedAt: '2025-01-08T10:00:00Z',
        uploadedBy: 'user1',
      },
      {
        id: 'att3',
        type: 'DRAWING',
        filename: 'dimensions.dxf',
        mimeType: 'application/dxf',
        sizeBytes: 512000,
        uploadedAt: '2025-01-08T10:00:00Z',
        uploadedBy: 'user1',
        notes: 'Front view',
      },
    ];

    const version: Partial<ArticleVersion> = {
      id: 'v1',
      articleId: 'art1',
      versionNumber: 1,
      status: 'DRAFT',
      sellPrice: 1000,
      vatRate: 21,
      attachments,
    };

    expect(version.attachments?.length).toBe(3);
    expect(version.attachments?.[0].type).toBe('3D');
    expect(version.attachments?.[1].type).toBe('CERTIFICATE');
    expect(version.attachments?.[2].notes).toBe('Front view');
  });
});

describe('ArticleAttachment structure', () => {
  test('attachment has required fields', () => {
    const attachment: ArticleAttachment = {
      id: 'att1',
      type: 'MANUAL',
      filename: 'user-guide.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048000,
      uploadedAt: '2025-01-08T10:00:00Z',
      uploadedBy: 'user1',
    };

    expect(attachment.id).toBe('att1');
    expect(attachment.type).toBe('MANUAL');
    expect(attachment.filename).toBe('user-guide.pdf');
    expect(attachment.mimeType).toBe('application/pdf');
    expect(attachment.sizeBytes).toBe(2048000);
    expect(attachment.uploadedAt).toBe('2025-01-08T10:00:00Z');
    expect(attachment.uploadedBy).toBe('user1');
  });

  test('attachment can have dataUrl for inline storage', () => {
    const attachment: ArticleAttachment = {
      id: 'att1',
      type: 'DATASHEET',
      filename: 'specs.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
      uploadedAt: '2025-01-08T10:00:00Z',
      uploadedBy: 'user1',
    };

    expect(attachment.dataUrl).toContain('data:application/pdf');
  });

  test('attachment can have external URL', () => {
    const attachment: ArticleAttachment = {
      id: 'att1',
      type: 'CNC',
      filename: 'part.nc',
      mimeType: 'text/x-gcode',
      sizeBytes: 0, // Unknown for external
      url: 'https://cdn.example.com/files/part.nc',
      uploadedAt: '2025-01-08T10:00:00Z',
      uploadedBy: 'user1',
    };

    expect(attachment.url).toContain('cdn.example.com');
  });

  test('attachment can have notes', () => {
    const attachment: ArticleAttachment = {
      id: 'att1',
      type: 'DRAWING',
      filename: 'assembly.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 512000,
      uploadedAt: '2025-01-08T10:00:00Z',
      uploadedBy: 'user1',
      notes: 'Rev 2.1 - Updated 2025-01-08',
    };

    expect(attachment.notes).toBe('Rev 2.1 - Updated 2025-01-08');
  });
});

describe('CreateArticleInput with weightKg', () => {
  test('CreateArticleInput can include weightKg', () => {
    const input: CreateArticleInput = {
      code: 'TEST-001',
      name: 'Test Article',
      subcategoryId: 'sub1',
      unit: 'pcs',
      sellPrice: 100,
      weightKg: 5.5,
    };

    expect(input.weightKg).toBe(5.5);
  });
});

describe('CreateArticleVersionInput with new fields', () => {
  test('CreateArticleVersionInput can include weightKg', () => {
    const input: CreateArticleVersionInput = {
      sellPrice: 200,
      weightKg: 10.25,
    };

    expect(input.weightKg).toBe(10.25);
  });

  test('CreateArticleVersionInput can include attachments', () => {
    const attachments: ArticleAttachment[] = [
      {
        id: 'temp1',
        type: 'DATASHEET',
        filename: 'spec.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        uploadedAt: '2025-01-08T10:00:00Z',
        uploadedBy: 'user1',
      },
    ];

    const input: CreateArticleVersionInput = {
      sellPrice: 200,
      attachments,
    };

    expect(input.attachments?.length).toBe(1);
  });
});

describe('Versioning rules for attachments', () => {
  test('attachments are version-specific', () => {
    const v1Attachments: ArticleAttachment[] = [
      {
        id: 'att1',
        type: 'DRAWING',
        filename: 'v1-drawing.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        uploadedAt: '2025-01-01T10:00:00Z',
        uploadedBy: 'user1',
      },
    ];

    const v2Attachments: ArticleAttachment[] = [
      {
        id: 'att2',
        type: 'DRAWING',
        filename: 'v2-drawing.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        uploadedAt: '2025-01-08T10:00:00Z',
        uploadedBy: 'user1',
        notes: 'Updated dimensions',
      },
      {
        id: 'att3',
        type: 'CERTIFICATE',
        filename: 'ce-cert.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512,
        uploadedAt: '2025-01-08T10:00:00Z',
        uploadedBy: 'user1',
      },
    ];

    const version1: Partial<ArticleVersion> = {
      id: 'v1',
      articleId: 'art1',
      versionNumber: 1,
      status: 'APPROVED',
      sellPrice: 1000,
      vatRate: 21,
      attachments: v1Attachments,
    };

    const version2: Partial<ArticleVersion> = {
      id: 'v2',
      articleId: 'art1',
      versionNumber: 2,
      status: 'DRAFT',
      sellPrice: 1100,
      vatRate: 21,
      attachments: v2Attachments,
    };

    // Each version has its own attachments
    expect(version1.attachments?.length).toBe(1);
    expect(version2.attachments?.length).toBe(2);

    // Version 1 attachments are unchanged
    expect(version1.attachments?.[0].filename).toBe('v1-drawing.pdf');

    // Version 2 has new attachments
    expect(version2.attachments?.[0].filename).toBe('v2-drawing.pdf');
    expect(version2.attachments?.[1].type).toBe('CERTIFICATE');
  });

  test('weightKg is version-specific', () => {
    const version1: Partial<ArticleVersion> = {
      id: 'v1',
      articleId: 'art1',
      versionNumber: 1,
      status: 'APPROVED',
      sellPrice: 1000,
      vatRate: 21,
      weightKg: 10.0,
    };

    const version2: Partial<ArticleVersion> = {
      id: 'v2',
      articleId: 'art1',
      versionNumber: 2,
      status: 'DRAFT',
      sellPrice: 1100,
      vatRate: 21,
      weightKg: 9.5, // Weight reduced in v2
    };

    expect(version1.weightKg).toBe(10.0);
    expect(version2.weightKg).toBe(9.5);
  });
});
