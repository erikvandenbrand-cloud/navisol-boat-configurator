'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet, Download, Eye, X, Package, AlertTriangle, Check,
  Truck, Search, Filter, ChevronDown, ChevronUp, ArrowUpDown,
  ExternalLink, Printer, Copy, RefreshCw, BarChart3, ShoppingCart
} from 'lucide-react';
import { useStoreV3, useProject } from '@/lib/store-v3';
import { useNavisol } from '@/lib/store';
import type { Project, EquipmentItem } from '@/lib/types-v3';
import type { Article, StockStatus } from '@/lib/types';
import { STOCK_STATUS_INFO } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// TYPES
// ============================================

interface BOMLine {
  id: string;
  equipmentItem: EquipmentItem;
  article?: Article;
  category: string;
  name: string;
  description?: string;
  quantityNeeded: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  stockQty: number;
  stockStatus: StockStatus;
  shortfall: number;
  onOrder: number;
  isAvailable: boolean;
  articleNo?: string;
  brand?: string;
  supplier?: string;
}

type SortField = 'name' | 'category' | 'quantityNeeded' | 'stockStatus' | 'shortfall' | 'totalPrice';
type SortDirection = 'asc' | 'desc';
type StockFilter = 'all' | 'available' | 'shortfall' | 'ordered';

// ============================================
// HELPERS
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function getStockStatus(article: Article | undefined, quantityNeeded: number): StockStatus {
  if (!article) return 'out_of_stock';
  if (article.stock_status) return article.stock_status;
  if (article.stock_qty === 0) return 'out_of_stock';
  if (article.stock_qty < quantityNeeded) return 'low_stock';
  if (article.quantity_on_order && article.quantity_on_order > 0) return 'ordered';
  return 'in_stock';
}

function getStockStatusColor(status: StockStatus): string {
  switch (status) {
    case 'in_stock': return 'bg-green-100 text-green-700 border-green-200';
    case 'low_stock': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'ordered': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'out_of_stock': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case 'in_stock': return 'Op voorraad';
    case 'low_stock': return 'Beperkt';
    case 'ordered': return 'Besteld';
    case 'out_of_stock': return 'Niet op voorraad';
    default: return status;
  }
}

// ============================================
// ARTICLE DETAIL SHEET
// ============================================

interface ArticleDetailSheetProps {
  bomLine: BOMLine | null;
  isOpen: boolean;
  onClose: () => void;
}

function ArticleDetailSheet({ bomLine, isOpen, onClose }: ArticleDetailSheetProps) {
  if (!bomLine) return null;

  const statusColor = getStockStatusColor(bomLine.stockStatus);
  const statusLabel = getStockStatusLabel(bomLine.stockStatus);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            {bomLine.name}
          </SheetTitle>
          <SheetDescription>
            {bomLine.category} • {bomLine.articleNo || 'Geen artikelnummer'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Stock Status Banner */}
          <div className={`p-4 rounded-lg border ${statusColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {bomLine.stockStatus === 'in_stock' && <Check className="w-5 h-5" />}
                {bomLine.stockStatus === 'low_stock' && <AlertTriangle className="w-5 h-5" />}
                {bomLine.stockStatus === 'ordered' && <Truck className="w-5 h-5" />}
                {bomLine.stockStatus === 'out_of_stock' && <X className="w-5 h-5" />}
                <span className="font-medium">{statusLabel}</span>
              </div>
              <span className="text-2xl font-bold">{bomLine.stockQty}</span>
            </div>
            {bomLine.shortfall > 0 && (
              <p className="mt-2 text-sm">
                Tekort: <strong>{bomLine.shortfall}</strong> stuks voor dit project
              </p>
            )}
            {bomLine.onOrder > 0 && (
              <p className="mt-1 text-sm">
                In bestelling: <strong>{bomLine.onOrder}</strong> stuks
              </p>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Benodigd</Label>
              <p className="font-medium">{bomLine.quantityNeeded} {bomLine.unit}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Op voorraad</Label>
              <p className="font-medium">{bomLine.stockQty} {bomLine.unit}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Stukprijs</Label>
              <p className="font-medium font-mono">{formatCurrency(bomLine.unitPrice)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Totaal</Label>
              <p className="font-medium font-mono">{formatCurrency(bomLine.totalPrice)}</p>
            </div>
          </div>

          <Separator />

          {/* Article Info */}
          {bomLine.article ? (
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Artikel Informatie</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-slate-500">Merk</Label>
                  <p>{bomLine.brand || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Leverancier</Label>
                  <p>{bomLine.supplier || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Artikelnummer</Label>
                  <p className="font-mono">{bomLine.articleNo || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Min. voorraad</Label>
                  <p>{bomLine.article.min_stock_level || 0}</p>
                </div>
              </div>

              {bomLine.description && (
                <div>
                  <Label className="text-xs text-slate-500">Omschrijving</Label>
                  <p className="text-sm mt-1">{bomLine.description}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Geen gekoppeld artikel in database</p>
              <p className="text-xs mt-1">Dit is een handmatig toegevoegd item</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {bomLine.shortfall > 0 && (
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Bestellen ({bomLine.shortfall})
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Sluiten
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface ProjectBOMGeneratorProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectBOMGenerator({ projectId, isOpen, onClose }: ProjectBOMGeneratorProps) {
  const { project, client, model } = useProject(projectId);
  const { articles } = useNavisol();
  const { addDocument } = useStoreV3();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortField, setSortField] = useState<SortField>('category');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedLine, setSelectedLine] = useState<BOMLine | null>(null);
  const [showOnlyShortfall, setShowOnlyShortfall] = useState(false);

  // Build BOM lines from equipment
  const bomLines = useMemo((): BOMLine[] => {
    if (!project) return [];

    return project.equipment.items
      .filter(item => item.isIncluded)
      .map(item => {
        // Try to find matching article in database
        const article = articles.find(a =>
          a.id === item.articleId ||
          a.part_name.toLowerCase() === item.name.toLowerCase()
        );

        const stockQty = article?.stock_qty || 0;
        const onOrder = article?.quantity_on_order || 0;
        const shortfall = Math.max(0, item.quantity - stockQty - onOrder);
        const status = getStockStatus(article, item.quantity);

        return {
          id: item.id,
          equipmentItem: item,
          article,
          category: item.category,
          name: item.name,
          description: item.description,
          quantityNeeded: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPriceExclVat,
          totalPrice: item.lineTotalExclVat,
          stockQty,
          stockStatus: status,
          shortfall,
          onOrder,
          isAvailable: shortfall === 0,
          articleNo: article?.manufacturer_article_no,
          brand: article?.brand,
          supplier: article?.supplier,
        };
      });
  }, [project, articles]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(bomLines.map(l => l.category));
    return Array.from(cats).sort();
  }, [bomLines]);

  // Filter and sort
  const filteredLines = useMemo(() => {
    let result = bomLines;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(line =>
        line.name.toLowerCase().includes(query) ||
        line.category.toLowerCase().includes(query) ||
        line.articleNo?.toLowerCase().includes(query) ||
        line.brand?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(line => line.category === categoryFilter);
    }

    // Stock filter
    if (stockFilter === 'available') {
      result = result.filter(line => line.isAvailable);
    } else if (stockFilter === 'shortfall') {
      result = result.filter(line => line.shortfall > 0);
    } else if (stockFilter === 'ordered') {
      result = result.filter(line => line.onOrder > 0);
    }

    // Shortfall only
    if (showOnlyShortfall) {
      result = result.filter(line => line.shortfall > 0);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'quantityNeeded':
          comparison = a.quantityNeeded - b.quantityNeeded;
          break;
        case 'stockStatus':
          const statusOrder = { in_stock: 0, ordered: 1, low_stock: 2, out_of_stock: 3 };
          comparison = statusOrder[a.stockStatus] - statusOrder[b.stockStatus];
          break;
        case 'shortfall':
          comparison = a.shortfall - b.shortfall;
          break;
        case 'totalPrice':
          comparison = a.totalPrice - b.totalPrice;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [bomLines, searchQuery, categoryFilter, stockFilter, showOnlyShortfall, sortField, sortDirection]);

  // Statistics
  const stats = useMemo(() => {
    const total = bomLines.length;
    const available = bomLines.filter(l => l.isAvailable).length;
    const withShortfall = bomLines.filter(l => l.shortfall > 0).length;
    const onOrder = bomLines.filter(l => l.onOrder > 0).length;
    const totalValue = bomLines.reduce((sum, l) => sum + l.totalPrice, 0);
    const totalShortfallItems = bomLines.reduce((sum, l) => sum + l.shortfall, 0);

    return {
      total,
      available,
      withShortfall,
      onOrder,
      totalValue,
      totalShortfallItems,
      availabilityPercent: total > 0 ? Math.round((available / total) * 100) : 0,
    };
  }, [bomLines]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');

      // Prepare data for export
      const exportData = filteredLines.map(line => ({
        'Categorie': line.category,
        'Artikelnaam': line.name,
        'Omschrijving': line.description || '',
        'Artikelnummer': line.articleNo || '',
        'Merk': line.brand || '',
        'Leverancier': line.supplier || '',
        'Benodigd': line.quantityNeeded,
        'Eenheid': line.unit,
        'Op Voorraad': line.stockQty,
        'Status': getStockStatusLabel(line.stockStatus),
        'Tekort': line.shortfall,
        'In Bestelling': line.onOrder,
        'Stukprijs (€)': line.unitPrice,
        'Totaal (€)': line.totalPrice,
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Main BOM sheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Categorie
        { wch: 35 }, // Artikelnaam
        { wch: 30 }, // Omschrijving
        { wch: 15 }, // Artikelnummer
        { wch: 15 }, // Merk
        { wch: 15 }, // Leverancier
        { wch: 10 }, // Benodigd
        { wch: 8 },  // Eenheid
        { wch: 12 }, // Op Voorraad
        { wch: 15 }, // Status
        { wch: 10 }, // Tekort
        { wch: 12 }, // In Bestelling
        { wch: 12 }, // Stukprijs
        { wch: 12 }, // Totaal
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Stuklijst (BOM)');

      // Summary sheet
      const summaryData = [
        ['Project', project?.projectNumber || ''],
        ['Titel', project?.title || ''],
        ['Klant', client?.name || ''],
        ['Model', model?.name || ''],
        [''],
        ['Totaal artikelen', stats.total],
        ['Beschikbaar', stats.available],
        ['Met tekort', stats.withShortfall],
        ['In bestelling', stats.onOrder],
        [''],
        ['Totale waarde', `€ ${stats.totalValue.toFixed(2)}`],
        ['Beschikbaarheid', `${stats.availabilityPercent}%`],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Samenvatting');

      // Shortfall sheet (if any)
      if (stats.withShortfall > 0) {
        const shortfallData = bomLines
          .filter(l => l.shortfall > 0)
          .map(line => ({
            'Artikelnaam': line.name,
            'Artikelnummer': line.articleNo || '',
            'Leverancier': line.supplier || '',
            'Benodigd': line.quantityNeeded,
            'Op Voorraad': line.stockQty,
            'Tekort': line.shortfall,
            'In Bestelling': line.onOrder,
          }));
        const wsShortfall = XLSX.utils.json_to_sheet(shortfallData);
        wsShortfall['!cols'] = [
          { wch: 35 }, { wch: 15 }, { wch: 15 },
          { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, wsShortfall, 'Tekorten');
      }

      // Generate filename
      const date = new Date().toISOString().split('T')[0];
      const filename = `BOM-${project?.projectNumber || 'project'}-${date}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Er is een fout opgetreden bij het exporteren naar Excel.');
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    const text = filteredLines
      .map(l => `${l.category}\t${l.name}\t${l.quantityNeeded}\t${l.stockQty}\t${getStockStatusLabel(l.stockStatus)}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  if (!project) return null;

  // Sort header component
  const SortHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`cursor-pointer hover:bg-slate-100 select-none ${className}`}
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
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              Stuklijst (BOM)
            </DialogTitle>
            <DialogDescription>
              {project.projectNumber} - {project.title}
            </DialogDescription>
          </DialogHeader>

          <div className="flex h-[70vh]">
            {/* Left Panel - Stats & Filters */}
            <div className="w-64 border-r bg-slate-50 p-4 space-y-4 overflow-y-auto">
              {/* Availability Overview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    Beschikbaarheid
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-600">
                      {stats.availabilityPercent}%
                    </div>
                    <p className="text-xs text-slate-500">
                      {stats.available} van {stats.total} items
                    </p>
                  </div>
                  <Progress value={stats.availabilityPercent} className="h-2" />
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStockFilter('all')}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    stockFilter === 'all' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Alle items</span>
                    <span className="font-bold">{stats.total}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStockFilter('available')}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    stockFilter === 'available' ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">Beschikbaar</span>
                    </div>
                    <span className="font-bold text-green-600">{stats.available}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStockFilter('shortfall')}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    stockFilter === 'shortfall' ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm">Met tekort</span>
                    </div>
                    <span className="font-bold text-red-600">{stats.withShortfall}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStockFilter('ordered')}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    stockFilter === 'ordered' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm">In bestelling</span>
                    </div>
                    <span className="font-bold text-blue-600">{stats.onOrder}</span>
                  </div>
                </button>
              </div>

              <Separator />

              {/* Category Filter */}
              <div>
                <Label className="text-xs font-medium text-slate-500 uppercase">
                  Categorie
                </Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Alle categorieën" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle categorieën</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Total Value */}
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="pt-4">
                  <div className="text-xs text-emerald-600 font-medium uppercase">
                    Totale Waarde
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
                    {formatCurrency(stats.totalValue)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content - BOM Table */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search & Actions Bar */}
              <div className="px-4 py-3 border-b bg-white flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Zoek op naam, artikelnummer, merk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Kopieer naar klembord</TooltipContent>
                </Tooltip>
                <Button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>

              {/* Table */}
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow className="bg-slate-50">
                      <SortHeader field="category">Categorie</SortHeader>
                      <SortHeader field="name">Artikel</SortHeader>
                      <SortHeader field="quantityNeeded" className="text-center">Benodigd</SortHeader>
                      <TableHead className="text-center">Voorraad</TableHead>
                      <SortHeader field="stockStatus" className="text-center">Status</SortHeader>
                      <SortHeader field="shortfall" className="text-center">Tekort</SortHeader>
                      <SortHeader field="totalPrice" className="text-right">Totaal</SortHeader>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLines.map((line) => {
                      const statusColor = getStockStatusColor(line.stockStatus);
                      const statusLabel = getStockStatusLabel(line.stockStatus);

                      return (
                        <TableRow
                          key={line.id}
                          className="cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => setSelectedLine(line)}
                        >
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {line.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{line.name}</p>
                              {line.articleNo && (
                                <p className="text-xs text-slate-500 font-mono">{line.articleNo}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium">{line.quantityNeeded}</span>
                            <span className="text-slate-500 text-xs ml-1">{line.unit}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={line.stockQty < line.quantityNeeded ? 'text-red-600 font-bold' : ''}>
                              {line.stockQty}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${statusColor} border text-xs`}>
                              {line.stockStatus === 'in_stock' && <Check className="w-3 h-3 mr-1" />}
                              {line.stockStatus === 'low_stock' && <AlertTriangle className="w-3 h-3 mr-1" />}
                              {line.stockStatus === 'ordered' && <Truck className="w-3 h-3 mr-1" />}
                              {line.stockStatus === 'out_of_stock' && <X className="w-3 h-3 mr-1" />}
                              {statusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {line.shortfall > 0 ? (
                              <span className="text-red-600 font-bold">{line.shortfall}</span>
                            ) : (
                              <span className="text-green-600">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(line.totalPrice)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="w-4 h-4 text-slate-400" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {filteredLines.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Geen artikelen gevonden</p>
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              <div className="px-4 py-3 border-t bg-slate-50 flex items-center justify-between text-sm">
                <div className="text-slate-600">
                  {filteredLines.length} van {bomLines.length} artikelen
                </div>
                <div className="flex items-center gap-4">
                  {stats.withShortfall > 0 && (
                    <span className="text-red-600">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      {stats.totalShortfallItems} stuks tekort
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
            <Button variant="outline" onClick={onClose}>
              Sluiten
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="w-4 h-4 mr-2" />
                Download Excel
              </Button>
              {stats.withShortfall > 0 && (
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Bestel Tekorten ({stats.totalShortfallItems})
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Article Detail Sheet */}
      <ArticleDetailSheet
        bomLine={selectedLine}
        isOpen={!!selectedLine}
        onClose={() => setSelectedLine(null)}
      />
    </TooltipProvider>
  );
}

export default ProjectBOMGenerator;
