'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Upload, Download, Package, Users, FileSpreadsheet, Database,
  Check, X, AlertCircle, FileText, Trash2, Plus, Save, Copy,
  ChevronRight, RefreshCw, Eye, Edit, Ship, Zap, Settings
} from 'lucide-react';
import { useStoreV3 } from '@/lib/store-v3';
import { useNavisol } from '@/lib/store';
import type { Client, BoatModel, EquipmentItem } from '@/lib/types-v3';
import type { Article, QuantityUnit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

// ============================================
// TYPES
// ============================================

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface EquipmentTemplate {
  id: string;
  name: string;
  modelId: string;
  modelName: string;
  description: string;
  items: Omit<EquipmentItem, 'id'>[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CSV PARSING HELPERS
// ============================================

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));
  const rows = lines.slice(1).map(line => parseRow(line).map(cell => cell.replace(/['"]/g, '')));

  return { headers, rows };
}

function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (val: string | number) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map(row => row.map(escape).join(','));
  return [headerLine, ...dataLines].join('\n');
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// STORAGE FOR TEMPLATES
// ============================================

const TEMPLATES_STORAGE_KEY = 'navisol_equipment_templates';

function loadTemplates(): EquipmentTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: EquipmentTemplate[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DataManagement() {
  const [activeTab, setActiveTab] = useState('import');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-emerald-600" />
          Data Management
        </h1>
        <p className="text-slate-600 mt-1">
          Import, export, and manage your business data
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="import" className="gap-2">
            <Upload className="w-4 h-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="w-4 h-4" />
            Export & Backup
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Package className="w-4 h-4" />
            Equipment Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <ImportSection />
        </TabsContent>

        <TabsContent value="export">
          <ExportSection />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// IMPORT SECTION
// ============================================

function ImportSection() {
  const { addClient, clients } = useStoreV3();
  const { addArticle, articles } = useNavisol();

  const [importType, setImportType] = useState<'clients' | 'articles'>('clients');
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [fileName, setFileName] = useState('');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clientFields = [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'type', label: 'Type (company/private)', required: false },
    { key: 'street', label: 'Street', required: false },
    { key: 'postalCode', label: 'Postal Code', required: false },
    { key: 'city', label: 'City', required: false },
    { key: 'country', label: 'Country', required: false },
    { key: 'vatNumber', label: 'VAT Number', required: false },
  ];

  const articleFields = [
    { key: 'part_name', label: 'Part Name', required: true },
    { key: 'manufacturer_article_no', label: 'Part Number', required: false },
    { key: 'description', label: 'Description', required: false },
    { key: 'category', label: 'Category', required: false },
    { key: 'unit', label: 'Unit', required: false },
    { key: 'purchase_price', label: 'Purchase Price', required: false },
    { key: 'selling_price', label: 'Selling Price', required: false },
    { key: 'stock_qty', label: 'Stock Quantity', required: false },
    { key: 'min_stock_level', label: 'Min Stock Level', required: false },
    { key: 'supplier', label: 'Supplier', required: false },
    { key: 'brand', label: 'Brand', required: false },
  ];

  const fields = importType === 'clients' ? clientFields : articleFields;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setCsvData(parsed);

      // Auto-map columns based on header names
      const autoMapping: Record<string, string> = {};
      for (const field of fields) {
        const matchingHeader = parsed.headers.find(h =>
          h.toLowerCase().includes(field.key.toLowerCase()) ||
          h.toLowerCase().includes(field.label.toLowerCase())
        );
        if (matchingHeader) {
          autoMapping[field.key] = matchingHeader;
        }
      }
      setColumnMapping(autoMapping);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvData) return;

    setIsImporting(true);
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i];
      try {
        if (importType === 'clients') {
          const getValue = (field: string) => {
            const header = columnMapping[field];
            if (!header) return '';
            const idx = csvData.headers.indexOf(header);
            return idx >= 0 ? row[idx] || '' : '';
          };

          const name = getValue('name');
          if (!name) {
            result.failed++;
            result.errors.push(`Row ${i + 2}: Missing required field 'name'`);
            continue;
          }

          // Check for duplicates
          const exists = clients.some(c => c.name.toLowerCase() === name.toLowerCase());
          if (exists) {
            result.failed++;
            result.errors.push(`Row ${i + 2}: Client '${name}' already exists`);
            continue;
          }

          addClient({
            name,
            email: getValue('email'),
            phone: getValue('phone'),
            type: getValue('type') === 'company' ? 'company' : 'private',
            street: getValue('street'),
            postalCode: getValue('postalCode'),
            city: getValue('city'),
            country: getValue('country') || 'Netherlands',
            vatNumber: getValue('vatNumber'),
            status: 'active',
          });
          result.success++;
        } else {
          const getValue = (field: string) => {
            const header = columnMapping[field];
            if (!header) return '';
            const idx = csvData.headers.indexOf(header);
            return idx >= 0 ? row[idx] || '' : '';
          };

          const partName = getValue('part_name');
          if (!partName) {
            result.failed++;
            result.errors.push(`Row ${i + 2}: Missing required field 'part_name'`);
            continue;
          }

          addArticle({
            part_name: partName,
            manufacturer_article_no: getValue('manufacturer_article_no'),
            category: getValue('category') || 'General',
            subcategory: '',
            quantity_unit: (getValue('unit') || 'pcs') as QuantityUnit,
            purchase_price_excl_vat: parseFloat(getValue('purchase_price')) || 0,
            sales_price_excl_vat: parseFloat(getValue('selling_price')) || 0,
            currency: 'EUR',
            price_calculation: 'fixed',
            electric_compatible: true,
            diesel_compatible: true,
            hybrid_compatible: true,
            stock_qty: parseInt(getValue('stock_qty')) || 0,
            min_stock_level: parseInt(getValue('min_stock_level')) || 0,
            supplier: getValue('supplier'),
            brand: getValue('brand'),
            stock_status: 'in_stock',
            parts_list_category: getValue('category') || 'General',
            parts_list_subcategory: '',
            boat_model_compat: [],
            standard_or_optional: 'Standard',
          });
          result.success++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setImportResult(result);
    setIsImporting(false);
  };

  const resetImport = () => {
    setCsvData(null);
    setFileName('');
    setColumnMapping({});
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Import Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Data Type</CardTitle>
          <CardDescription>Choose what type of data you want to import</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => { setImportType('clients'); resetImport(); }}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                importType === 'clients'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Users className={`w-8 h-8 mx-auto mb-2 ${importType === 'clients' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <p className="font-medium">Clients</p>
              <p className="text-sm text-slate-500">{clients.length} existing</p>
            </button>
            <button
              type="button"
              onClick={() => { setImportType('articles'); resetImport(); }}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                importType === 'articles'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Package className={`w-8 h-8 mx-auto mb-2 ${importType === 'articles' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <p className="font-medium">Articles / Parts</p>
              <p className="text-sm text-slate-500">{articles.length} existing</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload CSV File</CardTitle>
          <CardDescription>
            Upload a CSV file with your {importType === 'clients' ? 'client' : 'parts'} data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-emerald-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="font-medium text-slate-700">
                {fileName || 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm text-slate-500 mt-1">CSV file (comma or semicolon separated)</p>
            </label>
          </div>

          {/* Sample CSV Format */}
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertTitle>Expected CSV Format</AlertTitle>
            <AlertDescription>
              <p className="mb-2">Your CSV should have headers matching these fields:</p>
              <code className="text-xs bg-slate-100 p-2 rounded block overflow-x-auto">
                {fields.map(f => f.label).join(', ')}
              </code>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {csvData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Map Columns</CardTitle>
            <CardDescription>
              Match your CSV columns to the system fields. Found {csvData.rows.length} rows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {fields.map(field => (
                <div key={field.key} className="flex items-center gap-2">
                  <Label className="w-32 text-sm">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Select
                    value={columnMapping[field.key] || ''}
                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, [field.key]: v }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Not mapped --</SelectItem>
                      {csvData.headers.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="mt-6">
              <h4 className="font-medium mb-2">Preview (first 5 rows)</h4>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvData.headers.map(h => (
                        <TableHead key={h} className="text-xs">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-xs">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Import Button */}
            <div className="flex justify-between items-center mt-6">
              <Button variant="outline" onClick={resetImport}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || !columnMapping[fields[0].key]}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isImporting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Import {csvData.rows.length} {importType}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Alert className={importResult.failed > 0 ? 'border-yellow-500' : 'border-green-500'}>
          {importResult.failed > 0 ? (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          ) : (
            <Check className="h-4 w-4 text-green-500" />
          )}
          <AlertTitle>Import Complete</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Successfully imported <strong>{importResult.success}</strong> {importType}.
              {importResult.failed > 0 && (
                <span className="text-yellow-600"> {importResult.failed} failed.</span>
              )}
            </p>
            {importResult.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-slate-600">View errors</summary>
                <ul className="mt-2 text-xs text-red-600 list-disc pl-4">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importResult.errors.length > 10 && (
                    <li>...and {importResult.errors.length - 10} more</li>
                  )}
                </ul>
              </details>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ============================================
// EXPORT SECTION
// ============================================

function ExportSection() {
  const { projects, clients } = useStoreV3();
  const { articles } = useNavisol();

  const exportClients = () => {
    const headers = ['Name', 'Email', 'Phone', 'Type', 'Street', 'Postal Code', 'City', 'Country', 'VAT Number', 'Status'];
    const rows = clients.map(c => [
      c.name, c.email || '', c.phone || '', c.type, c.street || '',
      c.postalCode || '', c.city || '', c.country, c.vatNumber || '', c.status
    ]);
    const csv = generateCSV(headers, rows);
    downloadFile(csv, `navisol-clients-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const exportArticles = () => {
    const headers = ['Part Number', 'Part Name', 'Category', 'Unit', 'Purchase Price', 'Selling Price', 'Stock Qty', 'Min Stock', 'Supplier', 'Brand'];
    const rows = articles.map(a => [
      a.manufacturer_article_no || '', a.part_name, a.category || '',
      a.quantity_unit || 'pcs', a.purchase_price_excl_vat || 0, a.sales_price_excl_vat || 0, a.stock_qty || 0,
      a.min_stock_level || 0, a.supplier || '', a.brand || ''
    ]);
    const csv = generateCSV(headers, rows);
    downloadFile(csv, `navisol-articles-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const exportProjects = () => {
    const headers = ['Project Number', 'Title', 'Type', 'Status', 'Client', 'Model', 'Total Value', 'Created Date'];
    const rows = projects.map(p => {
      const client = clients.find(c => c.id === p.clientId);
      return [
        p.projectNumber, p.title, p.projectType, p.status, client?.name || '',
        p.modelId || 'Custom', p.equipment.totalInclVat, p.createdAt.split('T')[0]
      ];
    });
    const csv = generateCSV(headers, rows);
    downloadFile(csv, `navisol-projects-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const exportFullBackup = () => {
    const backup = {
      exportDate: new Date().toISOString(),
      version: '3.0',
      data: {
        clients,
        articles,
        projects,
        templates: loadTemplates(),
      }
    };
    const json = JSON.stringify(backup, null, 2);
    downloadFile(json, `navisol-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  return (
    <div className="space-y-6">
      {/* Quick Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Export</CardTitle>
          <CardDescription>Download individual data sets as CSV files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={exportClients}
              className="p-4 border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
            >
              <Users className="w-8 h-8 text-purple-600 mb-2" />
              <p className="font-medium">Export Clients</p>
              <p className="text-sm text-slate-500">{clients.length} clients</p>
            </button>
            <button
              type="button"
              onClick={exportArticles}
              className="p-4 border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
            >
              <Package className="w-8 h-8 text-blue-600 mb-2" />
              <p className="font-medium">Export Articles</p>
              <p className="text-sm text-slate-500">{articles.length} parts</p>
            </button>
            <button
              type="button"
              onClick={exportProjects}
              className="p-4 border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
            >
              <Ship className="w-8 h-8 text-emerald-600 mb-2" />
              <p className="font-medium">Export Projects</p>
              <p className="text-sm text-slate-500">{projects.length} projects</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Full Backup */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            Full System Backup
          </CardTitle>
          <CardDescription>
            Download a complete backup of all your data (JSON format)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">
                Includes: {clients.length} clients, {articles.length} articles, {projects.length} projects
              </p>
              <p className="text-xs text-slate-500 mt-1">
                This backup can be used to restore your data or migrate to a new system
              </p>
            </div>
            <Button onClick={exportFullBackup} className="bg-emerald-600 hover:bg-emerald-700">
              <Download className="w-4 h-4 mr-2" />
              Download Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-slate-900">{clients.length}</p>
              <p className="text-sm text-slate-600">Clients</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-slate-900">{articles.length}</p>
              <p className="text-sm text-slate-600">Articles</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-slate-900">{projects.length}</p>
              <p className="text-sm text-slate-600">Projects</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-slate-900">{loadTemplates().length}</p>
              <p className="text-sm text-slate-600">Templates</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// TEMPLATES SECTION
// ============================================

function TemplatesSection() {
  const { models } = useStoreV3();
  const { articles } = useNavisol();

  const [templates, setTemplates] = useState<EquipmentTemplate[]>(() => loadTemplates());
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EquipmentTemplate | null>(null);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateItems, setTemplateItems] = useState<(Omit<EquipmentItem, 'id'> & { tempId: string })[]>([]);

  const selectedModel = models.find(m => m.id === selectedModelId);

  const categories = useMemo(() => {
    const cats = new Set(articles.map(a => a.category || 'General'));
    return Array.from(cats).sort();
  }, [articles]);

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setSelectedModelId('');
    setTemplateName('');
    setTemplateDescription('');
    setTemplateItems([]);
  };

  const handleEditTemplate = (template: EquipmentTemplate) => {
    setIsCreating(true);
    setEditingTemplate(template);
    setSelectedModelId(template.modelId);
    setTemplateName(template.name);
    setTemplateDescription(template.description);
    setTemplateItems(template.items.map((item, i) => ({ ...item, tempId: `temp-${i}` })));
  };

  const handleAddItem = () => {
    setTemplateItems(prev => [
      ...prev,
      {
        tempId: `temp-${Date.now()}`,
        category: 'General',
        name: '',
        description: '',
        quantity: 1,
        unit: 'pcs',
        unitPriceExclVat: 0,
        lineTotalExclVat: 0,
        isStandard: true,
        isOptional: false,
        isIncluded: true,
        ceRelevant: false,
        safetyCritical: false,
        sortOrder: prev.length,
      }
    ]);
  };

  const handleAddFromArticle = (article: Article) => {
    setTemplateItems(prev => [
      ...prev,
      {
        tempId: `temp-${Date.now()}`,
        articleId: article.id,
        category: article.category || 'General',
        name: article.part_name,
        description: '',
        quantity: 1,
        unit: article.quantity_unit || 'pcs',
        unitPriceExclVat: article.sales_price_excl_vat || 0,
        lineTotalExclVat: article.sales_price_excl_vat || 0,
        isStandard: true,
        isOptional: false,
        isIncluded: true,
        ceRelevant: false,
        safetyCritical: false,
        sortOrder: prev.length,
      }
    ]);
  };

  const handleRemoveItem = (tempId: string) => {
    setTemplateItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  const handleUpdateItem = (tempId: string, updates: Partial<Omit<EquipmentItem, 'id'>>) => {
    setTemplateItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      const updated = { ...item, ...updates };
      if (updates.quantity !== undefined || updates.unitPriceExclVat !== undefined) {
        updated.lineTotalExclVat = updated.quantity * updated.unitPriceExclVat;
      }
      return updated;
    }));
  };

  const handleSaveTemplate = () => {
    if (!selectedModelId || !templateName || templateItems.length === 0) return;

    const model = models.find(m => m.id === selectedModelId);
    if (!model) return;

    const newTemplate: EquipmentTemplate = {
      id: editingTemplate?.id || `template-${Date.now()}`,
      name: templateName,
      modelId: selectedModelId,
      modelName: model.name,
      description: templateDescription,
      items: templateItems.map(({ tempId, ...item }) => item),
      createdAt: editingTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTemplates = editingTemplate
      ? templates.map(t => t.id === editingTemplate.id ? newTemplate : t)
      : [...templates, newTemplate];

    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
    setIsCreating(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    const updatedTemplates = templates.filter(t => t.id !== id);
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
  };

  const handleDuplicateTemplate = (template: EquipmentTemplate) => {
    const newTemplate: EquipmentTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
  };

  const totalValue = templateItems.reduce((sum, i) => sum + i.lineTotalExclVat, 0);

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {editingTemplate ? 'Edit Template' : 'Create Equipment Template'}
            </h2>
            <p className="text-slate-600 text-sm">Define a reusable equipment package for a boat model</p>
          </div>
          <Button variant="outline" onClick={() => setIsCreating(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Boat Model *</Label>
                <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.filter(m => m.isActive).map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} ({model.range})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Standard Package, Premium Package"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this template includes..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Equipment Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Equipment Items</CardTitle>
                <CardDescription>{templateItems.length} items, Total: €{totalValue.toFixed(2)}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select onValueChange={(id) => {
                  const article = articles.find(a => a.id === id);
                  if (article) handleAddFromArticle(article);
                }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add from catalog" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <React.Fragment key={cat}>
                        <SelectItem value={`__cat_${cat}`} disabled className="font-semibold">{cat}</SelectItem>
                        {articles.filter(a => (a.category || 'General') === cat).slice(0, 20).map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.part_name}</SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleAddItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {templateItems.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No items added yet</p>
                <p className="text-sm">Add items from the catalog or create custom items</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Std</TableHead>
                    <TableHead className="text-center">Opt</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateItems.map(item => (
                    <TableRow key={item.tempId}>
                      <TableCell>
                        <Input
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.tempId, { name: e.target.value })}
                          className="w-full"
                          placeholder="Item name"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.category}
                          onValueChange={(v) => handleUpdateItem(item.tempId, { category: v })}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['Base', 'Propulsion', 'Electrical', 'Safety', 'Navigation', 'Comfort', 'Deck', 'General'].map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.tempId, { quantity: parseInt(e.target.value) || 0 })}
                          className="w-16 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unitPriceExclVat}
                          onChange={(e) => handleUpdateItem(item.tempId, { unitPriceExclVat: parseFloat(e.target.value) || 0 })}
                          className="w-24 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        €{item.lineTotalExclVat.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={item.isStandard}
                          onCheckedChange={(c) => handleUpdateItem(item.tempId, { isStandard: !!c })}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={item.isOptional}
                          onCheckedChange={(c) => handleUpdateItem(item.tempId, { isOptional: !!c })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.tempId)}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsCreating(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveTemplate}
            disabled={!selectedModelId || !templateName || templateItems.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Equipment Templates</h2>
          <p className="text-slate-600 text-sm">Reusable equipment packages for each boat model</p>
        </div>
        <Button onClick={handleStartCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No templates created yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Create templates to quickly apply standard equipment packages to new projects
            </p>
            <Button onClick={handleStartCreate} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Ship className="w-4 h-4" />
                      {template.modelName}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{template.items.length} items</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {template.description && (
                  <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Total: <span className="font-mono font-medium text-emerald-600">
                      €{template.items.reduce((s, i) => s + i.lineTotalExclVat, 0).toFixed(2)}
                    </span>
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleDuplicateTemplate(template)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(template)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* How to Use */}
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertTitle>How to Use Templates</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal pl-4 mt-2 space-y-1 text-sm">
            <li>Create a template for each boat model (e.g., "Eagle 28TS Standard", "Eagle 28TS Premium")</li>
            <li>Add equipment items from your parts catalog or create custom items</li>
            <li>When creating a new project, the equipment will be auto-populated from the template</li>
            <li>You can still customize individual projects after creation</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default DataManagement;
