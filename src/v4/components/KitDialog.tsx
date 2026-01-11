'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, X, Search, AlertTriangle, Trash2 } from 'lucide-react';
import type {
  LibraryKit,
  KitVersion,
  KitComponent,
  LibrarySubcategory,
  LibraryCategory,
  LibraryArticle,
  ArticleVersion,
  CreateKitInput,
  CreateKitVersionInput,
  CostRollupMode,
} from '@/domain/models';
import {
  LibraryKitService,
  LibraryCategoryService,
  LibrarySubcategoryService,
  LibraryArticleService,
} from '@/domain/services';
import { ArticleVersionRepository } from '@/data/repositories/LibraryV4Repository';
import { getDefaultAuditContext } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface KitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'new-version';
  kit?: LibraryKit | null;
  version?: KitVersion | null;
  onSaved: () => void;
}

interface ComponentWithDetails {
  articleVersionId: string;
  qty: number;
  notes?: string;
  articleCode: string;
  articleName: string;
  unitPrice: number;
}

export function KitDialog({
  open,
  onOpenChange,
  mode,
  kit,
  version,
  onSaved,
}: KitDialogProps) {
  // Category/subcategory state
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [subcategories, setSubcategories] = useState<LibrarySubcategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [filteredSubcategories, setFilteredSubcategories] = useState<LibrarySubcategory[]>([]);

  // Available articles for adding to kit
  const [availableArticles, setAvailableArticles] = useState<{
    article: LibraryArticle;
    version: ArticleVersion;
  }[]>([]);
  const [articleSearchQuery, setArticleSearchQuery] = useState('');

  // Kit state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  // Version state
  const [sellPrice, setSellPrice] = useState('');
  const [costRollupMode, setCostRollupMode] = useState<CostRollupMode>('SUM_COMPONENTS');
  const [manualCostPrice, setManualCostPrice] = useState('');
  const [explodeInBOM, setExplodeInBOM] = useState(true);
  const [salesOnly, setSalesOnly] = useState(false);
  const [components, setComponents] = useState<ComponentWithDetails[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArticlePicker, setShowArticlePicker] = useState(false);

  useEffect(() => {
    loadCategoriesAndSubcategories();
    loadAvailableArticles();
  }, []);

  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        resetForm();
      } else if (kit && version) {
        // Populate form from existing kit/version
        setCode(kit.code);
        setName(kit.name);
        setSubcategoryId(kit.subcategoryId);

        setSellPrice(version.sellPrice.toString());
        setCostRollupMode(version.costRollupMode);
        setManualCostPrice(version.manualCostPrice?.toString() || '');
        setExplodeInBOM(version.explodeInBOM);
        setSalesOnly(version.salesOnly);

        // Load component details
        loadComponentDetails(version.components);

        // Find category from subcategory
        const subcategory = subcategories.find(s => s.id === kit.subcategoryId);
        if (subcategory) {
          setSelectedCategoryId(subcategory.categoryId);
        }
      }
    }
  }, [open, mode, kit, version, subcategories]);

  useEffect(() => {
    // Filter subcategories based on selected category
    if (selectedCategoryId) {
      setFilteredSubcategories(subcategories.filter(s => s.categoryId === selectedCategoryId));
    } else {
      setFilteredSubcategories([]);
    }
  }, [selectedCategoryId, subcategories]);

  async function loadCategoriesAndSubcategories() {
    try {
      const [cats, subs] = await Promise.all([
        LibraryCategoryService.getAll(),
        LibrarySubcategoryService.getAll(),
      ]);
      setCategories(cats);
      setSubcategories(subs);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  async function loadAvailableArticles() {
    try {
      const articles = await LibraryArticleService.getAllWithApprovedVersions();
      setAvailableArticles(articles.map(a => ({ article: a.article, version: a.version })));
    } catch (err) {
      console.error('Failed to load articles:', err);
    }
  }

  async function loadComponentDetails(comps: KitComponent[]) {
    const details: ComponentWithDetails[] = [];

    for (const comp of comps) {
      const articleVersion = await ArticleVersionRepository.getById(comp.articleVersionId);
      if (!articleVersion) continue;

      const article = await LibraryArticleService.getById(articleVersion.articleId);
      if (!article) continue;

      details.push({
        articleVersionId: comp.articleVersionId,
        qty: comp.qty,
        notes: comp.notes,
        articleCode: article.code,
        articleName: article.name,
        unitPrice: articleVersion.sellPrice,
      });
    }

    setComponents(details);
  }

  function resetForm() {
    setCode('');
    setName('');
    setSubcategoryId('');
    setSelectedCategoryId('');
    setSellPrice('');
    setCostRollupMode('SUM_COMPONENTS');
    setManualCostPrice('');
    setExplodeInBOM(true);
    setSalesOnly(false);
    setComponents([]);
    setError(null);
    setShowArticlePicker(false);
    setArticleSearchQuery('');
  }

  function addComponent(article: LibraryArticle, version: ArticleVersion) {
    // Check if already added
    if (components.some(c => c.articleVersionId === version.id)) {
      return;
    }

    setComponents(prev => [
      ...prev,
      {
        articleVersionId: version.id,
        qty: 1,
        articleCode: article.code,
        articleName: article.name,
        unitPrice: version.sellPrice,
      },
    ]);
    setShowArticlePicker(false);
    setArticleSearchQuery('');
  }

  function updateComponentQty(articleVersionId: string, qty: number) {
    setComponents(prev =>
      prev.map(c =>
        c.articleVersionId === articleVersionId ? { ...c, qty: Math.max(1, qty) } : c
      )
    );
  }

  function removeComponent(articleVersionId: string) {
    setComponents(prev => prev.filter(c => c.articleVersionId !== articleVersionId));
  }

  // Calculate total cost from components
  const componentTotalCost = components.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);

  // Filter articles for picker
  const filteredArticles = availableArticles.filter(({ article }) => {
    if (!articleSearchQuery) return true;
    const query = articleSearchQuery.toLowerCase();
    return (
      article.code.toLowerCase().includes(query) ||
      article.name.toLowerCase().includes(query)
    );
  });

  async function handleSave() {
    setIsLoading(true);
    setError(null);

    try {
      const context = getDefaultAuditContext();
      const sellPriceNum = parseFloat(sellPrice);
      const manualCostPriceNum = manualCostPrice ? parseFloat(manualCostPrice) : undefined;

      if (isNaN(sellPriceNum) || sellPriceNum < 0) {
        setError('Please enter a valid sell price');
        setIsLoading(false);
        return;
      }

      const kitComponents: KitComponent[] = components.map(c => ({
        articleVersionId: c.articleVersionId,
        qty: c.qty,
        notes: c.notes,
      }));

      if (mode === 'create') {
        if (!code || !name || !subcategoryId) {
          setError('Please fill in all required fields');
          setIsLoading(false);
          return;
        }

        if (components.length === 0) {
          setError('Please add at least one component');
          setIsLoading(false);
          return;
        }

        const input: CreateKitInput = {
          code,
          name,
          subcategoryId,
          sellPrice: sellPriceNum,
          costRollupMode,
          manualCostPrice: manualCostPriceNum,
          components: kitComponents,
          explodeInBOM,
          salesOnly,
        };

        const result = await LibraryKitService.create(input, context);
        if (!result.ok) {
          setError(result.error);
          setIsLoading(false);
          return;
        }

        // Auto-approve the initial version
        if (result.value.currentVersionId) {
          await LibraryKitService.approveVersion(result.value.currentVersionId, context);
        }
      } else if (mode === 'new-version' && kit) {
        if (components.length === 0) {
          setError('Please add at least one component');
          setIsLoading(false);
          return;
        }

        const input: CreateKitVersionInput = {
          sellPrice: sellPriceNum,
          costRollupMode,
          manualCostPrice: manualCostPriceNum,
          components: kitComponents,
          explodeInBOM,
          salesOnly,
        };

        const result = await LibraryKitService.createVersion(kit.id, input, context);
        if (!result.ok) {
          setError(result.error);
          setIsLoading(false);
          return;
        }

        // Auto-approve the new version
        await LibraryKitService.approveVersion(result.value.id, context);
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save kit:', err);
      setError('An error occurred while saving');
    } finally {
      setIsLoading(false);
    }
  }

  const title = mode === 'create' ? 'Create Kit' :
    mode === 'edit' ? 'Edit Kit' : 'New Kit Version';

  const description = mode === 'create'
    ? 'Create a kit (assembly) of articles'
    : mode === 'edit'
      ? 'Update kit details'
      : `Create a new version for ${kit?.code}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Kit Info - only editable in create mode */}
          {mode === 'create' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Kit Code *</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g., KIT-PROP-E50"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Electric Propulsion Kit 50kW"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subcategory">Subcategory *</Label>
                  <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!selectedCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubcategories.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Version Info - shown for existing kit */}
          {mode !== 'create' && kit && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Code:</span>
                  <span className="ml-2 font-mono font-medium">{kit.code}</span>
                </div>
                <div>
                  <span className="text-slate-500">Name:</span>
                  <span className="ml-2 font-medium">{kit.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Components */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700">Components</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowArticlePicker(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Article
              </Button>
            </div>

            {components.length === 0 ? (
              <div className="p-6 border-2 border-dashed rounded-lg text-center text-slate-500">
                <Package className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p>No components added yet</p>
                <p className="text-sm">Click "Add Article" to add components to this kit</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-28 text-right">Unit Price</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map(comp => (
                    <TableRow key={comp.articleVersionId}>
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs text-slate-500">{comp.articleCode}</span>
                          <p className="font-medium">{comp.articleName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="1"
                          value={comp.qty}
                          onChange={(e) => updateComponentQty(comp.articleVersionId, parseInt(e.target.value) || 1)}
                          className="w-20 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        €{comp.unitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{(comp.unitPrice * comp.qty).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600"
                          onClick={() => removeComponent(comp.articleVersionId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50">
                    <TableCell colSpan={3} className="font-medium text-right">
                      Component Total:
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      €{componentTotalCost.toFixed(2)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pricing & Options */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Pricing & Options</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sellPrice">Kit Sell Price (€) *</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  step="0.01"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This is the price shown on quotes
                </p>
              </div>
              <div>
                <Label htmlFor="costRollup">Cost Rollup</Label>
                <Select value={costRollupMode} onValueChange={(v) => setCostRollupMode(v as CostRollupMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUM_COMPONENTS">Sum of Components</SelectItem>
                    <SelectItem value="MANUAL">Manual Override</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {costRollupMode === 'MANUAL' && (
                <div>
                  <Label htmlFor="manualCost">Manual Cost (€)</Label>
                  <Input
                    id="manualCost"
                    type="number"
                    step="0.01"
                    value={manualCostPrice}
                    onChange={(e) => setManualCostPrice(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="explodeInBOM"
                  checked={explodeInBOM}
                  onCheckedChange={(checked) => setExplodeInBOM(!!checked)}
                />
                <Label htmlFor="explodeInBOM" className="text-sm cursor-pointer">
                  Explode in BOM
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="salesOnly"
                  checked={salesOnly}
                  onCheckedChange={(checked) => setSalesOnly(!!checked)}
                />
                <Label htmlFor="salesOnly" className="text-sm cursor-pointer">
                  Sales Only (no BOM)
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'new-version' ? 'Create Version' : 'Save'}
          </Button>
        </DialogFooter>

        {/* Article Picker Modal */}
        {showArticlePicker && (
          <Dialog open={showArticlePicker} onOpenChange={setShowArticlePicker}>
            <DialogContent className="max-w-xl max-h-[70vh]">
              <DialogHeader>
                <DialogTitle>Add Article to Kit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search articles..."
                    value={articleSearchQuery}
                    onChange={(e) => setArticleSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {filteredArticles.slice(0, 20).map(({ article, version }) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => addComponent(article, version)}
                      disabled={components.some(c => c.articleVersionId === version.id)}
                      className="w-full p-3 border rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-xs text-slate-500">{article.code}</span>
                          <p className="font-medium">{article.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">€{version.sellPrice.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">per {article.unit}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredArticles.length === 0 && (
                    <div className="p-6 text-center text-slate-500">
                      No articles found
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
