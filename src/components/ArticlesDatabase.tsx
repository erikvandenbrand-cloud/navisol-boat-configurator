'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, Filter, ChevronDown, ChevronUp,
  Package, AlertTriangle, Truck, Check, X, ArrowUpDown,
  PackagePlus, PackageMinus, ShoppingCart, MoreHorizontal, Pencil
} from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { formatEuroCurrency } from '@/lib/formatting';
import { CATEGORIES } from '@/lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Article, QuantityUnit, StandardOptional, BoatModel, StockStatus, ArticleDocument } from '@/lib/types';
import { STOCK_STATUS_INFO, DOCUMENT_TYPES } from '@/lib/types';
import { Upload, FileText, Box, Image as ImageIcon, File, BookOpen, Wrench, Award, Shield, FileSpreadsheet, ExternalLink } from 'lucide-react';

type SortField = 'part_name' | 'category' | 'brand' | 'purchase_price_excl_vat' | 'sales_price_excl_vat' | 'stock_qty';
type SortDirection = 'asc' | 'desc';

// Editable cell component for inline editing
interface EditableCellProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number' | 'currency';
  className?: string;
}

function EditableCell({ value, onSave, type = 'text', className = '' }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const newValue = type === 'number' || type === 'currency'
      ? Number.parseFloat(editValue) || 0
      : editValue;
    onSave(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={type === 'currency' || type === 'number' ? 'number' : 'text'}
          step={type === 'currency' ? '0.01' : '1'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-7 w-full text-sm py-0"
        />
      </div>
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded transition-colors ${className}`}
      onClick={() => {
        setEditValue(String(value));
        setIsEditing(true);
      }}
      title="Click to edit"
    >
      {type === 'currency' ? formatEuroCurrency(Number(value)) : value}
    </div>
  );
}

// Get computed stock status
function getStockStatus(article: Article): StockStatus {
  if (article.stock_status) return article.stock_status;
  if (article.stock_qty === 0) return 'out_of_stock';
  if (article.stock_qty <= article.min_stock_level) return 'low_stock';
  if (article.quantity_on_order && article.quantity_on_order > 0) return 'ordered';
  return 'in_stock';
}

export function ArticlesDatabase() {
  const { articles, addArticle, updateArticle, deleteArticle } = useNavisol();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [sortField, setSortField] = useState<SortField>('part_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Stock management dialogs
  const [receiveStockArticle, setReceiveStockArticle] = useState<Article | null>(null);
  const [receiveQuantity, setReceiveQuantity] = useState(0);
  const [orderArticle, setOrderArticle] = useState<Article | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(0);
  const [orderReference, setOrderReference] = useState('');

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort articles
  const filteredArticles = articles
    .filter(article => {
      const matchesSearch =
        article.part_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.manufacturer_article_no?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;

      const status = getStockStatus(article);
      const matchesStock = stockFilter === 'all' || status === stockFilter;

      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'part_name':
          comparison = a.part_name.localeCompare(b.part_name);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'brand':
          comparison = (a.brand || '').localeCompare(b.brand || '');
          break;
        case 'purchase_price_excl_vat':
          comparison = a.purchase_price_excl_vat - b.purchase_price_excl_vat;
          break;
        case 'sales_price_excl_vat':
          comparison = a.sales_price_excl_vat - b.sales_price_excl_vat;
          break;
        case 'stock_qty':
          comparison = a.stock_qty - b.stock_qty;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Inline update handler
  const handleInlineUpdate = useCallback((articleId: string, field: keyof Article, value: string | number) => {
    updateArticle(articleId, { [field]: value });
  }, [updateArticle]);

  // Receive stock handler
  const handleReceiveStock = () => {
    if (!receiveStockArticle || receiveQuantity <= 0) return;
    updateArticle(receiveStockArticle.id, {
      stock_qty: receiveStockArticle.stock_qty + receiveQuantity,
      quantity_on_order: Math.max(0, (receiveStockArticle.quantity_on_order || 0) - receiveQuantity),
      last_restocked_at: new Date().toISOString(),
      stock_status: undefined, // Reset to computed
    });
    setReceiveStockArticle(null);
    setReceiveQuantity(0);
  };

  // Mark as ordered handler
  const handleMarkOrdered = () => {
    if (!orderArticle || orderQuantity <= 0) return;
    updateArticle(orderArticle.id, {
      quantity_on_order: (orderArticle.quantity_on_order || 0) + orderQuantity,
      order_reference: orderReference || undefined,
      stock_status: 'ordered',
    });
    setOrderArticle(null);
    setOrderQuantity(0);
    setOrderReference('');
  };

  // Stock stats
  const stockStats = {
    total: articles.length,
    inStock: articles.filter(a => getStockStatus(a) === 'in_stock').length,
    lowStock: articles.filter(a => getStockStatus(a) === 'low_stock').length,
    ordered: articles.filter(a => getStockStatus(a) === 'ordered').length,
    outOfStock: articles.filter(a => getStockStatus(a) === 'out_of_stock').length,
  };

  // Sort header component
  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-slate-50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </div>
    </TableHead>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Parts Database</h1>
            <p className="text-slate-600">Manage articles, stock levels, and component inventory</p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Add New Article</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <ArticleForm
                  onSubmit={(data) => {
                    addArticle(data);
                    setIsAddDialogOpen(false);
                  }}
                  onCancel={() => setIsAddDialogOpen(false)}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, brand, or article number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-56">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <Package className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Stock status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Status</SelectItem>
                  <SelectItem value="in_stock">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      In Stock
                    </div>
                  </SelectItem>
                  <SelectItem value="low_stock">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      Low Stock
                    </div>
                  </SelectItem>
                  <SelectItem value="ordered">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Ordered
                    </div>
                  </SelectItem>
                  <SelectItem value="out_of_stock">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Out of Stock
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStockFilter('all')}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stockStats.total}</div>
                  <div className="text-xs text-slate-600">Total Articles</div>
                </div>
                <Package className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStockFilter('in_stock')}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stockStats.inStock}</div>
                  <div className="text-xs text-slate-600">In Stock</div>
                </div>
                <Check className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStockFilter('low_stock')}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stockStats.lowStock}</div>
                  <div className="text-xs text-slate-600">Low Stock</div>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStockFilter('ordered')}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stockStats.ordered}</div>
                  <div className="text-xs text-slate-600">On Order</div>
                </div>
                <Truck className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStockFilter('out_of_stock')}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{stockStats.outOfStock}</div>
                  <div className="text-xs text-slate-600">Out of Stock</div>
                </div>
                <X className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Articles Table - Interactive */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Articles ({filteredArticles.length})</CardTitle>
              <div className="text-sm text-slate-500">
                Click any cell to edit inline
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <SortHeader field="part_name">Part Name</SortHeader>
                    <SortHeader field="category">Category</SortHeader>
                    <SortHeader field="brand">Brand</SortHeader>
                    <SortHeader field="purchase_price_excl_vat">Purchase €</SortHeader>
                    <SortHeader field="sales_price_excl_vat">Sales €</SortHeader>
                    <SortHeader field="stock_qty">Stock</SortHeader>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">On Order</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.map((article) => {
                    const status = getStockStatus(article);
                    const statusInfo = STOCK_STATUS_INFO[status];
                    return (
                      <TableRow key={article.id} className="hover:bg-slate-50">
                        <TableCell className="min-w-[200px]">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <EditableCell
                                value={article.part_name}
                                onSave={(v) => handleInlineUpdate(article.id, 'part_name', v)}
                                className="font-medium"
                              />
                              <div className="text-xs text-slate-500 mt-0.5">{article.manufacturer_article_no || '-'}</div>
                            </div>
                            {/* File indicators */}
                            <div className="flex gap-0.5 mt-1">
                              {article.model_3d_url && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Box className="w-3.5 h-3.5 text-purple-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>3D Model: {article.model_3d_filename}</TooltipContent>
                                </Tooltip>
                              )}
                              {article.cutout_url && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>Cutout: {article.cutout_filename}</TooltipContent>
                                </Tooltip>
                              )}
                              {article.pdf_documents && article.pdf_documents.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <FileText className="w-3.5 h-3.5 text-red-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>{article.pdf_documents.length} PDF document(s)</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{article.subcategory}</div>
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={article.brand || ''}
                            onSave={(v) => handleInlineUpdate(article.id, 'brand', v)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell
                            value={article.purchase_price_excl_vat}
                            onSave={(v) => handleInlineUpdate(article.id, 'purchase_price_excl_vat', v)}
                            type="currency"
                            className="font-mono text-sm text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell
                            value={article.sales_price_excl_vat}
                            onSave={(v) => handleInlineUpdate(article.id, 'sales_price_excl_vat', v)}
                            type="currency"
                            className="font-mono text-sm text-right"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <EditableCell
                              value={article.stock_qty}
                              onSave={(v) => handleInlineUpdate(article.id, 'stock_qty', v)}
                              type="number"
                              className="font-bold text-center"
                            />
                            <span className="text-xs text-slate-500">
                              min: {article.min_stock_level}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
                                {statusInfo.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {status === 'ordered' && article.quantity_on_order
                                ? `${article.quantity_on_order} units on order`
                                : status === 'low_stock'
                                ? `Below minimum level of ${article.min_stock_level}`
                                : statusInfo.label}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">
                          {article.quantity_on_order ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <Truck className="h-3 w-3 mr-1" />
                                  {article.quantity_on_order}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {article.order_reference && <div>Ref: {article.order_reference}</div>}
                                {article.expected_delivery_date && <div>Expected: {article.expected_delivery_date}</div>}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={article.standard_or_optional === 'Standard' ? "default" : "outline"}
                            className={article.standard_or_optional === 'Standard' ? "bg-emerald-600" : ""}
                          >
                            {article.standard_or_optional === 'Standard' ? 'Std' : 'Opt'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setReceiveStockArticle(article)}>
                                <PackagePlus className="h-4 w-4 mr-2 text-green-600" />
                                Receive Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setOrderArticle(article)}>
                                <ShoppingCart className="h-4 w-4 mr-2 text-blue-600" />
                                Mark as Ordered
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setEditingArticle(article)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteArticle(article.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {filteredArticles.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No articles found matching your filters
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        {editingArticle && (
          <Dialog open={!!editingArticle} onOpenChange={() => setEditingArticle(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Edit Article</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <ArticleForm
                  article={editingArticle}
                  onSubmit={(data) => {
                    updateArticle(editingArticle.id, data);
                    setEditingArticle(null);
                  }}
                  onCancel={() => setEditingArticle(null)}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}

        {/* Receive Stock Dialog */}
        <Dialog open={!!receiveStockArticle} onOpenChange={() => setReceiveStockArticle(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-green-600" />
                Receive Stock
              </DialogTitle>
            </DialogHeader>
            {receiveStockArticle && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium">{receiveStockArticle.part_name}</div>
                  <div className="text-sm text-slate-600">
                    Current stock: {receiveStockArticle.stock_qty} |
                    On order: {receiveStockArticle.quantity_on_order || 0}
                  </div>
                </div>
                <div>
                  <Label>Quantity Received</Label>
                  <Input
                    type="number"
                    min="1"
                    value={receiveQuantity || ''}
                    onChange={(e) => setReceiveQuantity(Number.parseInt(e.target.value) || 0)}
                    placeholder="Enter quantity"
                    className="mt-1"
                  />
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-sm">
                  New stock level: <strong>{receiveStockArticle.stock_qty + receiveQuantity}</strong>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReceiveStockArticle(null)}>Cancel</Button>
              <Button
                onClick={handleReceiveStock}
                disabled={receiveQuantity <= 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <PackagePlus className="h-4 w-4 mr-2" />
                Receive Stock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Order Stock Dialog */}
        <Dialog open={!!orderArticle} onOpenChange={() => setOrderArticle(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                Mark as Ordered
              </DialogTitle>
            </DialogHeader>
            {orderArticle && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium">{orderArticle.part_name}</div>
                  <div className="text-sm text-slate-600">
                    Current stock: {orderArticle.stock_qty} |
                    Already on order: {orderArticle.quantity_on_order || 0}
                  </div>
                </div>
                <div>
                  <Label>Quantity Ordered</Label>
                  <Input
                    type="number"
                    min="1"
                    value={orderQuantity || ''}
                    onChange={(e) => setOrderQuantity(Number.parseInt(e.target.value) || 0)}
                    placeholder="Enter quantity"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Order Reference (optional)</Label>
                  <Input
                    value={orderReference}
                    onChange={(e) => setOrderReference(e.target.value)}
                    placeholder="PO number or reference"
                    className="mt-1"
                  />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  Total on order: <strong>{(orderArticle.quantity_on_order || 0) + orderQuantity}</strong>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOrderArticle(null)}>Cancel</Button>
              <Button
                onClick={handleMarkOrdered}
                disabled={orderQuantity <= 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Mark as Ordered
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// DropZone Component for drag-and-drop file uploads
interface DropZoneProps {
  onFileDrop: (file: File) => void;
  accept: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  colorScheme?: 'purple' | 'blue' | 'red' | 'green';
  children?: React.ReactNode;
}

function DropZone({ onFileDrop, accept, icon, label, sublabel, colorScheme = 'blue', children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const colorClasses = {
    purple: {
      border: isDragging ? 'border-purple-500 bg-purple-50' : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50',
      text: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    blue: {
      border: isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50',
      text: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    red: {
      border: isDragging ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-red-400 hover:bg-red-50',
      text: 'text-red-600',
      bg: 'bg-red-100',
    },
    green: {
      border: isDragging ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-green-400 hover:bg-green-50',
      text: 'text-green-600',
      bg: 'bg-green-100',
    },
  };

  const colors = colorClasses[colorScheme];

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileDrop(files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileDrop(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center gap-2 p-6
        border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
        ${colors.border}
        ${isDragging ? 'scale-[1.02] shadow-lg' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {isDragging ? (
        <>
          <div className={`p-3 rounded-full ${colors.bg}`}>
            <Upload className={`w-8 h-8 ${colors.text}`} />
          </div>
          <p className={`text-sm font-medium ${colors.text}`}>Drop file here!</p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              {icon}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-slate-700">{label}</p>
              {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Drag & drop or click to browse
          </p>
        </>
      )}

      {children}
    </div>
  );
}

// Article Form Component
interface ArticleFormProps {
  article?: Article;
  onSubmit: (data: Omit<Article, 'id'>) => void;
  onCancel: () => void;
}

function ArticleForm({ article, onSubmit, onCancel }: ArticleFormProps) {
  const [formData, setFormData] = useState<Partial<Article>>(article || {
    part_name: '',
    category: '',
    subcategory: '',
    brand: '',
    manufacturer_article_no: '',
    supplier: '',
    purchase_price_excl_vat: 0,
    sales_price_excl_vat: 0,
    currency: 'EUR',
    quantity_unit: 'pcs',
    electric_compatible: true,
    diesel_compatible: true,
    hybrid_compatible: true,
    stock_qty: 0,
    min_stock_level: 0,
    parts_list_category: '',
    parts_list_subcategory: '',
    boat_model_compat: ['Eagle 25TS', 'Eagle 28TS', 'Eagle 32TS', 'Eagle C720', 'Eagle C999'],
    standard_or_optional: 'Standard',
    model_3d_url: '',
    model_3d_filename: '',
    cutout_url: '',
    cutout_filename: '',
    pdf_documents: [],
  });

  // File upload handlers - support both input change and direct File objects (for drag-drop)
  const process3DModelFile = (file: File) => {
    const validExtensions = ['.step', '.stp', '.stl', '.obj', '.3ds', '.fbx', '.gltf', '.glb'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(ext)) {
      alert(`Invalid file type. Supported: ${validExtensions.join(', ')}`);
      return;
    }
    const url = URL.createObjectURL(file);
    setFormData({
      ...formData,
      model_3d_url: url,
      model_3d_filename: file.name,
    });
  };

  const handle3DModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) process3DModelFile(file);
  };

  const processCutoutFile = (file: File) => {
    // Accept any file type for cutouts (PDF, images, CAD drawings, etc.)
    const url = URL.createObjectURL(file);
    setFormData({
      ...formData,
      cutout_url: url,
      cutout_filename: file.name,
    });
  };

  const handleCutoutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processCutoutFile(file);
  };

  const processDocumentFile = (file: File, docType: ArticleDocument['type']) => {
    // Accept PDFs and images for documents
    const isPDF = file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') ||
                    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'].some(
                      ext => file.name.toLowerCase().endsWith(ext)
                    );

    if (!isPDF && !isImage) {
      alert('Please upload a PDF or image file (PDF, PNG, JPG, etc.)');
      return;
    }
    const url = URL.createObjectURL(file);
    const newDoc: ArticleDocument = {
      id: `doc-${Date.now()}`,
      name: DOCUMENT_TYPES[docType].label,
      type: docType,
      filename: file.name,
      url,
      file_size_kb: Math.round(file.size / 1024),
      uploaded_at: new Date().toISOString(),
    };
    setFormData({
      ...formData,
      pdf_documents: [...(formData.pdf_documents || []), newDoc],
    });
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>, docType: ArticleDocument['type']) => {
    const file = e.target.files?.[0];
    if (file) processDocumentFile(file, docType);
  };

  // Auto-detect document type based on filename
  const autoDetectDocType = (filename: string): ArticleDocument['type'] => {
    const lower = filename.toLowerCase();
    if (lower.includes('install')) return 'installation_manual';
    if (lower.includes('user') || lower.includes('manual') || lower.includes('guide')) return 'user_manual';
    if (lower.includes('data') || lower.includes('spec')) return 'datasheet';
    if (lower.includes('cert')) return 'certificate';
    if (lower.includes('warrant')) return 'warranty';
    return 'other';
  };

  const handleGenericDocumentDrop = (file: File) => {
    const docType = autoDetectDocType(file.name);
    processDocumentFile(file, docType);
  };

  const removePDFDocument = (docId: string) => {
    setFormData({
      ...formData,
      pdf_documents: (formData.pdf_documents || []).filter(d => d.id !== docId),
    });
  };

  const remove3DModel = () => {
    setFormData({
      ...formData,
      model_3d_url: '',
      model_3d_filename: '',
    });
  };

  const removeCutout = () => {
    setFormData({
      ...formData,
      cutout_url: '',
      cutout_filename: '',
    });
  };

  // Rename functionality
  const [renaming3DModel, setRenaming3DModel] = useState(false);
  const [renamingCutout, setRenamingCutout] = useState(false);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((renaming3DModel || renamingCutout || renamingDocId) && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming3DModel, renamingCutout, renamingDocId]);

  const startRename3DModel = () => {
    setRenameValue(formData.model_3d_filename || '');
    setRenaming3DModel(true);
  };

  const confirmRename3DModel = () => {
    if (renameValue.trim()) {
      setFormData({
        ...formData,
        model_3d_filename: renameValue.trim(),
      });
    }
    setRenaming3DModel(false);
    setRenameValue('');
  };

  const startRenameCutout = () => {
    setRenameValue(formData.cutout_filename || '');
    setRenamingCutout(true);
  };

  const confirmRenameCutout = () => {
    if (renameValue.trim()) {
      setFormData({
        ...formData,
        cutout_filename: renameValue.trim(),
      });
    }
    setRenamingCutout(false);
    setRenameValue('');
  };

  const startRenameDocument = (doc: ArticleDocument) => {
    setRenameValue(doc.filename);
    setRenamingDocId(doc.id);
  };

  const confirmRenameDocument = () => {
    if (renameValue.trim() && renamingDocId) {
      setFormData({
        ...formData,
        pdf_documents: (formData.pdf_documents || []).map(d =>
          d.id === renamingDocId ? { ...d, filename: renameValue.trim() } : d
        ),
      });
    }
    setRenamingDocId(null);
    setRenameValue('');
  };

  const cancelRename = () => {
    setRenaming3DModel(false);
    setRenamingCutout(false);
    setRenamingDocId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, confirmFn: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmFn();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.name === formData.category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      part_name: formData.part_name || '',
      category: formData.category || '',
      subcategory: formData.subcategory || '',
      brand: formData.brand,
      manufacturer_article_no: formData.manufacturer_article_no,
      supplier: formData.supplier,
      purchase_price_excl_vat: formData.purchase_price_excl_vat || 0,
      sales_price_excl_vat: formData.sales_price_excl_vat || 0,
      currency: formData.currency || 'EUR',
      quantity_unit: (formData.quantity_unit || 'pcs') as QuantityUnit,
      electric_compatible: formData.electric_compatible ?? true,
      diesel_compatible: formData.diesel_compatible ?? true,
      hybrid_compatible: formData.hybrid_compatible ?? true,
      stock_qty: formData.stock_qty || 0,
      min_stock_level: formData.min_stock_level || 0,
      parts_list_category: formData.category || '',
      parts_list_subcategory: formData.subcategory || '',
      boat_model_compat: (formData.boat_model_compat || []) as BoatModel[],
      standard_or_optional: (formData.standard_or_optional || 'Standard') as StandardOptional,
      price_calculation: 'fixed' as const,
      // Technical files
      model_3d_url: formData.model_3d_url,
      model_3d_filename: formData.model_3d_filename,
      cutout_url: formData.cutout_url,
      cutout_filename: formData.cutout_filename,
      pdf_documents: formData.pdf_documents || [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identification */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 border-b pb-2">Identification</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="part_name">Part Name *</Label>
            <Input
              id="part_name"
              value={formData.part_name || ''}
              onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category || 'select'}
              onValueChange={(v) => setFormData({ ...formData, category: v === 'select' ? '' : v, subcategory: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select" disabled>Select category</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subcategory">Subcategory *</Label>
            <Select
              value={formData.subcategory || 'select'}
              onValueChange={(v) => setFormData({ ...formData, subcategory: v === 'select' ? '' : v })}
              disabled={!selectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select" disabled>Select subcategory</SelectItem>
                {selectedCategory?.subcategories.map(sub => (
                  <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formData.brand || ''}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="manufacturer_article_no">Manufacturer Article No.</Label>
            <Input
              id="manufacturer_article_no"
              value={formData.manufacturer_article_no || ''}
              onChange={(e) => setFormData({ ...formData, manufacturer_article_no: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier || ''}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 border-b pb-2">Pricing</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="purchase_price">Purchase Price (excl. VAT)</Label>
            <Input
              id="purchase_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.purchase_price_excl_vat || ''}
              onChange={(e) => setFormData({ ...formData, purchase_price_excl_vat: Number.parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="sales_price">Sales Price (excl. VAT)</Label>
            <Input
              id="sales_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.sales_price_excl_vat || ''}
              onChange={(e) => setFormData({ ...formData, sales_price_excl_vat: Number.parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="quantity_unit">Unit</Label>
            <Select
              value={formData.quantity_unit || 'pcs'}
              onValueChange={(v) => setFormData({ ...formData, quantity_unit: v as QuantityUnit })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pcs">Pieces</SelectItem>
                <SelectItem value="set">Set</SelectItem>
                <SelectItem value="meter">Meter</SelectItem>
                <SelectItem value="m²">m²</SelectItem>
                <SelectItem value="liter">Liter</SelectItem>
                <SelectItem value="kg">Kilogram</SelectItem>
                <SelectItem value="hour">Hour</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stock & Compatibility */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 border-b pb-2">Stock & Compatibility</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="stock_qty">Stock Quantity</Label>
            <Input
              id="stock_qty"
              type="number"
              min="0"
              value={formData.stock_qty || ''}
              onChange={(e) => setFormData({ ...formData, stock_qty: Number.parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="min_stock">Min Stock Level</Label>
            <Input
              id="min_stock"
              type="number"
              min="0"
              value={formData.min_stock_level || ''}
              onChange={(e) => setFormData({ ...formData, min_stock_level: Number.parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="standard_optional">Type</Label>
            <Select
              value={formData.standard_or_optional || 'Standard'}
              onValueChange={(v) => setFormData({ ...formData, standard_or_optional: v as StandardOptional })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Optional">Optional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-6 pt-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="electric"
              checked={formData.electric_compatible ?? true}
              onCheckedChange={(c) => setFormData({ ...formData, electric_compatible: !!c })}
            />
            <Label htmlFor="electric" className="font-normal">Electric Compatible</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="diesel"
              checked={formData.diesel_compatible ?? true}
              onCheckedChange={(c) => setFormData({ ...formData, diesel_compatible: !!c })}
            />
            <Label htmlFor="diesel" className="font-normal">Diesel Compatible</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="hybrid"
              checked={formData.hybrid_compatible ?? true}
              onCheckedChange={(c) => setFormData({ ...formData, hybrid_compatible: !!c })}
            />
            <Label htmlFor="hybrid" className="font-normal">Hybrid Compatible</Label>
          </div>
        </div>
      </div>

      {/* Technical Files */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 border-b pb-2">Technical Files</h3>
        <p className="text-xs text-slate-500 -mt-2">Drag & drop files or click to browse</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 3D Model Upload */}
          <div className="space-y-2">
            {formData.model_3d_filename ? (
              <div className="flex items-center gap-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Box className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {renaming3DModel ? (
                    <div className="flex items-center gap-1">
                      <Input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => handleRenameKeyDown(e, confirmRename3DModel)}
                        className="h-7 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); confirmRename3DModel(); }}
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); cancelRename(); }}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-purple-900 truncate">
                        {formData.model_3d_filename}
                      </p>
                      <p className="text-xs text-purple-600">3D Model</p>
                    </>
                  )}
                </div>
                {!renaming3DModel && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); startRename3DModel(); }}
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                      title="Rename file"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); remove3DModel(); }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <DropZone
                onFileDrop={process3DModelFile}
                accept=".step,.stp,.stl,.obj,.3ds,.fbx,.gltf,.glb"
                icon={<Box className="w-5 h-5 text-purple-600" />}
                label="3D Model"
                sublabel="STEP, STL, OBJ, GLTF"
                colorScheme="purple"
              />
            )}
          </div>

          {/* Cutout Image Upload */}
          <div className="space-y-2">
            {formData.cutout_filename ? (
              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ImageIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {renamingCutout ? (
                    <div className="flex items-center gap-1">
                      <Input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => handleRenameKeyDown(e, confirmRenameCutout)}
                        className="h-7 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); confirmRenameCutout(); }}
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); cancelRename(); }}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-blue-900 truncate">
                        {formData.cutout_filename}
                      </p>
                      <p className="text-xs text-blue-600">Technical Cutout</p>
                    </>
                  )}
                </div>
                {!renamingCutout && (
                  <>
                    {formData.cutout_url && (
                      <a
                        href={formData.cutout_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded"
                        onClick={(e) => e.stopPropagation()}
                        title="Open file"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); startRenameCutout(); }}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                      title="Rename file"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); removeCutout(); }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <DropZone
                onFileDrop={processCutoutFile}
                accept="*/*"
                icon={<ImageIcon className="w-5 h-5 text-blue-600" />}
                label="Technical Cutout / Drawing"
                sublabel="Any file: PDF, DXF, DWG, Images, etc."
                colorScheme="blue"
              />
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-600" />
            Documents (Manuals, Datasheets, Certificates, Images)
          </Label>

          {/* Main drop zone for documents */}
          <DropZone
            onFileDrop={handleGenericDocumentDrop}
            accept=".pdf,image/*"
            icon={<FileText className="w-5 h-5 text-red-600" />}
            label="Drop PDF or image here"
            sublabel="Auto-detects document type from filename"
            colorScheme="red"
          />

          {/* Existing documents */}
          {(formData.pdf_documents || []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Uploaded Documents ({formData.pdf_documents?.length})
              </p>
              {formData.pdf_documents?.map((doc) => {
                const typeConfig = DOCUMENT_TYPES[doc.type];
                const isRenaming = renamingDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <div className="p-2 bg-red-100 rounded-lg">
                      {doc.type === 'installation_manual' && <Wrench className="w-4 h-4 text-red-600" />}
                      {doc.type === 'user_manual' && <BookOpen className="w-4 h-4 text-red-600" />}
                      {doc.type === 'datasheet' && <FileSpreadsheet className="w-4 h-4 text-red-600" />}
                      {doc.type === 'certificate' && <Award className="w-4 h-4 text-red-600" />}
                      {doc.type === 'warranty' && <Shield className="w-4 h-4 text-red-600" />}
                      {doc.type === 'other' && <File className="w-4 h-4 text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <div className="flex items-center gap-1">
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => handleRenameKeyDown(e, confirmRenameDocument)}
                            className="h-7 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); confirmRenameDocument(); }}
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); cancelRename(); }}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-slate-900 truncate">{doc.filename}</p>
                          <p className="text-xs text-slate-500">{typeConfig.label} • {doc.file_size_kb} KB</p>
                        </>
                      )}
                    </div>
                    {!isRenaming && (
                      <>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startRenameDocument(doc)}
                          className="text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                          title="Rename document"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePDFDocument(doc.id)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick upload buttons by type */}
          <div className="pt-2">
            <p className="text-xs text-slate-500 mb-2">Or upload by specific type (PDF or image):</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DOCUMENT_TYPES) as ArticleDocument['type'][]).map((docType) => {
                const config = DOCUMENT_TYPES[docType];
                return (
                  <label
                    key={docType}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full cursor-pointer hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                  >
                    {docType === 'installation_manual' && <Wrench className="w-3 h-3" />}
                    {docType === 'user_manual' && <BookOpen className="w-3 h-3" />}
                    {docType === 'datasheet' && <FileSpreadsheet className="w-3 h-3" />}
                    {docType === 'certificate' && <Award className="w-3 h-3" />}
                    {docType === 'warranty' && <Shield className="w-3 h-3" />}
                    {docType === 'other' && <File className="w-3 h-3" />}
                    {config.label}
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleDocumentUpload(e, docType)}
                      className="hidden"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {article ? 'Update Article' : 'Add Article'}
        </Button>
      </div>
    </form>
  );
}
