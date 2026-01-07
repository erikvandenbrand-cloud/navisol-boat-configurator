'use client';

import { useState, useRef } from 'react';
import {
  Settings as SettingsIcon, Building, Percent, Truck, Calendar,
  Download, Upload, FileJson, FileSpreadsheet, Trash2, AlertTriangle,
  Check, X
} from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { exportArticlesToCSV, parseCSVToArticles } from '@/lib/persistence';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

export function Settings() {
  const { settings, updateSettings, articles, exportAllData, importAllData, importArticles } = useNavisol();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Export all data as JSON
  const handleExportJSON = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `navisol-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export articles as CSV
  const handleExportCSV = () => {
    const csv = exportArticlesToCSV(articles);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `navisol-articles-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON data
  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importAllData(content);
      setImportResult({
        success,
        message: success
          ? 'Data imported successfully! All articles, configurations, and settings have been restored.'
          : 'Failed to import data. Please check the file format.',
      });
      setTimeout(() => setImportResult(null), 5000);
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Import CSV articles
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsedArticles = parseCSVToArticles(content);
      const count = importArticles(parsedArticles);
      setImportResult({
        success: count > 0,
        message: count > 0
          ? `Successfully imported ${count} articles from CSV.`
          : 'No valid articles found in the CSV file.',
      });
      setTimeout(() => setImportResult(null), 5000);
    };
    reader.readAsText(file);

    // Reset input
    if (csvInputRef.current) {
      csvInputRef.current.value = '';
    }
  };

  // Clear all data
  const handleClearData = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <SettingsIcon className="h-7 w-7 text-slate-600" />
          Settings
        </h1>
        <p className="text-slate-600">Configure global settings for the Navisol system</p>
      </div>

      {/* Import Result Alert */}
      {importResult && (
        <Alert variant={importResult.success ? "default" : "destructive"}>
          {importResult.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          <AlertTitle>{importResult.success ? 'Success' : 'Error'}</AlertTitle>
          <AlertDescription>{importResult.message}</AlertDescription>
        </Alert>
      )}

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>Details shown on quotations and documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => updateSettings({ company_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="company_phone">Phone</Label>
              <Input
                id="company_phone"
                value={settings.company_phone}
                onChange={(e) => updateSettings({ company_phone: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="company_address">Address</Label>
            <Input
              id="company_address"
              value={settings.company_address}
              onChange={(e) => updateSettings({ company_address: e.target.value })}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Pricing & Tax
          </CardTitle>
          <CardDescription>Default pricing and tax settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={(e) => updateSettings({ currency: e.target.value })}
                className="mt-1"
                disabled
              />
              <p className="text-xs text-slate-500 mt-1">Currently only EUR is supported</p>
            </div>
            <div>
              <Label htmlFor="vat_rate">VAT Rate (%)</Label>
              <Input
                id="vat_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.vat_rate * 100}
                onChange={(e) => updateSettings({ vat_rate: Number.parseFloat(e.target.value) / 100 || 0.21 })}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Default: 21%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Terms
          </CardTitle>
          <CardDescription>Default delivery and quotation settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="delivery_terms">Delivery Terms</Label>
              <Input
                id="delivery_terms"
                value={settings.delivery_terms}
                onChange={(e) => updateSettings({ delivery_terms: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="validity_days">Quotation Validity (days)</Label>
              <Input
                id="validity_days"
                type="number"
                min="1"
                value={settings.quotation_validity_days}
                onChange={(e) => updateSettings({ quotation_validity_days: Number.parseInt(e.target.value) || 30 })}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locale Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {settings.language === 'nl' ? 'Taal & Opmaak' : 'Locale & Formatting'}
          </CardTitle>
          <CardDescription>
            {settings.language === 'nl' ? 'Regionale opmaakvoorkeuren' : 'Regional formatting preferences'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{settings.language === 'nl' ? 'Taal' : 'Language'}</Label>
              <Select
                value={settings.language}
                onValueChange={(v) => updateSettings({ language: v as 'en' | 'nl' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nl">
                    <span className="flex items-center gap-2">
                      🇳🇱 Nederlands
                    </span>
                  </SelectItem>
                  <SelectItem value="en">
                    <span className="flex items-center gap-2">
                      🇬🇧 English
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {settings.language === 'nl' ? 'Interface en documenten taal' : 'Interface and document language'}
              </p>
            </div>
            <div>
              <Label>{settings.language === 'nl' ? 'Getalnotatie' : 'Number Format'}</Label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg border text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">{settings.language === 'nl' ? 'Duizendtallen:' : 'Thousands:'}</span>
                  <Badge variant="outline">. (dot)</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{settings.language === 'nl' ? 'Decimalen:' : 'Decimals:'}</span>
                  <Badge variant="outline">, (comma)</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{settings.language === 'nl' ? 'Voorbeeld:' : 'Example:'}</span>
                  <span className="font-mono">€ 12.345,67</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Label>{settings.language === 'nl' ? 'Datumnotatie' : 'Date Format'}</Label>
            <div className="mt-1 p-3 bg-slate-50 rounded-lg border text-sm grid grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="text-slate-500">{settings.language === 'nl' ? 'Formaat:' : 'Format:'}</span>
                <Badge variant="outline">DD-MM-YYYY</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{settings.language === 'nl' ? 'Tijdzone:' : 'Timezone:'}</span>
                <Badge variant="outline">Europe/Amsterdam</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>Export, import, and backup your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Section */}
          <div>
            <h4 className="font-medium mb-3">Export Data</h4>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExportJSON} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export All (JSON)
              </Button>
              <Button onClick={handleExportCSV} variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Articles (CSV)
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              JSON export includes all data: articles, configurations, CE documents, and settings.
            </p>
          </div>

          <Separator />

          {/* Import Section */}
          <div>
            <h4 className="font-medium mb-3">Import Data</h4>
            <div className="flex flex-wrap gap-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                  id="json-import"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import JSON Backup
                </Button>
              </div>
              <div>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                  id="csv-import"
                />
                <Button
                  onClick={() => csvInputRef.current?.click()}
                  variant="outline"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import Articles (CSV)
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              CSV import adds articles to existing database. JSON import replaces all data.
            </p>
          </div>

          <Separator />

          {/* Reset to Defaults */}
          <div>
            <h4 className="font-medium text-teal-700 mb-3 flex items-center gap-2">
              Reset Options
            </h4>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setShowClearDialog(true)}
                variant="outline"
                className="border-teal-300 text-teal-700 hover:bg-teal-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset to Sample Data
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Clears all stored data and reloads with fresh Eagle Boats sample data (10 models, sample articles, and article groups).
            </p>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div>
            <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </h4>
            <Button
              onClick={() => setShowClearDialog(true)}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
            <p className="text-xs text-red-500 mt-2">
              This will permanently delete all articles, configurations, and settings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-500">Articles</p>
              <p className="font-semibold text-lg">{articles.length}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-500">Version</p>
              <p className="font-semibold text-lg">1.0.0</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-500">Storage</p>
              <p className="font-semibold text-lg">localStorage</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-500">Locale</p>
              <p className="font-semibold text-lg">EU / EUR</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear Data Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Reset to Sample Data
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>This will clear all stored data and reload the application with fresh sample data:</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>10 Eagle Boats models (TS, Classic, SG, Hybruut series)</li>
                <li>Sample parts database with compatibility settings</li>
                <li>Sample article groups/kits</li>
                <li>Default settings and templates</li>
              </ul>
              <p className="text-amber-600 font-medium mt-3">Any custom data you have added will be lost.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="default" className="bg-teal-600 hover:bg-teal-700" onClick={handleClearData}>
              Reset & Reload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
