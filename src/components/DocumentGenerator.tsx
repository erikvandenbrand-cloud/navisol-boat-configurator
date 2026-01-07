'use client';

import { useState, useMemo } from 'react';
import { FileText, Download, Printer, Copy, Check, ClipboardList, Receipt, FileDown, Users, Mail } from 'lucide-react';
import { useNavisol } from '@/lib/store';
import {
  generatePartsList,
  generateEquipmentList,
  generateQuotation,
  compareConfigurations
} from '@/lib/document-generators';
import { exportToPDF } from '@/lib/pdf-export';
import { exportQuotationToPDF } from '@/components/QuotationTemplate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { BoatConfiguration } from '@/lib/types';
import { EmailQuotationButton } from '@/components/EmailQuotation';

interface DocumentGeneratorProps {
  type: 'parts-list' | 'equipment-list' | 'quotation' | 'comparison';
}

export function DocumentGenerator({ type }: DocumentGeneratorProps) {
  const { configurations, selectedItems, currentConfig, settings, clients, getClientById } = useNavisol();
  const [selectedConfigId, setSelectedConfigId] = useState<string>('current');
  const [compareConfigId, setCompareConfigId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('none');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [seller, setSeller] = useState('Erik van den Brand');
  const [generatedDoc, setGeneratedDoc] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Get selected client
  const selectedClient = useMemo(() => {
    if (!selectedClientId || selectedClientId === 'none') return null;
    return getClientById(selectedClientId);
  }, [selectedClientId, getClientById]);

  // Get the active configuration
  const activeConfig = useMemo((): BoatConfiguration | null => {
    if (selectedConfigId === 'current') {
      if (!currentConfig.boat_model) return null;
      return {
        id: 'temp',
        name: currentConfig.name || `${currentConfig.boat_model} ${currentConfig.propulsion_type || 'Electric'}`,
        boat_model: currentConfig.boat_model!,
        propulsion_type: currentConfig.propulsion_type || 'Electric',
        steering_type: currentConfig.steering_type || 'Hydraulic',
        items: selectedItems,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return configurations.find(c => c.id === selectedConfigId) || null;
  }, [selectedConfigId, currentConfig, selectedItems, configurations]);

  const compareConfig = useMemo(() => {
    return configurations.find(c => c.id === compareConfigId) || null;
  }, [compareConfigId, configurations]);

  const handleGenerate = () => {
    if (!activeConfig) return;

    let doc = '';
    switch (type) {
      case 'parts-list':
        doc = generatePartsList(activeConfig, settings);
        break;
      case 'equipment-list':
        doc = generateEquipmentList(activeConfig);
        break;
      case 'quotation':
        const result = generateQuotation(activeConfig, settings, customerName, customerAddress, notes);
        doc = result.markdown;
        break;
      case 'comparison':
        if (compareConfig) {
          doc = compareConfigurations(activeConfig, compareConfig, settings);
        }
        break;
    }
    setGeneratedDoc(doc);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedDoc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${type.replace('-', ' ').toUpperCase()}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              h1 { color: #1e293b; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
              h2 { color: #334155; margin-top: 30px; }
              h3 { color: #475569; }
              table { border-collapse: collapse; width: 100%; margin: 20px 0; }
              th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
              th { background: #f8fafc; font-weight: 600; }
              .summary { background: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 30px; }
              hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
            </style>
          </head>
          <body>
            ${markdownToHtml(generatedDoc)}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportPDF = async () => {
    if (!generatedDoc || !activeConfig) return;

    // Use professional template for quotations
    if (type === 'quotation') {
      await exportQuotationToPDF(activeConfig, settings, selectedClient, undefined, seller);
      return;
    }

    const filename = `navisol-${type}-${activeConfig.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`;
    await exportToPDF(generatedDoc, filename, getTitle());
  };

  const getTitle = () => {
    switch (type) {
      case 'parts-list': return 'Parts List Generator';
      case 'equipment-list': return 'Equipment List Generator';
      case 'quotation': return 'Quotation Generator';
      case 'comparison': return 'Cost Comparison';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'parts-list': return 'Generate detailed internal parts list with pricing and margins';
      case 'equipment-list': return 'Generate customer-friendly equipment list without prices';
      case 'quotation': return 'Generate professional quotation with VAT and totals';
      case 'comparison': return 'Compare costs between two configurations';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'parts-list': return ClipboardList;
      case 'equipment-list': return FileText;
      case 'quotation': return Receipt;
      case 'comparison': return FileText;
    }
  };

  const Icon = getIcon();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Icon className="h-7 w-7 text-emerald-600" />
          {getTitle()}
        </h1>
        <p className="text-slate-600">{getDescription()}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Configuration</Label>
              <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select configuration" />
                </SelectTrigger>
                <SelectContent>
                  {currentConfig.boat_model && (
                    <SelectItem value="current">
                      Current Configuration
                      <Badge variant="secondary" className="ml-2 text-xs">Active</Badge>
                    </SelectItem>
                  )}
                  {configurations.map(config => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === 'comparison' && (
              <div>
                <Label>Compare With</Label>
                <Select value={compareConfigId} onValueChange={setCompareConfigId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select configuration to compare" />
                  </SelectTrigger>
                  <SelectContent>
                    {configurations.filter(c => c.id !== selectedConfigId).map(config => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === 'quotation' && (
              <>
                <Separator />
                <div>
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Select Client
                  </Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a client (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client selected</SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name || `${client.first_name} ${client.last_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedClient && (
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedClient.city}, {selectedClient.country}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="seller">Verkoper (Seller)</Label>
                  <Input
                    id="seller"
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                    placeholder="Seller name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any additional notes"
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </>
            )}

            <Button
              onClick={handleGenerate}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={!activeConfig || (type === 'comparison' && !compareConfig)}
            >
              Generate Document
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Document Preview</CardTitle>
            {generatedDoc && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1" />
                  Print
                </Button>
                {type === 'quotation' && activeConfig && (
                  <EmailQuotationButton
                    configuration={activeConfig}
                    client={selectedClient}
                  />
                )}
                <Button size="sm" onClick={handleExportPDF} className="bg-emerald-600 hover:bg-emerald-700">
                  <FileDown className="h-4 w-4 mr-1" />
                  Export PDF
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {generatedDoc ? (
              <ScrollArea className="h-[600px] border rounded-lg p-4 bg-white">
                <div
                  className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-table:text-sm"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(generatedDoc) }}
                />
              </ScrollArea>
            ) : (
              <div className="h-[600px] border rounded-lg flex items-center justify-center bg-slate-50">
                <div className="text-center text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Select a configuration and click "Generate Document" to preview</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    // Line breaks
    .replace(/  \n/g, '<br>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Checkboxes
    .replace(/\[ \]/g, '&#9744;')
    .replace(/\[x\]/g, '&#9745;')
    // Paragraphs
    .split('\n\n').join('</p><p>');

  // Tables
  const tableRegex = /\|(.+)\|\n\|[-| ]+\|\n((\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (match, header, body) => {
    const headerCells = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
    const bodyRows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  // Wrap lists
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  return `<p>${html}</p>`;
}
