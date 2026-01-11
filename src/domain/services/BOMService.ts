/**
 * BOM Service - v4
 * Generates Bill of Materials from project configuration
 * Uses Library v4 (Articles and Kits) for parts explosion
 */

import type {
  Project,
  BOMSnapshot,
  BOMItem,
  ConfigurationItem,
  ConfigurationItemType,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { ArticleVersionRepository, KitVersionRepository } from '@/data/repositories/LibraryV4Repository';
import { LibraryArticleService, LibraryKitService } from '@/domain/services/LibraryV4Service';
import { SettingsService } from '@/domain/services/SettingsService';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// LEGACY PARTS EXPLOSION (DEPRECATED)
// Only used as fallback for LEGACY itemType
// ============================================

interface LegacyPartDefinition {
  articleNumber: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  supplier?: string;
  leadTimeDays?: number;
}

/**
 * @deprecated Use Library v4 Kits instead
 * This mapping is only kept for backward compatibility with legacy items
 */
const LEGACY_PARTS_EXPLOSION: Record<string, LegacyPartDefinition[]> = {
  // Electric Motors
  'Electric Motor 20kW': [
    { articleNumber: 'EM-20-001', name: 'Electric Motor 20kW Unit', category: 'Propulsion', quantity: 1, unit: 'pcs', unitCost: 12000, supplier: 'Torqeedo', leadTimeDays: 21 },
    { articleNumber: 'EM-20-002', name: 'Motor Controller 20kW', category: 'Electronics', quantity: 1, unit: 'pcs', unitCost: 3500, supplier: 'Torqeedo', leadTimeDays: 21 },
  ],
  'Electric Motor 40kW': [
    { articleNumber: 'EM-40-001', name: 'Electric Motor 40kW Unit', category: 'Propulsion', quantity: 1, unit: 'pcs', unitCost: 24000, supplier: 'Torqeedo', leadTimeDays: 28 },
    { articleNumber: 'EM-40-002', name: 'Motor Controller 40kW', category: 'Electronics', quantity: 1, unit: 'pcs', unitCost: 6500, supplier: 'Torqeedo', leadTimeDays: 28 },
  ],
  'Battery Pack 40kWh': [
    { articleNumber: 'BAT-40-001', name: 'Battery Module 10kWh', category: 'Energy Storage', quantity: 4, unit: 'pcs', unitCost: 4800, supplier: 'Super B', leadTimeDays: 35 },
    { articleNumber: 'BAT-40-002', name: 'Battery Management System', category: 'Electronics', quantity: 1, unit: 'pcs', unitCost: 1800, supplier: 'Super B', leadTimeDays: 21 },
  ],
  'Battery Pack 80kWh': [
    { articleNumber: 'BAT-80-001', name: 'Battery Module 10kWh', category: 'Energy Storage', quantity: 8, unit: 'pcs', unitCost: 4800, supplier: 'Super B', leadTimeDays: 35 },
    { articleNumber: 'BAT-80-002', name: 'Battery Management System Pro', category: 'Electronics', quantity: 1, unit: 'pcs', unitCost: 2800, supplier: 'Super B', leadTimeDays: 21 },
  ],
};

// Default fallback ratio if settings not available
const DEFAULT_ESTIMATION_RATIO = 0.6;

// ============================================
// BOM SERVICE
// ============================================

export const BOMService = {
  /**
   * Get the cost estimation ratio from settings
   */
  async getEstimationRatio(): Promise<number> {
    try {
      return await SettingsService.getCostEstimationRatio();
    } catch {
      return DEFAULT_ESTIMATION_RATIO;
    }
  },

  /**
   * Generate BOM from current configuration
   * Called when project transitions to ORDER_CONFIRMED
   */
  async generateBOM(
    projectId: string,
    context: AuditContext,
    trigger: 'ORDER_CONFIRMED' | 'AMENDMENT' | 'MANUAL' = 'MANUAL'
  ): Promise<Result<BOMSnapshot, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Get the cost estimation ratio from settings
    const estimationRatio = await this.getEstimationRatio();

    // Find the configuration snapshot to use
    const configSnapshotId = project.configurationSnapshots.length > 0
      ? project.configurationSnapshots[project.configurationSnapshots.length - 1].id
      : 'current';

    // Explode configuration items to BOM items (async to load Kit/Article versions)
    const bomItems = await this.expandToBOMItemsAsync(project.configuration.items, estimationRatio);

    // Calculate totals
    const totalParts = bomItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalCostExclVat = bomItems.reduce((sum, item) => sum + item.totalCost, 0);

    // Calculate estimation summary
    const estimatedItems = bomItems.filter(item => item.isEstimated);
    const estimatedCostCount = estimatedItems.length;
    const estimatedCostTotal = estimatedItems.reduce((sum, item) => sum + item.totalCost, 0);
    const actualCostTotal = totalCostExclVat - estimatedCostTotal;

    const snapshotNumber = project.bomSnapshots.length + 1;

    const bomSnapshot: BOMSnapshot = {
      id: generateUUID(),
      projectId,
      snapshotNumber,
      configurationSnapshotId: configSnapshotId,
      items: bomItems,
      totalParts,
      totalCostExclVat,
      // Cost estimation summary
      estimatedCostCount,
      estimatedCostTotal,
      actualCostTotal,
      costEstimationRatio: estimationRatio,
      status: 'BASELINE',
      createdAt: now(),
      createdBy: context.userId,
    };

    const updated = await ProjectRepository.update(projectId, {
      bomSnapshots: [...project.bomSnapshots, bomSnapshot],
    });

    if (!updated) {
      return Err('Failed to save BOM snapshot');
    }

    await AuditService.log(
      context,
      'GENERATE_DOCUMENT',
      'BOMSnapshot',
      bomSnapshot.id,
      `Generated BOM Baseline #${snapshotNumber} with ${totalParts} parts (${trigger}). ${estimatedCostCount} items estimated at ${Math.round(estimationRatio * 100)}%.`
    );

    return Ok(bomSnapshot);
  },

  /**
   * Expand configuration items to BOM items using Library v4
   * Handles ARTICLE, KIT, CUSTOM, and LEGACY item types
   */
  async expandToBOMItemsAsync(
    configItems: ConfigurationItem[],
    estimationRatio: number = DEFAULT_ESTIMATION_RATIO
  ): Promise<BOMItem[]> {
    const itemMap = new Map<string, BOMItem>();

    for (const configItem of configItems.filter(i => i.isIncluded)) {
      const itemType = configItem.itemType || 'LEGACY'; // Default to LEGACY for old items

      switch (itemType) {
        case 'ARTICLE':
          await this.expandArticleItem(configItem, itemMap, estimationRatio);
          break;

        case 'KIT':
          await this.expandKitItem(configItem, itemMap, estimationRatio);
          break;

        case 'CUSTOM':
          this.expandCustomItem(configItem, itemMap, estimationRatio);
          break;

        case 'LEGACY':
        default:
          this.expandLegacyItem(configItem, itemMap, estimationRatio);
          break;
      }
    }

    // Sort by category then name
    return Array.from(itemMap.values()).sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  },

  /**
   * Expand an ARTICLE item - include directly in BOM
   */
  async expandArticleItem(
    configItem: ConfigurationItem,
    itemMap: Map<string, BOMItem>,
    estimationRatio: number
  ): Promise<void> {
    if (!configItem.articleVersionId) {
      // Fallback to treating as custom item
      this.expandCustomItem(configItem, itemMap, estimationRatio);
      return;
    }

    const articleVersion = await ArticleVersionRepository.getById(configItem.articleVersionId);
    if (!articleVersion) {
      console.warn(`Article version ${configItem.articleVersionId} not found, treating as custom`);
      this.expandCustomItem(configItem, itemMap, estimationRatio);
      return;
    }

    // Get article for code
    const article = configItem.articleId
      ? await LibraryArticleService.getById(configItem.articleId)
      : null;

    const key = configItem.articleVersionId;
    const quantity = configItem.quantity;

    // Determine if cost is estimated
    const hasActualCost = !!articleVersion.costPrice;
    const unitCost = hasActualCost
      ? articleVersion.costPrice!
      : Math.round(articleVersion.sellPrice * estimationRatio);
    const totalCost = quantity * unitCost;

    if (itemMap.has(key)) {
      // Aggregate quantities for same article
      const existing = itemMap.get(key)!;
      existing.quantity += quantity;
      existing.totalCost += totalCost;
    } else {
      const bomItem: BOMItem = {
        id: generateUUID(),
        category: configItem.category,
        articleNumber: article?.code || configItem.articleNumber,
        name: configItem.name,
        description: configItem.description,
        quantity,
        unit: configItem.unit,
        unitCost,
        totalCost,
        leadTimeDays: articleVersion.leadTimeDays,
        // Estimation tracking
        isEstimated: !hasActualCost,
        estimationRatio: !hasActualCost ? estimationRatio : undefined,
        sellPrice: !hasActualCost ? articleVersion.sellPrice : undefined,
        // Article reference for click-through
        articleVersionId: configItem.articleVersionId,
        articleId: configItem.articleId,
      };
      itemMap.set(key, bomItem);
    }
  },

  /**
   * Expand a KIT item - explode components into individual article lines
   * If salesOnly flag is set, treat as single line item
   */
  async expandKitItem(
    configItem: ConfigurationItem,
    itemMap: Map<string, BOMItem>,
    estimationRatio: number
  ): Promise<void> {
    if (!configItem.kitVersionId) {
      // Fallback to treating as custom item
      this.expandCustomItem(configItem, itemMap, estimationRatio);
      return;
    }

    const kitVersion = await KitVersionRepository.getById(configItem.kitVersionId);
    if (!kitVersion) {
      console.warn(`Kit version ${configItem.kitVersionId} not found, treating as custom`);
      this.expandCustomItem(configItem, itemMap, estimationRatio);
      return;
    }

    // Check if kit should be exploded in BOM
    if (!kitVersion.explodeInBOM || kitVersion.salesOnly) {
      // Include as single line item (no explosion)
      const key = `kit-${configItem.kitVersionId}`;
      const quantity = configItem.quantity;

      // Calculate kit cost
      const { cost } = await LibraryKitService.calculateCost(configItem.kitVersionId);
      const hasActualCost = kitVersion.costRollupMode === 'MANUAL' && !!kitVersion.manualCostPrice;
      const unitCost = hasActualCost
        ? kitVersion.manualCostPrice!
        : cost || Math.round(kitVersion.sellPrice * estimationRatio);
      const totalCost = quantity * unitCost;

      if (itemMap.has(key)) {
        const existing = itemMap.get(key)!;
        existing.quantity += quantity;
        existing.totalCost += totalCost;
      } else {
        const kit = configItem.kitId
          ? await LibraryKitService.getById(configItem.kitId)
          : null;

        const bomItem: BOMItem = {
          id: generateUUID(),
          category: configItem.category,
          articleNumber: kit?.code || configItem.articleNumber,
          name: configItem.name,
          description: `Kit (${kitVersion.components.length} components)`,
          quantity,
          unit: 'set',
          unitCost,
          totalCost,
          // Estimation tracking
          isEstimated: !hasActualCost && !cost,
          estimationRatio: !hasActualCost && !cost ? estimationRatio : undefined,
          sellPrice: !hasActualCost && !cost ? kitVersion.sellPrice : undefined,
        };
        itemMap.set(key, bomItem);
      }
      return;
    }

    // Explode kit components into individual BOM lines
    for (const component of kitVersion.components) {
      const articleVersion = await ArticleVersionRepository.getById(component.articleVersionId);
      if (!articleVersion) {
        console.warn(`Component article version ${component.articleVersionId} not found`);
        continue;
      }

      const article = await LibraryArticleService.getById(articleVersion.articleId);
      if (!article) {
        console.warn(`Component article ${articleVersion.articleId} not found`);
        continue;
      }

      const key = component.articleVersionId;
      const quantity = component.qty * configItem.quantity;
      const hasActualCost = !!articleVersion.costPrice;
      const unitCost = hasActualCost
        ? articleVersion.costPrice!
        : Math.round(articleVersion.sellPrice * estimationRatio);
      const totalCost = quantity * unitCost;

      if (itemMap.has(key)) {
        // Aggregate quantities for same article across kits
        const existing = itemMap.get(key)!;
        existing.quantity += quantity;
        existing.totalCost += totalCost;
      } else {
        const bomItem: BOMItem = {
          id: generateUUID(),
          category: configItem.category,
          articleNumber: article.code,
          name: article.name,
          description: component.notes || `From kit: ${configItem.name}`,
          quantity,
          unit: article.unit,
          unitCost,
          totalCost,
          leadTimeDays: articleVersion.leadTimeDays,
          // Estimation tracking
          isEstimated: !hasActualCost,
          estimationRatio: !hasActualCost ? estimationRatio : undefined,
          sellPrice: !hasActualCost ? articleVersion.sellPrice : undefined,
          // Article reference for click-through
          articleVersionId: component.articleVersionId,
          articleId: article.id,
        };
        itemMap.set(key, bomItem);
      }
    }
  },

  /**
   * Expand a CUSTOM item - estimate cost using configurable ratio
   */
  expandCustomItem(
    configItem: ConfigurationItem,
    itemMap: Map<string, BOMItem>,
    estimationRatio: number
  ): void {
    const key = `custom-${configItem.id}`;
    const unitCost = Math.round(configItem.unitPriceExclVat * estimationRatio);
    const totalCost = unitCost * configItem.quantity;

    if (itemMap.has(key)) {
      const existing = itemMap.get(key)!;
      existing.quantity += configItem.quantity;
      existing.totalCost += totalCost;
    } else {
      const bomItem: BOMItem = {
        id: generateUUID(),
        category: configItem.category,
        articleNumber: configItem.articleNumber,
        name: configItem.name,
        description: configItem.description,
        quantity: configItem.quantity,
        unit: configItem.unit,
        unitCost,
        totalCost,
        // Custom items are always estimated
        isEstimated: true,
        estimationRatio,
        sellPrice: configItem.unitPriceExclVat,
      };
      itemMap.set(key, bomItem);
    }
  },

  /**
   * Expand a LEGACY item - use hardcoded PARTS_EXPLOSION if available
   * @deprecated Use Library v4 Kits/Articles instead
   */
  expandLegacyItem(
    configItem: ConfigurationItem,
    itemMap: Map<string, BOMItem>,
    estimationRatio: number
  ): void {
    const partsDefinition = LEGACY_PARTS_EXPLOSION[configItem.name];

    if (partsDefinition) {
      // Expand using legacy mapping (legacy parts have actual costs defined)
      for (const part of partsDefinition) {
        const key = part.articleNumber;
        const quantity = part.quantity * configItem.quantity;
        const totalCost = quantity * part.unitCost;

        if (itemMap.has(key)) {
          const existing = itemMap.get(key)!;
          existing.quantity += quantity;
          existing.totalCost += totalCost;
        } else {
          const bomItem: BOMItem = {
            id: generateUUID(),
            category: part.category,
            articleNumber: part.articleNumber,
            name: part.name,
            description: `From: ${configItem.name} (legacy)`,
            quantity,
            unit: part.unit,
            unitCost: part.unitCost,
            totalCost,
            supplier: part.supplier,
            leadTimeDays: part.leadTimeDays,
            // Legacy parts with explicit costs are not estimated
            isEstimated: false,
          };
          itemMap.set(key, bomItem);
        }
      }
    } else {
      // No explosion defined - use item as-is (like custom)
      this.expandCustomItem(configItem, itemMap, estimationRatio);
    }
  },

  /**
   * Synchronous wrapper for backward compatibility
   * @deprecated Use expandToBOMItemsAsync instead
   */
  expandToBOMItems(configItems: ConfigurationItem[]): BOMItem[] {
    // Sync fallback - only handles LEGACY and CUSTOM items
    const itemMap = new Map<string, BOMItem>();
    const estimationRatio = DEFAULT_ESTIMATION_RATIO;

    for (const configItem of configItems.filter(i => i.isIncluded)) {
      const itemType = configItem.itemType || 'LEGACY';

      if (itemType === 'ARTICLE' || itemType === 'KIT') {
        // Can't load async data in sync context - treat as custom
        this.expandCustomItem(configItem, itemMap, estimationRatio);
      } else if (itemType === 'CUSTOM') {
        this.expandCustomItem(configItem, itemMap, estimationRatio);
      } else {
        this.expandLegacyItem(configItem, itemMap, estimationRatio);
      }
    }

    return Array.from(itemMap.values()).sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  },

  /**
   * Get the latest BOM snapshot for a project
   */
  async getLatestBOM(projectId: string): Promise<BOMSnapshot | null> {
    const project = await ProjectRepository.getById(projectId);
    if (!project || project.bomSnapshots.length === 0) {
      return null;
    }

    return project.bomSnapshots[project.bomSnapshots.length - 1];
  },

  /**
   * Get all BOM snapshots for a project
   */
  async getAllBOMs(projectId: string): Promise<BOMSnapshot[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return [];
    }

    return project.bomSnapshots;
  },

  /**
   * Export BOM to CSV format with estimation tracking
   */
  exportToCSV(bom: BOMSnapshot): string {
    const headers = [
      'Article Number',
      'Name',
      'Category',
      'Description',
      'Quantity',
      'Unit',
      'Unit Cost',
      'Total Cost',
      'Cost Type',
      'Estimation Ratio',
      'Sell Price (if estimated)',
      'Supplier',
      'Lead Time (days)',
    ];

    const rows = bom.items.map(item => [
      item.articleNumber || '',
      item.name,
      item.category,
      item.description || '',
      String(item.quantity),
      item.unit,
      String(item.unitCost),
      String(item.totalCost),
      item.isEstimated ? 'ESTIMATED' : 'ACTUAL',
      item.isEstimated && item.estimationRatio ? `${Math.round(item.estimationRatio * 100)}%` : '',
      item.sellPrice ? String(item.sellPrice) : '',
      item.supplier || '',
      item.leadTimeDays ? String(item.leadTimeDays) : '',
    ]);

    // Add summary row
    const estimatedTotal = bom.estimatedCostTotal || 0;
    const actualTotal = bom.actualCostTotal || 0;
    rows.push([]);
    rows.push(['SUMMARY', '', '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Total Cost (excl. VAT)', '', '', '', '', '', '', String(bom.totalCostExclVat), '', '', '', '', '']);
    rows.push(['Actual Cost Total', '', '', '', '', '', '', String(actualTotal), 'ACTUAL', '', '', '', '']);
    rows.push(['Estimated Cost Total', '', '', '', '', '', '', String(estimatedTotal), 'ESTIMATED', `${Math.round((bom.costEstimationRatio || 0.6) * 100)}%`, '', '', '']);
    rows.push(['Items with Estimated Cost', '', '', '', '', '', '', String(bom.estimatedCostCount || 0), '', '', '', '', '']);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csvContent;
  },

  /**
   * Get estimation summary for a BOM
   */
  getEstimationSummary(bom: BOMSnapshot): {
    totalItems: number;
    estimatedCount: number;
    estimatedPercent: number;
    estimatedValue: number;
    estimatedValuePercent: number;
    actualValue: number;
    ratio: number;
    isHighEstimation: boolean;
  } {
    const estimatedCount = bom.estimatedCostCount || bom.items.filter(i => i.isEstimated).length;
    const estimatedValue = bom.estimatedCostTotal || bom.items.filter(i => i.isEstimated).reduce((sum, i) => sum + i.totalCost, 0);
    const actualValue = bom.actualCostTotal || (bom.totalCostExclVat - estimatedValue);
    const ratio = bom.costEstimationRatio || DEFAULT_ESTIMATION_RATIO;

    const totalItems = bom.items.length;
    const estimatedPercent = totalItems > 0 ? Math.round((estimatedCount / totalItems) * 100) : 0;
    const estimatedValuePercent = bom.totalCostExclVat > 0 ? Math.round((estimatedValue / bom.totalCostExclVat) * 100) : 0;

    // Check if estimation is high (default threshold: 30%)
    const isHighEstimation = estimatedValuePercent > 30;

    return {
      totalItems,
      estimatedCount,
      estimatedPercent,
      estimatedValue,
      estimatedValuePercent,
      actualValue,
      ratio,
      isHighEstimation,
    };
  },

  /**
   * Calculate cost summary by category
   */
  getCostSummaryByCategory(bom: BOMSnapshot): { category: string; cost: number; percentage: number; estimatedCost: number }[] {
    const categoryTotals = new Map<string, { cost: number; estimatedCost: number }>();

    for (const item of bom.items) {
      const current = categoryTotals.get(item.category) || { cost: 0, estimatedCost: 0 };
      current.cost += item.totalCost;
      if (item.isEstimated) {
        current.estimatedCost += item.totalCost;
      }
      categoryTotals.set(item.category, current);
    }

    const total = bom.totalCostExclVat;

    return Array.from(categoryTotals.entries())
      .map(([category, { cost, estimatedCost }]) => ({
        category,
        cost,
        percentage: total > 0 ? Math.round((cost / total) * 1000) / 10 : 0,
        estimatedCost,
      }))
      .sort((a, b) => b.cost - a.cost);
  },

  /**
   * Get critical path items (longest lead times)
   */
  getCriticalPathItems(bom: BOMSnapshot, limit = 5): BOMItem[] {
    return [...bom.items]
      .filter(item => item.leadTimeDays && item.leadTimeDays > 0)
      .sort((a, b) => (b.leadTimeDays || 0) - (a.leadTimeDays || 0))
      .slice(0, limit);
  },

  /**
   * Calculate margin (sell price vs cost)
   */
  async calculateMargin(projectId: string): Promise<{
    sellPrice: number;
    cost: number;
    margin: number;
    marginPercent: number;
    estimatedCostPercent: number;
  } | null> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return null;

    const latestBOM = await this.getLatestBOM(projectId);
    if (!latestBOM) return null;

    const sellPrice = project.configuration.totalExclVat;
    const cost = latestBOM.totalCostExclVat;
    const margin = sellPrice - cost;
    const marginPercent = sellPrice > 0 ? Math.round((margin / sellPrice) * 1000) / 10 : 0;
    const estimatedCostPercent = cost > 0
      ? Math.round(((latestBOM.estimatedCostTotal || 0) / cost) * 100)
      : 0;

    return { sellPrice, cost, margin, marginPercent, estimatedCostPercent };
  },
};
