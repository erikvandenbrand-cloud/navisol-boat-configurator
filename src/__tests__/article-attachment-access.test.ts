/**
 * Article Attachment Access Tests
 * Tests that all users who can view an Article can download its attachments
 *
 * Scope:
 * - Library Article view
 * - BOM click-through to Article detail
 * - Production attachment access
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import models
import { hasPermission, type Role, type ArticleAttachment, ATTACHMENT_TYPE_LABELS } from '@/domain/models';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

// ============================================
// PERMISSION TESTS FOR ATTACHMENT ACCESS
// ============================================

describe('Article Attachment Access - Permission Tests', () => {
  describe('Library Article View Access', () => {
    // If a user can view the library, they should be able to download attachments
    const roles: Role[] = ['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'VIEWER'];

    for (const role of roles) {
      test(`${role} role can view library (prerequisite for download)`, () => {
        // All roles have library:read permission
        expect(hasPermission(role, 'library:read')).toBe(true);
      });
    }
  });

  describe('BOM Click-Through Access', () => {
    // If a user can view BOM, they should be able to click through to article detail and download
    const roles: Role[] = ['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'VIEWER'];

    for (const role of roles) {
      test(`${role} role can view BOM (prerequisite for article click-through)`, () => {
        // All roles with project:read can view BOM
        expect(hasPermission(role, 'project:read')).toBe(true);
      });
    }
  });

  describe('Production Attachment Access', () => {
    // If a user can view production, they should be able to access article attachments
    const roles: Role[] = ['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'VIEWER'];

    for (const role of roles) {
      test(`${role} role can view production (prerequisite for attachment access)`, () => {
        // All roles have production:read permission
        expect(hasPermission(role, 'production:read')).toBe(true);
      });
    }
  });
});

// ============================================
// ATTACHMENT DATA STRUCTURE TESTS
// ============================================

describe('Article Attachment - Download Requirements', () => {
  test('attachment with dataUrl can be downloaded', () => {
    const attachment: ArticleAttachment = {
      id: 'att-1',
      type: 'MANUAL',
      filename: 'user-guide.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024000,
      uploadedAt: '2025-01-09T10:00:00Z',
      uploadedBy: 'user1',
      dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
    };

    // Download is possible if dataUrl or url is present
    const canDownload = Boolean(attachment.dataUrl || attachment.url);
    expect(canDownload).toBe(true);
  });

  test('attachment with external URL can be downloaded', () => {
    const attachment: ArticleAttachment = {
      id: 'att-2',
      type: 'DRAWING',
      filename: 'hull-drawing.dwg',
      mimeType: 'application/octet-stream',
      sizeBytes: 5000000,
      uploadedAt: '2025-01-09T10:00:00Z',
      uploadedBy: 'user1',
      url: 'https://cdn.example.com/drawings/hull.dwg',
    };

    // Download is possible if dataUrl or url is present
    const canDownload = Boolean(attachment.dataUrl || attachment.url);
    expect(canDownload).toBe(true);
  });

  test('attachment without source cannot be downloaded', () => {
    const attachment: ArticleAttachment = {
      id: 'att-3',
      type: 'CERTIFICATE',
      filename: 'missing-file.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 0,
      uploadedAt: '2025-01-09T10:00:00Z',
      uploadedBy: 'user1',
      // No dataUrl or url
    };

    // Download is not possible without dataUrl or url
    const canDownload = Boolean(attachment.dataUrl || attachment.url);
    expect(canDownload).toBe(false);
  });
});

// ============================================
// APPROVED VERSION IMMUTABILITY TESTS
// ============================================

describe('Approved ArticleVersion Immutability', () => {
  test('approved versions cannot have attachments added', async () => {
    // This verifies that the LibraryArticleService enforces immutability
    // for approved versions. The service should reject attachment modifications.
    const { LibraryArticleService, LibraryCategoryService, LibrarySubcategoryService } = await import('@/domain/services');
    const { clearAllTestData } = await import('@/domain/__tests__/testUtils');

    await clearAllTestData();

    const testContext = { userId: 'test-user', userName: 'Test User' };

    // Create category and subcategory
    const catResult = await LibraryCategoryService.create({ name: 'Test Category' }, testContext);
    expect(catResult.ok).toBe(true);
    if (!catResult.ok) return;

    const subResult = await LibrarySubcategoryService.create({ categoryId: catResult.value.id, name: 'Test Subcategory' }, testContext);
    expect(subResult.ok).toBe(true);
    if (!subResult.ok) return;

    // Create article
    const articleResult = await LibraryArticleService.create({
      code: 'TEST-001',
      name: 'Test Article',
      unit: 'pcs',
      subcategoryId: subResult.value.id,
    }, testContext);
    expect(articleResult.ok).toBe(true);
    if (!articleResult.ok) return;

    // Create version
    const versionResult = await LibraryArticleService.createVersion(articleResult.value.id, {
      sellPrice: 100,
      notes: 'Test version',
    }, testContext);
    expect(versionResult.ok).toBe(true);
    if (!versionResult.ok) return;

    // Approve the version (only takes versionId and context)
    const approveResult = await LibraryArticleService.approveVersion(
      versionResult.value.id,
      testContext
    );
    expect(approveResult.ok).toBe(true);

    // Verify the version is now approved
    const approvedVersion = await LibraryArticleService.getVersionById(versionResult.value.id);
    expect(approvedVersion?.status).toBe('APPROVED');

    // Attempt to add attachment to approved version should fail
    const attachmentResult = await LibraryArticleService.addAttachment(
      versionResult.value.id,
      {
        type: 'MANUAL',
        filename: 'new-manual.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1000,
        dataUrl: 'data:application/pdf;base64,test',
      },
      testContext
    );

    // Should fail because version is approved (immutable)
    expect(attachmentResult.ok).toBe(false);
  });

  test('approved versions preserve existing attachments', async () => {
    const { LibraryArticleService, LibraryCategoryService, LibrarySubcategoryService } = await import('@/domain/services');
    const { clearAllTestData } = await import('@/domain/__tests__/testUtils');

    await clearAllTestData();

    const testContext = { userId: 'test-user', userName: 'Test User' };

    // Create category and subcategory
    const catResult = await LibraryCategoryService.create({ name: 'Test Category 2' }, testContext);
    expect(catResult.ok).toBe(true);
    if (!catResult.ok) return;

    const subResult = await LibrarySubcategoryService.create({ categoryId: catResult.value.id, name: 'Test Subcategory 2' }, testContext);
    expect(subResult.ok).toBe(true);
    if (!subResult.ok) return;

    // Create article
    const articleResult = await LibraryArticleService.create({
      code: 'TEST-002',
      name: 'Test Article With Attachment',
      unit: 'pcs',
      subcategoryId: subResult.value.id,
    }, testContext);
    expect(articleResult.ok).toBe(true);
    if (!articleResult.ok) return;

    // Create version with attachment
    const versionResult = await LibraryArticleService.createVersion(articleResult.value.id, {
      sellPrice: 200,
      notes: 'Version with attachment',
      attachments: [{
        id: 'att-existing',
        type: 'DATASHEET',
        filename: 'datasheet.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2000,
        uploadedAt: '2025-01-09T10:00:00Z',
        uploadedBy: 'user1',
        dataUrl: 'data:application/pdf;base64,existing',
      }],
    }, testContext);
    expect(versionResult.ok).toBe(true);
    if (!versionResult.ok) return;

    // Approve the version (only takes versionId and context)
    const approveResult = await LibraryArticleService.approveVersion(
      versionResult.value.id,
      testContext
    );
    expect(approveResult.ok).toBe(true);

    // Verify attachment is still accessible after approval
    const approvedVersion = await LibraryArticleService.getVersionById(versionResult.value.id);
    expect(approvedVersion?.status).toBe('APPROVED');
    expect(approvedVersion?.attachments?.length).toBe(1);
    expect(approvedVersion?.attachments?.[0].filename).toBe('datasheet.pdf');
    expect(approvedVersion?.attachments?.[0].dataUrl).toBe('data:application/pdf;base64,existing');
  });
});

// ============================================
// ATTACHMENT TYPE LABELS
// ============================================

describe('Attachment Type Labels for Download UI', () => {
  test('all attachment types have user-friendly labels', () => {
    const types = ['3D', 'CNC', 'MANUAL', 'CERTIFICATE', 'DRAWING', 'DATASHEET', 'OTHER'] as const;

    for (const type of types) {
      expect(ATTACHMENT_TYPE_LABELS[type]).toBeDefined();
      expect(typeof ATTACHMENT_TYPE_LABELS[type]).toBe('string');
      expect(ATTACHMENT_TYPE_LABELS[type].length).toBeGreaterThan(0);
    }
  });
});

// ============================================
// NO PERMISSION RESTRICTIONS ON DOWNLOAD
// ============================================

describe('No Role-Based Download Restrictions', () => {
  test('VIEWER role has no restrictions preventing download access', () => {
    // VIEWER is the most restricted role - if they can view, they can download
    expect(hasPermission('VIEWER', 'library:read')).toBe(true);
    expect(hasPermission('VIEWER', 'project:read')).toBe(true);
    expect(hasPermission('VIEWER', 'production:read')).toBe(true);

    // VIEWER cannot edit, but that's expected - downloads are read-only
    expect(hasPermission('VIEWER', 'library:update')).toBe(false);
    expect(hasPermission('VIEWER', 'library:create')).toBe(false);
  });

  test('PRODUCTION role has no restrictions preventing download access', () => {
    expect(hasPermission('PRODUCTION', 'library:read')).toBe(true);
    expect(hasPermission('PRODUCTION', 'project:read')).toBe(true);
    expect(hasPermission('PRODUCTION', 'production:read')).toBe(true);
  });

  test('SALES role has no restrictions preventing download access', () => {
    expect(hasPermission('SALES', 'library:read')).toBe(true);
    expect(hasPermission('SALES', 'project:read')).toBe(true);
    expect(hasPermission('SALES', 'production:read')).toBe(true);
  });
});
