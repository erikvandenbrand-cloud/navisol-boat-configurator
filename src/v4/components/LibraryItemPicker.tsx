'use client';

import { useState, useEffect } from 'react';
import { Search, Package, Layers, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import type {
  LibraryCategory,
  LibrarySubcategory,
  ArticleWithVersion,
  KitWithVersion,
} from '@/domain/models';
import {
  LibraryCategoryService,
  LibraryArticleService,
  LibraryKitService,
} from '@/domain/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export type PickerItemType = 'ARTICLE' | 'KIT';

export interface PickedItem {
  type: PickerItemType;
  id: string; // article.id or kit.id
  versionId: string; // articleVersion.id or kitVersion.id
  code: string;
  name: string;
  category: string;
  subcategory: string;
  unit: string;
  sellPrice: number;
  costPrice?: number;
  vatRate: number;
  tags?: string[];
}

interface LibraryItemPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (item: PickedItem) => void;
}

export function LibraryItemPicker({
  open,
  onOpenChange,
  onPick,
}: LibraryItemPickerProps) {
  const [activeTab, setActiveTab] = useState<'articles' | 'kits'>('articles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  // Data
  const [categoryTree, setCategoryTree] = useState<{
    category: LibraryCategory;
    subcategories: { subcategory: LibrarySubcategory; articleCount: number; kitCount: number }[];
  }[]>([]);
  const [articles, setArticles] = useState<ArticleWithVersion[]>([]);
  const [kits, setKits] = useState<KitWithVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [tree, articleList, kitList] = await Promise.all([
        LibraryCategoryService.getCategoryTree(),
        LibraryArticleService.getAllWithApprovedVersions(),
        LibraryKitService.getAllWithApprovedVersions(),
      ]);
      setCategoryTree(tree);
      setArticles(articleList);
      setKits(kitList);
    } catch (err) {
      console.error('Failed to load library data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter articles
  const filteredArticles = articles.filter(a => {
    // Category filter
    if (selectedCategoryId && a.category.id !== selectedCategoryId) return false;
    if (selectedSubcategoryId && a.subcategory.id !== selectedSubcategoryId) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        a.article.code.toLowerCase().includes(query) ||
        a.article.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Filter kits
  const filteredKits = kits.filter(k => {
    // Category filter
    if (selectedCategoryId && k.category.id !== selectedCategoryId) return false;
    if (selectedSubcategoryId && k.subcategory.id !== selectedSubcategoryId) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        k.kit.code.toLowerCase().includes(query) ||
        k.kit.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  function handleSelectArticle(item: ArticleWithVersion) {
    const picked: PickedItem = {
      type: 'ARTICLE',
      id: item.article.id,
      versionId: item.version.id,
      code: item.article.code,
      name: item.article.name,
      category: item.category.name,
      subcategory: item.subcategory.name,
      unit: item.article.unit,
      sellPrice: item.version.sellPrice,
      costPrice: item.version.costPrice,
      vatRate: item.version.vatRate,
      tags: item.article.tags,
    };
    onPick(picked);
    onOpenChange(false);
  }

  function handleSelectKit(item: KitWithVersion) {
    const picked: PickedItem = {
      type: 'KIT',
      id: item.kit.id,
      versionId: item.version.id,
      code: item.kit.code,
      name: item.kit.name,
      category: item.category.name,
      subcategory: item.subcategory.name,
      unit: 'set',
      sellPrice: item.version.sellPrice,
      vatRate: 21, // Default
      tags: [],
    };
    onPick(picked);
    onOpenChange(false);
  }

  function clearFilters() {
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
    setSearchQuery('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            Add from Library
          </DialogTitle>
          <DialogDescription>
            Select an article or kit to add to the configuration
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[60vh]">
          {/* Category sidebar */}
          <div className="w-64 border-r pr-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-slate-700">Categories</h4>
              {(selectedCategoryId || selectedSubcategoryId) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-teal-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <ScrollArea className="h-[calc(60vh-40px)]">
              <div className="space-y-1">
                {categoryTree.map(({ category, subcategories }) => (
                  <div key={category.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(selectedCategoryId === category.id ? null : category.id);
                        setSelectedSubcategoryId(null);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left transition-colors ${
                        selectedCategoryId === category.id
                          ? 'bg-teal-100 text-teal-700'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{category.name}</span>
                      <ChevronRight className={`h-4 w-4 transition-transform ${
                        selectedCategoryId === category.id ? 'rotate-90' : ''
                      }`} />
                    </button>
                    {selectedCategoryId === category.id && (
                      <div className="ml-2 mt-1 space-y-0.5">
                        {subcategories.map(({ subcategory, articleCount, kitCount }) => (
                          <button
                            key={subcategory.id}
                            type="button"
                            onClick={() => setSelectedSubcategoryId(
                              selectedSubcategoryId === subcategory.id ? null : subcategory.id
                            )}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs text-left transition-colors ${
                              selectedSubcategoryId === subcategory.id
                                ? 'bg-teal-50 text-teal-700'
                                : 'hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <span className="truncate">{subcategory.name}</span>
                            <span className="text-slate-400">
                              {articleCount + kitCount}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'articles' | 'kits')} className="flex-1 flex flex-col">
              <TabsList>
                <TabsTrigger value="articles" className="gap-2">
                  <Package className="h-4 w-4" />
                  Articles
                  <Badge variant="secondary" className="text-xs">{filteredArticles.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="kits" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Kits
                  <Badge variant="secondary" className="text-xs">{filteredKits.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="articles" className="flex-1 mt-4">
                <ScrollArea className="h-[calc(60vh-140px)]">
                  {isLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading...</div>
                  ) : filteredArticles.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Package className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      <p>No articles found</p>
                      {searchQuery && <p className="text-sm">Try a different search term</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredArticles.map(item => (
                        <button
                          key={item.version.id}
                          type="button"
                          onClick={() => handleSelectArticle(item)}
                          className="w-full p-3 border rounded-lg text-left hover:bg-slate-50 hover:border-teal-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-slate-500">{item.article.code}</span>
                                {item.article.tags?.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-[10px] py-0">
                                    {tag.replace('_', ' ')}
                                  </Badge>
                                ))}
                              </div>
                              <p className="font-medium text-slate-900">{item.article.name}</p>
                              <p className="text-xs text-slate-500">
                                {item.category.name} / {item.subcategory.name}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-bold text-slate-900">€{item.version.sellPrice.toFixed(2)}</p>
                              <p className="text-xs text-slate-500">per {item.article.unit}</p>
                              {!item.version.costPrice && (
                                <p className="text-xs text-amber-600 flex items-center gap-1 justify-end mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  No cost
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="kits" className="flex-1 mt-4">
                <ScrollArea className="h-[calc(60vh-140px)]">
                  {isLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading...</div>
                  ) : filteredKits.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Layers className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      <p>No kits found</p>
                      {searchQuery && <p className="text-sm">Try a different search term</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredKits.map(item => (
                        <button
                          key={item.version.id}
                          type="button"
                          onClick={() => handleSelectKit(item)}
                          className="w-full p-3 border rounded-lg text-left hover:bg-slate-50 hover:border-teal-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-slate-500">{item.kit.code}</span>
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {item.components.length} components
                                </Badge>
                                {item.version.salesOnly && (
                                  <Badge variant="secondary" className="text-[10px] py-0">
                                    Sales Only
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium text-slate-900">{item.kit.name}</p>
                              <p className="text-xs text-slate-500">
                                {item.category.name} / {item.subcategory.name}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-bold text-slate-900">€{item.version.sellPrice.toFixed(2)}</p>
                              <p className="text-xs text-slate-500">per kit</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
