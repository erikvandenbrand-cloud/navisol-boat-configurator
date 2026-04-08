/**
 * Library v4 Repository
 * Persistence layer for the new hierarchical library structure
 */

import type {
  LibraryCategory,
  LibrarySubcategory,
  LibraryArticle,
  ArticleVersion,
  LibraryKit,
  KitVersion,
} from '@/domain/models';
import { getAdapter } from '@/data/persistence';

// ============================================
// NAMESPACES
// ============================================

const NS = {
  CATEGORIES: 'library_categories',
  SUBCATEGORIES: 'library_subcategories',
  ARTICLES: 'library_articles',
  ARTICLE_VERSIONS: 'library_article_versions',
  KITS: 'library_kits',
  KIT_VERSIONS: 'library_kit_versions',
} as const;

// ============================================
// CATEGORY REPOSITORY
// ============================================

export const CategoryRepository = {
  async getAll(): Promise<LibraryCategory[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<LibraryCategory>(NS.CATEGORIES);
    return all.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getById(id: string): Promise<LibraryCategory | null> {
    const adapter = getAdapter();
    return adapter.getById<LibraryCategory>(NS.CATEGORIES, id);
  },

  async save(category: LibraryCategory): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NS.CATEGORIES, category);
  },

  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(NS.CATEGORIES, id);
  },

  async count(): Promise<number> {
    const adapter = getAdapter();
    return adapter.count(NS.CATEGORIES);
  },
};

// ============================================
// SUBCATEGORY REPOSITORY
// ============================================

export const SubcategoryRepository = {
  async getAll(): Promise<LibrarySubcategory[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<LibrarySubcategory>(NS.SUBCATEGORIES);
    return all.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getByCategory(categoryId: string): Promise<LibrarySubcategory[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<LibrarySubcategory>(NS.SUBCATEGORIES);
    return all
      .filter((s) => s.categoryId === categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getById(id: string): Promise<LibrarySubcategory | null> {
    const adapter = getAdapter();
    return adapter.getById<LibrarySubcategory>(NS.SUBCATEGORIES, id);
  },

  async save(subcategory: LibrarySubcategory): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NS.SUBCATEGORIES, subcategory);
  },

  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(NS.SUBCATEGORIES, id);
  },
};

// ============================================
// ARTICLE REPOSITORY
// ============================================

export const ArticleRepository = {
  async getAll(): Promise<LibraryArticle[]> {
    const adapter = getAdapter();
    return adapter.getAll<LibraryArticle>(NS.ARTICLES);
  },

  async getBySubcategory(subcategoryId: string): Promise<LibraryArticle[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<LibraryArticle>(NS.ARTICLES);
    return all.filter((a) => a.subcategoryId === subcategoryId);
  },

  async getById(id: string): Promise<LibraryArticle | null> {
    const adapter = getAdapter();
    return adapter.getById<LibraryArticle>(NS.ARTICLES, id);
  },

  async getByCode(code: string): Promise<LibraryArticle | null> {
    const adapter = getAdapter();
    const all = await adapter.getAll<LibraryArticle>(NS.ARTICLES);
    return all.find((a) => a.code === code) || null;
  },

  async save(article: LibraryArticle): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NS.ARTICLES, article);
  },

  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(NS.ARTICLES, id);
  },

  async search(query: string): Promise<LibraryArticle[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<LibraryArticle>(NS.ARTICLES);
    const lowerQuery = query.toLowerCase();
    return all.filter(
      (a) =>
        a.code.toLowerCase().includes(lowerQuery) ||
        a.name.toLowerCase().includes(lowerQuery)
    );
  },
};

// ============================================
// ARTICLE VERSION REPOSITORY
// ============================================

export const ArticleVersionRepository = {
  async getAll(): Promise<ArticleVersion[]> {
    const adapter = getAdapter();
    return adapter.getAll<ArticleVersion>(NS.ARTICLE_VERSIONS);
  },

  async getByArticle(articleId: string): Promise<ArticleVersion[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<ArticleVersion>(NS.ARTICLE_VERSIONS);
    return all
      .filter((v) => v.articleId === articleId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  },

  async getById(id: string): Promise<ArticleVersion | null> {
    const adapter = getAdapter();
    return adapter.getById<ArticleVersion>(NS.ARTICLE_VERSIONS, id);
  },

  async getApproved(): Promise<ArticleVersion[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<ArticleVersion>(NS.ARTICLE_VERSIONS);
    return all.filter((v) => v.status === 'APPROVED');
  },

  async save(version: ArticleVersion): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NS.ARTICLE_VERSIONS, version);
  },

  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(NS.ARTICLE_VERSIONS, id);
  },
};

// ============================================
// KIT REPOSITORY
// ============================================

export const KitRepository = {
  async getAll(): Promise<LibraryKit[]> {
    const adapter = getAdapter();
    return adapter.getAll<LibraryKit>(NS.KITS);
  },

  async getBySubcategory(subcategoryId: string): Promise<LibraryKit[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<LibraryKit>(NS.KITS);
    return all.filter((k) => k.subcategoryId === subcategoryId);
  },

  async getById(id: string): Promise<LibraryKit | null> {
    const adapter = getAdapter();
    return adapter.getById<LibraryKit>(NS.KITS, id);
  },

  async getByCode(code: string): Promise<LibraryKit | null> {
    const adapter = getAdapter();
    const all = await adapter.getAll<LibraryKit>(NS.KITS);
    return all.find((k) => k.code === code) || null;
  },

  async save(kit: LibraryKit): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NS.KITS, kit);
  },

  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(NS.KITS, id);
  },

  async search(query: string): Promise<LibraryKit[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<LibraryKit>(NS.KITS);
    const lowerQuery = query.toLowerCase();
    return all.filter(
      (k) =>
        k.code.toLowerCase().includes(lowerQuery) ||
        k.name.toLowerCase().includes(lowerQuery)
    );
  },
};

// ============================================
// KIT VERSION REPOSITORY
// ============================================

export const KitVersionRepository = {
  async getAll(): Promise<KitVersion[]> {
    const adapter = getAdapter();
    return adapter.getAll<KitVersion>(NS.KIT_VERSIONS);
  },

  async getByKit(kitId: string): Promise<KitVersion[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<KitVersion>(NS.KIT_VERSIONS);
    return all
      .filter((v) => v.kitId === kitId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  },

  async getById(id: string): Promise<KitVersion | null> {
    const adapter = getAdapter();
    return adapter.getById<KitVersion>(NS.KIT_VERSIONS, id);
  },

  async getApproved(): Promise<KitVersion[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<KitVersion>(NS.KIT_VERSIONS);
    return all.filter((v) => v.status === 'APPROVED');
  },

  async save(version: KitVersion): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NS.KIT_VERSIONS, version);
  },

  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(NS.KIT_VERSIONS, id);
  },
};
