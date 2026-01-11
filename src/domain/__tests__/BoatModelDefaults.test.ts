/**
 * BoatModel Default Configuration Tests
 * Tests for default configuration items applied on NEW_BUILD project creation
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  BoatModelService,
  type DefaultConfigurationItem,
} from '@/domain/services/BoatModelService';
import {
  LibraryCategoryService,
  LibrarySubcategoryService,
  LibraryArticleService,
  LibraryKitService,
} from '@/domain/services';
import { ProjectRepository } from '@/data/repositories';
import type { AuditContext } from '@/domain/audit/AuditService';
import { clearAllTestData } from './testUtils';

const testContext: AuditContext = {
  userId: 'test-user',
  userName: 'Test User',
};

describe('BoatModelVersion - Default Configuration', () => {
  let subcategoryId: string;
  let articleId: string;
  let articleVersionId: string;
  let kitId: string;
  let kitVersionId: string;

  beforeEach(async () => {
    await clearAllTestData();

    // Create category and subcategory for test articles
    const catResult = await LibraryCategoryService.create(
      { name: 'Test Category' },
      testContext
    );
    if (!catResult.ok) throw new Error('Failed to create category');

    const subResult = await LibrarySubcategoryService.create(
      { categoryId: catResult.value.id, name: 'Test Subcategory' },
      testContext
    );
    if (!subResult.ok) throw new Error('Failed to create subcategory');
    subcategoryId = subResult.value.id;

    // Create and approve an article
    const articleResult = await LibraryArticleService.create(
      {
        code: 'DEFAULT-ARTICLE-001',
        name: 'Default Test Article',
        subcategoryId,
        unit: 'pcs',
        sellPrice: 500,
        costPrice: 350,
      },
      testContext
    );
    if (!articleResult.ok) throw new Error('Failed to create article');
    articleId = articleResult.value.id;
    articleVersionId = articleResult.value.currentVersionId!;
    await LibraryArticleService.approveVersion(articleVersionId, testContext);

    // Create and approve a kit
    const kitResult = await LibraryKitService.create(
      {
        code: 'DEFAULT-KIT-001',
        name: 'Default Test Kit',
        subcategoryId,
        sellPrice: 1000,
        explodeInBOM: true,
        components: [{ articleVersionId, qty: 2 }],
      },
      testContext
    );
    if (!kitResult.ok) throw new Error('Failed to create kit');
    kitId = kitResult.value.id;
    kitVersionId = kitResult.value.currentVersionId!;
    await LibraryKitService.approveVersion(kitVersionId, testContext);
  });

  it('should create boat model with empty default configuration', async () => {
    const result = await BoatModelService.create(
      {
        name: 'Test Model',
        range: 'Sport',
        lengthM: 8.5,
        beamM: 2.8,
        basePrice: 100000,
      },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const version = await BoatModelService.getVersionById(result.value.currentVersionId!);
    expect(version).toBeDefined();
    expect(version!.defaultConfigurationItems).toEqual([]);
  });

  it('should create boat model with default configuration items', async () => {
    const defaultItems: DefaultConfigurationItem[] = [
      {
        id: 'def-item-1',
        itemType: 'ARTICLE',
        articleId,
        articleVersionId,
        category: 'Test Category',
        name: 'Default Test Article',
        quantity: 1,
        unit: 'pcs',
        unitPriceExclVat: 500,
        isIncluded: true,
        ceRelevant: false,
        safetyCritical: false,
        sortOrder: 0,
      },
    ];

    const result = await BoatModelService.create(
      {
        name: 'Model With Defaults',
        range: 'Touring',
        lengthM: 10.0,
        beamM: 3.2,
        basePrice: 150000,
        defaultConfigurationItems: defaultItems,
      },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const version = await BoatModelService.getVersionById(result.value.currentVersionId!);
    expect(version!.defaultConfigurationItems.length).toBe(1);
    expect(version!.defaultConfigurationItems[0].articleVersionId).toBe(articleVersionId);
  });

  it('should update default configuration for DRAFT version', async () => {
    // Create boat model
    const modelResult = await BoatModelService.create(
      {
        name: 'Updatable Model',
        range: 'Sport',
        lengthM: 8.0,
        beamM: 2.5,
        basePrice: 80000,
      },
      testContext
    );
    expect(modelResult.ok).toBe(true);
    if (!modelResult.ok) return;

    const versionId = modelResult.value.currentVersionId!;

    // Update default configuration
    const newItems: DefaultConfigurationItem[] = [
      {
        id: 'new-item-1',
        itemType: 'ARTICLE',
        articleId,
        articleVersionId,
        category: 'Test',
        name: 'Added Article',
        quantity: 2,
        unit: 'pcs',
        unitPriceExclVat: 500,
        isIncluded: true,
        ceRelevant: true,
        safetyCritical: false,
        sortOrder: 0,
      },
      {
        id: 'new-item-2',
        itemType: 'KIT',
        kitId,
        kitVersionId,
        category: 'Test',
        name: 'Added Kit',
        quantity: 1,
        unit: 'set',
        unitPriceExclVat: 1000,
        isIncluded: true,
        ceRelevant: false,
        safetyCritical: true,
        sortOrder: 1,
      },
    ];

    const updateResult = await BoatModelService.updateDefaultConfiguration(
      versionId,
      newItems,
      testContext
    );

    expect(updateResult.ok).toBe(true);
    if (!updateResult.ok) return;

    expect(updateResult.value.defaultConfigurationItems.length).toBe(2);
    expect(updateResult.value.defaultConfigurationItems[0].itemType).toBe('ARTICLE');
    expect(updateResult.value.defaultConfigurationItems[1].itemType).toBe('KIT');
  });

  it('should NOT update default configuration for APPROVED version', async () => {
    // Create and approve boat model
    const modelResult = await BoatModelService.create(
      {
        name: 'Approved Model',
        range: 'Sport',
        lengthM: 8.0,
        beamM: 2.5,
        basePrice: 80000,
      },
      testContext
    );
    expect(modelResult.ok).toBe(true);
    if (!modelResult.ok) return;

    const versionId = modelResult.value.currentVersionId!;
    await BoatModelService.approveVersion(versionId, testContext);

    // Try to update - should fail
    const updateResult = await BoatModelService.updateDefaultConfiguration(
      versionId,
      [
        {
          id: 'should-fail',
          itemType: 'ARTICLE',
          articleId,
          articleVersionId,
          category: 'Test',
          name: 'Should Not Be Added',
          quantity: 1,
          unit: 'pcs',
          unitPriceExclVat: 100,
          isIncluded: true,
          ceRelevant: false,
          safetyCritical: false,
          sortOrder: 0,
        },
      ],
      testContext
    );

    expect(updateResult.ok).toBe(false);
    if (!updateResult.ok) {
      expect(updateResult.error).toContain('DRAFT');
    }
  });
});

describe('Project Creation with Default Configuration', () => {
  let boatModelVersionId: string;
  let articleId: string;
  let articleVersionId: string;

  beforeEach(async () => {
    await clearAllTestData();

    // Create category, subcategory, and article
    const catResult = await LibraryCategoryService.create(
      { name: 'Propulsion' },
      testContext
    );
    if (!catResult.ok) throw new Error('Failed to create category');

    const subResult = await LibrarySubcategoryService.create(
      { categoryId: catResult.value.id, name: 'Electric Motors' },
      testContext
    );
    if (!subResult.ok) throw new Error('Failed to create subcategory');

    const articleResult = await LibraryArticleService.create(
      {
        code: 'MOTOR-E40',
        name: 'Electric Motor 40kW',
        subcategoryId: subResult.value.id,
        unit: 'set',
        sellPrice: 35000,
        costPrice: 28000,
      },
      testContext
    );
    if (!articleResult.ok) throw new Error('Failed to create article');
    articleId = articleResult.value.id;
    articleVersionId = articleResult.value.currentVersionId!;
    await LibraryArticleService.approveVersion(articleVersionId, testContext);

    // Create boat model with default configuration
    const defaultItems: DefaultConfigurationItem[] = [
      {
        id: 'motor-item',
        itemType: 'ARTICLE',
        articleId,
        articleVersionId,
        category: 'Propulsion',
        subcategory: 'Electric Motors',
        articleNumber: 'MOTOR-E40',
        name: 'Electric Motor 40kW',
        quantity: 1,
        unit: 'set',
        unitPriceExclVat: 35000,
        isIncluded: true,
        ceRelevant: true,
        safetyCritical: true,
        sortOrder: 0,
      },
    ];

    const modelResult = await BoatModelService.create(
      {
        name: 'Eagle 40',
        range: 'Cruiser',
        lengthM: 12.2,
        beamM: 3.8,
        basePrice: 245000,
        ceCategory: 'A',
        defaultConfigurationItems: defaultItems,
      },
      testContext
    );
    if (!modelResult.ok) throw new Error('Failed to create boat model');
    boatModelVersionId = modelResult.value.currentVersionId!;
    await BoatModelService.approveVersion(boatModelVersionId, testContext);
  });

  it('should apply default configuration on NEW_BUILD project creation', async () => {
    // Create client first (needed for project)
    const { ClientRepository } = await import('@/data/repositories');
    const client = await ClientRepository.create({
      name: 'Test Client',
      type: 'private',
      email: 'test@example.com',
      status: 'active',
    });

    // Create NEW_BUILD project with boat model
    const project = await ProjectRepository.create(
      {
        title: 'Eagle 40 Build',
        type: 'NEW_BUILD',
        clientId: client.id,
        boatModelVersionId,
        propulsionType: 'Electric',
      },
      testContext.userId
    );

    // Check that configuration has default items
    expect(project.configuration.items.length).toBe(1);
    expect(project.configuration.items[0].name).toBe('Electric Motor 40kW');
    expect(project.configuration.items[0].itemType).toBe('ARTICLE');
    expect(project.configuration.items[0].articleVersionId).toBe(articleVersionId);
    expect(project.configuration.items[0].unitPriceExclVat).toBe(35000);

    // Check totals
    expect(project.configuration.subtotalExclVat).toBe(35000);
    expect(project.configuration.vatRate).toBe(21);
    expect(project.configuration.vatAmount).toBe(7350); // 21% of 35000
    expect(project.configuration.totalInclVat).toBe(42350);
  });

  it('should NOT apply defaults for REFIT projects', async () => {
    const { ClientRepository } = await import('@/data/repositories');
    const client = await ClientRepository.create({
      name: 'Refit Client',
      type: 'company',
      email: 'refit@example.com',
      status: 'active',
    });

    // Create REFIT project with same boat model
    const project = await ProjectRepository.create(
      {
        title: 'Eagle 40 Refit',
        type: 'REFIT',
        clientId: client.id,
        boatModelVersionId,
        propulsionType: 'Electric',
      },
      testContext.userId
    );

    // REFIT should NOT get default configuration
    expect(project.configuration.items.length).toBe(0);
  });

  it('should NOT apply defaults when no boatModelVersionId', async () => {
    const { ClientRepository } = await import('@/data/repositories');
    const client = await ClientRepository.create({
      name: 'No Model Client',
      type: 'private',
      email: 'nomodel@example.com',
      status: 'active',
    });

    // Create NEW_BUILD without boat model
    const project = await ProjectRepository.create(
      {
        title: 'Custom Build',
        type: 'NEW_BUILD',
        clientId: client.id,
        // No boatModelVersionId
        propulsionType: 'Electric',
      },
      testContext.userId
    );

    expect(project.configuration.items.length).toBe(0);
  });

  it('should allow editing default items before order confirmation', async () => {
    const { ClientRepository } = await import('@/data/repositories');
    const { ConfigurationService } = await import('@/domain/services');

    const client = await ClientRepository.create({
      name: 'Edit Client',
      type: 'private',
      email: 'edit@example.com',
      status: 'active',
    });

    const project = await ProjectRepository.create(
      {
        title: 'Eagle 40 Editable',
        type: 'NEW_BUILD',
        clientId: client.id,
        boatModelVersionId,
        propulsionType: 'Electric',
      },
      testContext.userId
    );

    // Should have 1 default item
    expect(project.configuration.items.length).toBe(1);
    const itemId = project.configuration.items[0].id;

    // Edit the quantity
    const updateResult = await ConfigurationService.updateItem(
      project.id,
      itemId,
      { quantity: 2 },
      testContext
    );

    expect(updateResult.ok).toBe(true);
    if (!updateResult.ok) return;

    // Check quantity updated
    expect(updateResult.value.configuration.items[0].quantity).toBe(2);
    expect(updateResult.value.configuration.items[0].lineTotalExclVat).toBe(70000); // 2 x 35000

    // Remove the item
    const removeResult = await ConfigurationService.removeItem(
      project.id,
      itemId,
      testContext
    );

    expect(removeResult.ok).toBe(true);
    if (!removeResult.ok) return;

    expect(removeResult.value.configuration.items.length).toBe(0);
  });
});
