/**
 * Library v4 Service
 * Manages the hierarchical library structure with versioning
 */

import type {
  LibraryCategory,
  LibrarySubcategory,
  LibraryArticle,
  ArticleVersion,
  LibraryKit,
  KitVersion,
  CreateCategoryInput,
  CreateSubcategoryInput,
  CreateArticleInput,
  CreateArticleVersionInput,
  CreateKitInput,
  CreateKitVersionInput,
  CategoryTree,
  ArticleWithVersion,
  KitWithVersion,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import {
  CategoryRepository,
  SubcategoryRepository,
  ArticleRepository,
  ArticleVersionRepository,
  KitRepository,
  KitVersionRepository,
} from '@/data/repositories/LibraryV4Repository';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// INITIAL TAXONOMY DATA
// ============================================

const INITIAL_TAXONOMY: { name: string; subcategories: string[] }[] = [
  {
    name: 'Hull & Structural',
    subcategories: ['Hull plating & frames', 'Bulkheads & compartments', 'Coatings & corrosion protection', 'Structural fasteners'],
  },
  {
    name: 'Deck & Hardware',
    subcategories: ['Cleats & bollards', 'Rails & stanchions', 'Anchoring & mooring', 'Hatches & windows'],
  },
  {
    name: 'Propulsion',
    subcategories: ['Electric motors & drives', 'Diesel engines', 'Outboards', 'Motor mounts & brackets', 'Shaftline', 'Propellers', 'Cooling', 'Controls & throttle'],
  },
  {
    name: 'Electrical & Power',
    subcategories: ['Battery packs', 'BMS & protection', 'Chargers', 'Inverters', 'Shore power', 'Distribution & breakers', 'Wiring & terminals'],
  },
  {
    name: 'Electronics & Navigation',
    subcategories: ['Chartplotters & GPS', 'AIS / VHF', 'Instrumentation', 'Audio', 'Networking (NMEA)'],
  },
  {
    name: 'Steering & Control',
    subcategories: ['Steering wheels & helms', 'Hydraulic steering', 'Mechanical steering', 'Rudder & tiller gear', 'Thrusters', 'Trim tabs'],
  },
  {
    name: 'Plumbing & Bilge',
    subcategories: ['Bilge pumps', 'Hoses & fittings', 'Through-hulls & valves', 'Cooling plumbing'],
  },
  {
    name: 'Interior & Finish',
    subcategories: ['Flooring', 'Seating & upholstery', 'Cabinets & joinery', 'Interior lighting'],
  },
  {
    name: 'Safety & Compliance',
    subcategories: ['Fire extinguishers', 'Life-saving equipment', 'Navigation lights', 'CE labels & plates', 'Safety signage'],
  },
  {
    name: 'Documentation & Delivery',
    subcategories: ['Manuals & inserts', 'Delivery checklist items', 'Spare parts packs'],
  },
  {
    name: 'Services',
    subcategories: ['Installation labor', 'Commissioning', 'Sea trial', 'Transport'],
  },
];

// ============================================
// CATEGORY SERVICE
// ============================================

export const LibraryCategoryService = {
  async getAll(): Promise<LibraryCategory[]> {
    return CategoryRepository.getAll();
  },

  async getById(id: string): Promise<LibraryCategory | null> {
    return CategoryRepository.getById(id);
  },

  async create(input: CreateCategoryInput, context: AuditContext): Promise<Result<LibraryCategory, string>> {
    const existing = await CategoryRepository.getAll();
    const sortOrder = input.sortOrder ?? existing.length;

    const category: LibraryCategory = {
      id: generateUUID(),
      name: input.name,
      sortOrder,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await CategoryRepository.save(category);

    await AuditService.logCreate(context, 'LibraryCategory', category.id, { name: input.name });

    return Ok(category);
  },

  async update(id: string, updates: Partial<Pick<LibraryCategory, 'name' | 'sortOrder'>>, context: AuditContext): Promise<Result<LibraryCategory, string>> {
    const category = await CategoryRepository.getById(id);
    if (!category) return Err('Category not found');

    const updated: LibraryCategory = {
      ...category,
      ...updates,
      updatedAt: now(),
      version: category.version + 1,
    };

    await CategoryRepository.save(updated);
    await AuditService.logUpdate(context, 'LibraryCategory', id, category as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);

    return Ok(updated);
  },

  async delete(id: string, context: AuditContext): Promise<Result<void, string>> {
    const category = await CategoryRepository.getById(id);
    if (!category) return Err('Category not found');

    // Check for subcategories
    const subcategories = await SubcategoryRepository.getByCategory(id);
    if (subcategories.length > 0) {
      return Err('Cannot delete category with subcategories');
    }

    await CategoryRepository.delete(id);
    await AuditService.log(context, 'ARCHIVE', 'LibraryCategory', id, `Deleted category: ${category.name}`);

    return Ok(undefined);
  },

  async getCategoryTree(): Promise<CategoryTree[]> {
    const categories = await CategoryRepository.getAll();
    const subcategories = await SubcategoryRepository.getAll();
    const articles = await ArticleRepository.getAll();
    const kits = await KitRepository.getAll();

    return categories.map((category) => {
      const catSubcategories = subcategories.filter((s) => s.categoryId === category.id);

      return {
        category,
        subcategories: catSubcategories.map((subcategory) => ({
          subcategory,
          articleCount: articles.filter((a) => a.subcategoryId === subcategory.id).length,
          kitCount: kits.filter((k) => k.subcategoryId === subcategory.id).length,
        })),
      };
    });
  },
};

// ============================================
// SUBCATEGORY SERVICE
// ============================================

export const LibrarySubcategoryService = {
  async getAll(): Promise<LibrarySubcategory[]> {
    return SubcategoryRepository.getAll();
  },

  async getByCategory(categoryId: string): Promise<LibrarySubcategory[]> {
    return SubcategoryRepository.getByCategory(categoryId);
  },

  async getById(id: string): Promise<LibrarySubcategory | null> {
    return SubcategoryRepository.getById(id);
  },

  async create(input: CreateSubcategoryInput, context: AuditContext): Promise<Result<LibrarySubcategory, string>> {
    const category = await CategoryRepository.getById(input.categoryId);
    if (!category) return Err('Category not found');

    const existing = await SubcategoryRepository.getByCategory(input.categoryId);
    const sortOrder = input.sortOrder ?? existing.length;

    const subcategory: LibrarySubcategory = {
      id: generateUUID(),
      categoryId: input.categoryId,
      name: input.name,
      sortOrder,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await SubcategoryRepository.save(subcategory);
    await AuditService.logCreate(context, 'LibrarySubcategory', subcategory.id, { name: input.name, categoryId: input.categoryId });

    return Ok(subcategory);
  },

  async update(id: string, updates: Partial<Pick<LibrarySubcategory, 'name' | 'sortOrder'>>, context: AuditContext): Promise<Result<LibrarySubcategory, string>> {
    const subcategory = await SubcategoryRepository.getById(id);
    if (!subcategory) return Err('Subcategory not found');

    const updated: LibrarySubcategory = {
      ...subcategory,
      ...updates,
      updatedAt: now(),
      version: subcategory.version + 1,
    };

    await SubcategoryRepository.save(updated);
    await AuditService.logUpdate(context, 'LibrarySubcategory', id, subcategory as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);

    return Ok(updated);
  },

  async delete(id: string, context: AuditContext): Promise<Result<void, string>> {
    const subcategory = await SubcategoryRepository.getById(id);
    if (!subcategory) return Err('Subcategory not found');

    // Check for articles and kits
    const articles = await ArticleRepository.getBySubcategory(id);
    const kits = await KitRepository.getBySubcategory(id);

    if (articles.length > 0 || kits.length > 0) {
      return Err('Cannot delete subcategory with articles or kits');
    }

    await SubcategoryRepository.delete(id);
    await AuditService.log(context, 'ARCHIVE', 'LibrarySubcategory', id, `Deleted subcategory: ${subcategory.name}`);

    return Ok(undefined);
  },
};

// ============================================
// ARTICLE SERVICE
// ============================================

export const LibraryArticleService = {
  async getAll(): Promise<LibraryArticle[]> {
    return ArticleRepository.getAll();
  },

  async getById(id: string): Promise<LibraryArticle | null> {
    return ArticleRepository.getById(id);
  },

  async getByCode(code: string): Promise<LibraryArticle | null> {
    return ArticleRepository.getByCode(code);
  },

  async getBySubcategory(subcategoryId: string): Promise<LibraryArticle[]> {
    return ArticleRepository.getBySubcategory(subcategoryId);
  },

  async search(query: string): Promise<LibraryArticle[]> {
    return ArticleRepository.search(query);
  },

  async getWithCurrentVersion(articleId: string): Promise<ArticleWithVersion | null> {
    const article = await ArticleRepository.getById(articleId);
    if (!article || !article.currentVersionId) return null;

    const version = await ArticleVersionRepository.getById(article.currentVersionId);
    if (!version) return null;

    const subcategory = await SubcategoryRepository.getById(article.subcategoryId);
    if (!subcategory) return null;

    const category = await CategoryRepository.getById(subcategory.categoryId);
    if (!category) return null;

    return { article, version, category, subcategory };
  },

  async getAllWithApprovedVersions(): Promise<ArticleWithVersion[]> {
    const articles = await ArticleRepository.getAll();
    const results: ArticleWithVersion[] = [];

    for (const article of articles) {
      if (!article.currentVersionId) continue;

      const version = await ArticleVersionRepository.getById(article.currentVersionId);
      if (!version || version.status !== 'APPROVED') continue;

      const subcategory = await SubcategoryRepository.getById(article.subcategoryId);
      if (!subcategory) continue;

      const category = await CategoryRepository.getById(subcategory.categoryId);
      if (!category) continue;

      results.push({ article, version, category, subcategory });
    }

    return results;
  },

  async create(input: CreateArticleInput, context: AuditContext): Promise<Result<LibraryArticle, string>> {
    // Check code uniqueness
    const existing = await ArticleRepository.getByCode(input.code);
    if (existing) return Err(`Article with code ${input.code} already exists`);

    // Check subcategory exists
    const subcategory = await SubcategoryRepository.getById(input.subcategoryId);
    if (!subcategory) return Err('Subcategory not found');

    const articleId = generateUUID();
    const versionId = generateUUID();

    // Create initial version
    const version: ArticleVersion = {
      id: versionId,
      articleId,
      versionNumber: 1,
      status: 'DRAFT',
      sellPrice: input.sellPrice,
      costPrice: input.costPrice,
      vatRate: input.vatRate ?? 21,
      weightKg: input.weightKg,
      leadTimeDays: input.leadTimeDays,
      notes: input.notes,
      attachments: [],
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await ArticleVersionRepository.save(version);

    // Create article
    const article: LibraryArticle = {
      id: articleId,
      code: input.code,
      name: input.name,
      subcategoryId: input.subcategoryId,
      unit: input.unit,
      supplierId: input.supplierId,
      tags: input.tags,
      currentVersionId: versionId,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await ArticleRepository.save(article);
    await AuditService.logCreate(context, 'LibraryArticle', articleId, { code: input.code, name: input.name });

    return Ok(article);
  },

  async createVersion(articleId: string, input: CreateArticleVersionInput, context: AuditContext): Promise<Result<ArticleVersion, string>> {
    const article = await ArticleRepository.getById(articleId);
    if (!article) return Err('Article not found');

    const existingVersions = await ArticleVersionRepository.getByArticle(articleId);
    const nextVersionNumber = existingVersions.length > 0 ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1 : 1;

    const version: ArticleVersion = {
      id: generateUUID(),
      articleId,
      versionNumber: nextVersionNumber,
      status: 'DRAFT',
      sellPrice: input.sellPrice,
      costPrice: input.costPrice,
      vatRate: input.vatRate ?? 21,
      weightKg: input.weightKg,
      leadTimeDays: input.leadTimeDays,
      notes: input.notes,
      specs: input.specs,
      attachments: input.attachments || [],
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await ArticleVersionRepository.save(version);
    await AuditService.log(context, 'CREATE', 'ArticleVersion', version.id, `Created version ${nextVersionNumber} for article ${article.code}`);

    return Ok(version);
  },

  async approveVersion(versionId: string, context: AuditContext): Promise<Result<ArticleVersion, string>> {
    const version = await ArticleVersionRepository.getById(versionId);
    if (!version) return Err('Version not found');
    if (version.status !== 'DRAFT') return Err('Only draft versions can be approved');

    const article = await ArticleRepository.getById(version.articleId);
    if (!article) return Err('Article not found');

    // Deprecate current approved version
    if (article.currentVersionId && article.currentVersionId !== versionId) {
      const currentVersion = await ArticleVersionRepository.getById(article.currentVersionId);
      if (currentVersion && currentVersion.status === 'APPROVED') {
        await ArticleVersionRepository.save({
          ...currentVersion,
          status: 'DEPRECATED',
          updatedAt: now(),
          version: currentVersion.version + 1,
        });
      }
    }

    // Approve new version
    const approved: ArticleVersion = {
      ...version,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy: context.userId,
      updatedAt: now(),
      version: version.version + 1,
    };

    await ArticleVersionRepository.save(approved);

    // Update article's current version
    await ArticleRepository.save({
      ...article,
      currentVersionId: versionId,
      updatedAt: now(),
      version: article.version + 1,
    });

    await AuditService.log(context, 'APPROVE', 'ArticleVersion', versionId, `Approved version ${version.versionNumber} for article ${article.code}`);

    return Ok(approved);
  },

  async getVersions(articleId: string): Promise<ArticleVersion[]> {
    return ArticleVersionRepository.getByArticle(articleId);
  },

  async getVersionById(versionId: string): Promise<ArticleVersion | null> {
    return ArticleVersionRepository.getById(versionId);
  },

  /**
   * Add attachment to a draft article version
   * Attachments are versioned - once approved, they cannot be modified
   */
  async addAttachment(
    versionId: string,
    attachment: Omit<import('@/domain/models').ArticleAttachment, 'id' | 'uploadedAt' | 'uploadedBy'>,
    context: AuditContext
  ): Promise<Result<import('@/domain/models').ArticleAttachment, string>> {
    const version = await ArticleVersionRepository.getById(versionId);
    if (!version) return Err('Version not found');
    if (version.status !== 'DRAFT') return Err('Cannot add attachments to approved or deprecated versions');

    const article = await ArticleRepository.getById(version.articleId);
    if (!article) return Err('Article not found');

    const newAttachment: import('@/domain/models').ArticleAttachment = {
      id: generateUUID(),
      ...attachment,
      uploadedAt: now(),
      uploadedBy: context.userId,
    };

    const updatedVersion: ArticleVersion = {
      ...version,
      attachments: [...(version.attachments || []), newAttachment],
      updatedAt: now(),
      version: version.version + 1,
    };

    await ArticleVersionRepository.save(updatedVersion);
    await AuditService.log(
      context,
      'UPDATE',
      'ArticleVersion',
      versionId,
      `Added attachment "${attachment.filename}" to article ${article.code} v${version.versionNumber}`
    );

    return Ok(newAttachment);
  },

  /**
   * Remove attachment from a draft article version
   */
  async removeAttachment(
    versionId: string,
    attachmentId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const version = await ArticleVersionRepository.getById(versionId);
    if (!version) return Err('Version not found');
    if (version.status !== 'DRAFT') return Err('Cannot remove attachments from approved or deprecated versions');

    const attachment = version.attachments?.find((a) => a.id === attachmentId);
    if (!attachment) return Err('Attachment not found');

    const article = await ArticleRepository.getById(version.articleId);

    const updatedVersion: ArticleVersion = {
      ...version,
      attachments: version.attachments?.filter((a) => a.id !== attachmentId) || [],
      updatedAt: now(),
      version: version.version + 1,
    };

    await ArticleVersionRepository.save(updatedVersion);
    await AuditService.log(
      context,
      'UPDATE',
      'ArticleVersion',
      versionId,
      `Removed attachment "${attachment.filename}" from article ${article?.code || 'unknown'} v${version.versionNumber}`
    );

    return Ok(undefined);
  },

  /**
   * Update weight on a draft article version
   */
  async updateWeight(
    versionId: string,
    weightKg: number | undefined,
    context: AuditContext
  ): Promise<Result<ArticleVersion, string>> {
    const version = await ArticleVersionRepository.getById(versionId);
    if (!version) return Err('Version not found');
    if (version.status !== 'DRAFT') return Err('Cannot update approved or deprecated versions');

    const article = await ArticleRepository.getById(version.articleId);

    const updatedVersion: ArticleVersion = {
      ...version,
      weightKg,
      updatedAt: now(),
      version: version.version + 1,
    };

    await ArticleVersionRepository.save(updatedVersion);
    await AuditService.log(
      context,
      'UPDATE',
      'ArticleVersion',
      versionId,
      `Updated weight to ${weightKg ?? 'unset'} kg for article ${article?.code || 'unknown'} v${version.versionNumber}`
    );

    return Ok(updatedVersion);
  },
};

// ============================================
// KIT SERVICE
// ============================================

export const LibraryKitService = {
  async getAll(): Promise<LibraryKit[]> {
    return KitRepository.getAll();
  },

  async getById(id: string): Promise<LibraryKit | null> {
    return KitRepository.getById(id);
  },

  async getByCode(code: string): Promise<LibraryKit | null> {
    return KitRepository.getByCode(code);
  },

  async getBySubcategory(subcategoryId: string): Promise<LibraryKit[]> {
    return KitRepository.getBySubcategory(subcategoryId);
  },

  async search(query: string): Promise<LibraryKit[]> {
    return KitRepository.search(query);
  },

  async getWithCurrentVersion(kitId: string): Promise<KitWithVersion | null> {
    const kit = await KitRepository.getById(kitId);
    if (!kit || !kit.currentVersionId) return null;

    const version = await KitVersionRepository.getById(kit.currentVersionId);
    if (!version) return null;

    const subcategory = await SubcategoryRepository.getById(kit.subcategoryId);
    if (!subcategory) return null;

    const category = await CategoryRepository.getById(subcategory.categoryId);
    if (!category) return null;

    // Resolve components
    const components: KitWithVersion['components'] = [];
    for (const comp of version.components) {
      const articleVersion = await ArticleVersionRepository.getById(comp.articleVersionId);
      if (!articleVersion) continue;

      const article = await ArticleRepository.getById(articleVersion.articleId);
      if (!article) continue;

      components.push({
        articleVersion,
        article,
        qty: comp.qty,
        notes: comp.notes,
      });
    }

    return { kit, version, category, subcategory, components };
  },

  async getAllWithApprovedVersions(): Promise<KitWithVersion[]> {
    const kits = await KitRepository.getAll();
    const results: KitWithVersion[] = [];

    for (const kit of kits) {
      const withVersion = await this.getWithCurrentVersion(kit.id);
      if (withVersion && withVersion.version.status === 'APPROVED') {
        results.push(withVersion);
      }
    }

    return results;
  },

  async create(input: CreateKitInput, context: AuditContext): Promise<Result<LibraryKit, string>> {
    // Check code uniqueness
    const existing = await KitRepository.getByCode(input.code);
    if (existing) return Err(`Kit with code ${input.code} already exists`);

    // Check subcategory exists
    const subcategory = await SubcategoryRepository.getById(input.subcategoryId);
    if (!subcategory) return Err('Subcategory not found');

    // Validate components
    for (const comp of input.components) {
      const articleVersion = await ArticleVersionRepository.getById(comp.articleVersionId);
      if (!articleVersion) return Err(`Article version ${comp.articleVersionId} not found`);
      if (articleVersion.status !== 'APPROVED') return Err(`Article version ${comp.articleVersionId} is not approved`);
    }

    const kitId = generateUUID();
    const versionId = generateUUID();

    // Create initial version
    const version: KitVersion = {
      id: versionId,
      kitId,
      versionNumber: 1,
      status: 'DRAFT',
      sellPrice: input.sellPrice,
      costRollupMode: input.costRollupMode ?? 'SUM_COMPONENTS',
      manualCostPrice: input.manualCostPrice,
      components: input.components,
      explodeInBOM: input.explodeInBOM ?? true,
      salesOnly: input.salesOnly ?? false,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await KitVersionRepository.save(version);

    // Create kit
    const kit: LibraryKit = {
      id: kitId,
      code: input.code,
      name: input.name,
      subcategoryId: input.subcategoryId,
      currentVersionId: versionId,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await KitRepository.save(kit);
    await AuditService.logCreate(context, 'LibraryKit', kitId, { code: input.code, name: input.name });

    return Ok(kit);
  },

  async createVersion(kitId: string, input: CreateKitVersionInput, context: AuditContext): Promise<Result<KitVersion, string>> {
    const kit = await KitRepository.getById(kitId);
    if (!kit) return Err('Kit not found');

    // Validate components
    for (const comp of input.components) {
      const articleVersion = await ArticleVersionRepository.getById(comp.articleVersionId);
      if (!articleVersion) return Err(`Article version ${comp.articleVersionId} not found`);
      if (articleVersion.status !== 'APPROVED') return Err(`Article version ${comp.articleVersionId} is not approved`);
    }

    const existingVersions = await KitVersionRepository.getByKit(kitId);
    const nextVersionNumber = existingVersions.length > 0 ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1 : 1;

    const version: KitVersion = {
      id: generateUUID(),
      kitId,
      versionNumber: nextVersionNumber,
      status: 'DRAFT',
      sellPrice: input.sellPrice,
      costRollupMode: input.costRollupMode ?? 'SUM_COMPONENTS',
      manualCostPrice: input.manualCostPrice,
      components: input.components,
      explodeInBOM: input.explodeInBOM ?? true,
      salesOnly: input.salesOnly ?? false,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await KitVersionRepository.save(version);
    await AuditService.log(context, 'CREATE', 'KitVersion', version.id, `Created version ${nextVersionNumber} for kit ${kit.code}`);

    return Ok(version);
  },

  async approveVersion(versionId: string, context: AuditContext): Promise<Result<KitVersion, string>> {
    const version = await KitVersionRepository.getById(versionId);
    if (!version) return Err('Version not found');
    if (version.status !== 'DRAFT') return Err('Only draft versions can be approved');

    const kit = await KitRepository.getById(version.kitId);
    if (!kit) return Err('Kit not found');

    // Deprecate current approved version
    if (kit.currentVersionId && kit.currentVersionId !== versionId) {
      const currentVersion = await KitVersionRepository.getById(kit.currentVersionId);
      if (currentVersion && currentVersion.status === 'APPROVED') {
        await KitVersionRepository.save({
          ...currentVersion,
          status: 'DEPRECATED',
          updatedAt: now(),
          version: currentVersion.version + 1,
        });
      }
    }

    // Approve new version
    const approved: KitVersion = {
      ...version,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy: context.userId,
      updatedAt: now(),
      version: version.version + 1,
    };

    await KitVersionRepository.save(approved);

    // Update kit's current version
    await KitRepository.save({
      ...kit,
      currentVersionId: versionId,
      updatedAt: now(),
      version: kit.version + 1,
    });

    await AuditService.log(context, 'APPROVE', 'KitVersion', versionId, `Approved version ${version.versionNumber} for kit ${kit.code}`);

    return Ok(approved);
  },

  async getVersions(kitId: string): Promise<KitVersion[]> {
    return KitVersionRepository.getByKit(kitId);
  },

  async getVersionById(versionId: string): Promise<KitVersion | null> {
    return KitVersionRepository.getById(versionId);
  },

  /**
   * Calculate the cost of a kit version
   * Returns the sum of component costs or manual cost
   */
  async calculateCost(versionId: string): Promise<{ cost: number; missingCosts: string[] }> {
    const version = await KitVersionRepository.getById(versionId);
    if (!version) return { cost: 0, missingCosts: [] };

    if (version.costRollupMode === 'MANUAL') {
      return { cost: version.manualCostPrice ?? 0, missingCosts: [] };
    }

    let totalCost = 0;
    const missingCosts: string[] = [];

    for (const comp of version.components) {
      const articleVersion = await ArticleVersionRepository.getById(comp.articleVersionId);
      if (!articleVersion) continue;

      if (articleVersion.costPrice !== undefined) {
        totalCost += articleVersion.costPrice * comp.qty;
      } else {
        const article = await ArticleRepository.getById(articleVersion.articleId);
        missingCosts.push(article?.code || comp.articleVersionId);
      }
    }

    return { cost: totalCost, missingCosts };
  },
};

// ============================================
// SEEDING SERVICE
// ============================================

export const LibrarySeedService = {
  /**
   * Initialize the library with the default taxonomy
   * Only seeds if no categories exist
   */
  async initializeTaxonomy(context: AuditContext): Promise<void> {
    const existingCategories = await CategoryRepository.count();
    if (existingCategories > 0) {
      console.log('Library taxonomy already initialized');
      return;
    }

    console.log('Initializing library taxonomy...');

    for (let catIndex = 0; catIndex < INITIAL_TAXONOMY.length; catIndex++) {
      const catData = INITIAL_TAXONOMY[catIndex];

      // Create category
      const category: LibraryCategory = {
        id: generateUUID(),
        name: catData.name,
        sortOrder: catIndex,
        createdAt: now(),
        updatedAt: now(),
        version: 0,
      };

      await CategoryRepository.save(category);

      // Create subcategories
      for (let subIndex = 0; subIndex < catData.subcategories.length; subIndex++) {
        const subName = catData.subcategories[subIndex];

        const subcategory: LibrarySubcategory = {
          id: generateUUID(),
          categoryId: category.id,
          name: subName,
          sortOrder: subIndex,
          createdAt: now(),
          updatedAt: now(),
          version: 0,
        };

        await SubcategoryRepository.save(subcategory);
      }
    }

    await AuditService.log(context, 'CREATE', 'LibraryTaxonomy', 'seed', `Initialized library with ${INITIAL_TAXONOMY.length} categories`);

    console.log(`Library taxonomy initialized with ${INITIAL_TAXONOMY.length} categories`);
  },

  /**
   * Seed sample articles for testing
   */
  async seedSampleArticles(context: AuditContext): Promise<void> {
    const articles = await ArticleRepository.getAll();
    if (articles.length > 0) {
      console.log('Sample articles already exist');
      return;
    }

    // Get subcategories
    const subcategories = await SubcategoryRepository.getAll();
    const getSubcategoryByName = (name: string) => subcategories.find((s) => s.name === name);

    // Sample articles
    const sampleArticles: CreateArticleInput[] = [
      {
        code: 'PROP-MOTOR-E50',
        name: 'Electric Motor 50kW',
        subcategoryId: getSubcategoryByName('Electric motors & drives')?.id || '',
        unit: 'pcs',
        sellPrice: 12500,
        costPrice: 9800,
        tags: ['CE_CRITICAL'],
      },
      {
        code: 'PROP-MOTOR-E30',
        name: 'Electric Motor 30kW',
        subcategoryId: getSubcategoryByName('Electric motors & drives')?.id || '',
        unit: 'pcs',
        sellPrice: 8500,
        costPrice: 6200,
        tags: ['CE_CRITICAL'],
      },
      {
        code: 'ELEC-BAT-48V100',
        name: 'Battery Pack 48V 100Ah',
        subcategoryId: getSubcategoryByName('Battery packs')?.id || '',
        unit: 'pcs',
        sellPrice: 4500,
        costPrice: 3200,
        tags: ['CE_CRITICAL', 'SAFETY_CRITICAL'],
      },
      {
        code: 'ELEC-CHAR-3KW',
        name: 'Shore Charger 3kW',
        subcategoryId: getSubcategoryByName('Chargers')?.id || '',
        unit: 'pcs',
        sellPrice: 850,
        costPrice: 620,
      },
      {
        code: 'NAV-CHART-12',
        name: 'Chartplotter 12" Touchscreen',
        subcategoryId: getSubcategoryByName('Chartplotters & GPS')?.id || '',
        unit: 'pcs',
        sellPrice: 2200,
        costPrice: 1650,
      },
      {
        code: 'SAFE-LIFE-4P',
        name: 'Life Raft 4 Person',
        subcategoryId: getSubcategoryByName('Life-saving equipment')?.id || '',
        unit: 'pcs',
        sellPrice: 1800,
        costPrice: 1400,
        tags: ['SAFETY_CRITICAL'],
      },
    ];

    for (const input of sampleArticles) {
      if (!input.subcategoryId) continue;
      const result = await LibraryArticleService.create(input, context);
      if (result.ok) {
        // Auto-approve
        await LibraryArticleService.approveVersion(result.value.currentVersionId!, context);
      }
    }

    console.log(`Seeded ${sampleArticles.length} sample articles`);
  },
};
