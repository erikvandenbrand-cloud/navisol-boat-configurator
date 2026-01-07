'use client';

import { useState, useMemo } from 'react';
import {
  FileCheck, FilePlus, FileText, Download, Printer, Copy, Check,
  Shield, ClipboardCheck, AlertTriangle, BookOpen, FileWarning, FileDown,
  Settings, Ship
} from 'lucide-react';
import { useNavisol } from '@/lib/store';
import {
  generateCEDeclaration,
  generateTechnicalFileSummary,
  generateOwnersManual
} from '@/lib/document-generators';
import {
  generateCEOwnersManual,
  generateEnhancedTechnicalFile
} from '@/lib/ce-manual-generator';
import { formatEuroDate } from '@/lib/formatting';
import { exportToPDF } from '@/lib/pdf-export';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import type { BoatConfiguration, CEDocument, VesselSpecification, ClientBoat } from '@/lib/types';
import { VesselSpecificationEditor } from '@/components/VesselSpecificationEditor';

interface CEDocumentsProps {
  type: 'ce-documents' | 'technical-file';
}

const DOCUMENT_TYPES = [
  { id: 'declaration_of_conformity', name: 'Declaration of Conformity', icon: Shield, description: 'EU Declaration of Conformity (RCD 2013/53/EU)' },
  { id: 'technical_file', name: 'Technical File', icon: FileText, description: 'Complete technical documentation package' },
  { id: 'enhanced_technical_file', name: 'Technical File (Enhanced)', icon: FileText, description: 'Enhanced technical dossier with full CE checklist' },
  { id: 'risk_assessment', name: 'Risk Assessment', icon: AlertTriangle, description: 'Hazard identification and risk evaluation' },
  { id: 'test_report', name: 'Test Report', icon: ClipboardCheck, description: 'Testing and verification results' },
  { id: 'user_manual', name: "Owner's Manual (Basic)", icon: BookOpen, description: 'Basic 8-chapter user manual' },
  { id: 'ce_owners_manual', name: "Owner's Manual (CE 15-Chapter)", icon: BookOpen, description: 'Full 15-chapter CE-compliant manual per RCD 2013/53/EU' },
];

const CE_REQUIREMENTS = [
  { id: 'stability', name: 'Stability & Buoyancy', standard: 'EN ISO 12217', status: 'required' },
  { id: 'hull', name: 'Hull Construction', standard: 'EN ISO 12215', status: 'required' },
  { id: 'electrical', name: 'Electrical Systems', standard: 'EN ISO 13297', status: 'required' },
  { id: 'fuel', name: 'Fuel Systems', standard: 'EN ISO 10088', status: 'conditional' },
  { id: 'fire', name: 'Fire Protection', standard: 'EN ISO 9094', status: 'required' },
  { id: 'nav_lights', name: 'Navigation Lights', standard: 'COLREG', status: 'required' },
  { id: 'hv_systems', name: 'High Voltage Systems', standard: 'EN ISO 16315', status: 'conditional' },
  { id: 'emissions', name: 'Exhaust Emissions', standard: 'EN ISO 8178', status: 'conditional' },
  { id: 'noise', name: 'Sound Emissions', standard: 'EN ISO 14509', status: 'conditional' },
];

export function CEDocuments({ type }: CEDocumentsProps) {
  const { configurations, ceDocuments, addCEDocument, currentConfig, selectedItems, settings, clientBoats, updateClientBoat } = useNavisol();
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [selectedDocType, setSelectedDocType] = useState<string>('declaration_of_conformity');
  const [generatedDoc, setGeneratedDoc] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showSpecEditor, setShowSpecEditor] = useState(false);
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');

  // Get the selected client boat for specification editing
  const selectedBoat = useMemo(() => {
    return clientBoats.find(b => b.id === selectedBoatId);
  }, [clientBoats, selectedBoatId]);

  // Handle saving vessel specification
  const handleSaveSpec = (spec: VesselSpecification) => {
    if (selectedBoatId) {
      updateClientBoat(selectedBoatId, { vessel_specification: spec });
    }
    setShowSpecEditor(false);
  };

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

  // State for generation options
  const [includeDiagrams, setIncludeDiagrams] = useState(true);
  const [printOptimized, setPrintOptimized] = useState(false);

  const handleGenerate = () => {
    if (!activeConfig) return;

    // Get vessel specification from selected boat if available
    const vesselSpec = selectedBoat?.vessel_specification;

    let doc = '';
    switch (selectedDocType) {
      case 'declaration_of_conformity':
        doc = generateCEDeclaration(activeConfig, settings);
        break;
      case 'technical_file':
        doc = generateTechnicalFileSummary(activeConfig, settings);
        break;
      case 'enhanced_technical_file':
        doc = generateEnhancedTechnicalFile(activeConfig, settings, vesselSpec);
        break;
      case 'user_manual':
        doc = generateOwnersManual(activeConfig, settings);
        break;
      case 'ce_owners_manual':
        doc = generateCEOwnersManual(activeConfig, settings, vesselSpec, {
          includeDiagramPlaceholders: includeDiagrams,
          printOptimized: printOptimized,
        });
        break;
      default:
        doc = generateCEDeclaration(activeConfig, settings);
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
            <title>CE Documentation</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              h1 { color: #1e293b; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; }
              h2 { color: #334155; margin-top: 30px; }
              h3 { color: #475569; }
              table { border-collapse: collapse; width: 100%; margin: 20px 0; }
              th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
              th { background: #f8fafc; font-weight: 600; }
              hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
              .signature { margin-top: 40px; }
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
    const docType = type === 'ce-documents' ? 'ce-declaration' : 'technical-file';
    const filename = `navisol-${docType}-${activeConfig.boat_model.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`;
    await exportToPDF(generatedDoc, filename, 'CE Documentation', {
      printOptimized: printOptimized,
    });
  };

  // Get requirements based on propulsion type
  const getApplicableRequirements = () => {
    if (!activeConfig) return CE_REQUIREMENTS.filter(r => r.status === 'required');

    return CE_REQUIREMENTS.filter(r => {
      if (r.status === 'required') return true;
      if (r.id === 'fuel' && (activeConfig.propulsion_type === 'Diesel' || activeConfig.propulsion_type === 'Hybrid')) return true;
      if (r.id === 'hv_systems' && (activeConfig.propulsion_type === 'Electric' || activeConfig.propulsion_type === 'Hybrid')) return true;
      if (r.id === 'emissions' && (activeConfig.propulsion_type === 'Diesel' || activeConfig.propulsion_type === 'Hybrid')) return true;
      if (r.id === 'noise' && activeConfig.propulsion_type === 'Diesel') return true;
      return false;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          {type === 'ce-documents' ? (
            <>
              <FileCheck className="h-7 w-7 text-blue-600" />
              CE Documentation
            </>
          ) : (
            <>
              <FileText className="h-7 w-7 text-blue-600" />
              Technical File
            </>
          )}
        </h1>
        <p className="text-slate-600">
          {type === 'ce-documents'
            ? 'Generate and manage CE compliance documentation (RCD 2013/53/EU)'
            : 'Generate technical file documentation for CE certification'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Configuration & Requirements */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select configuration" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentConfig.boat_model && (
                      <SelectItem value="current">
                        Current: {currentConfig.boat_model} {currentConfig.propulsion_type}
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

              {activeConfig && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Model:</span>
                    <span className="font-medium">{activeConfig.boat_model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Propulsion:</span>
                    <Badge variant="outline">{activeConfig.propulsion_type}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Components:</span>
                    <span className="font-medium">{activeConfig.items.length}</span>
                  </div>
                </div>
              )}

              {type === 'technical-file' && (
                <div className="pt-2">
                  <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Generation Options */}
              {(selectedDocType === 'ce_owners_manual' || selectedDocType === 'enhanced_technical_file') && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm font-medium text-slate-700">Generation Options</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Include diagram placeholders</span>
                    <Switch
                      checked={includeDiagrams}
                      onCheckedChange={setIncludeDiagrams}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Print-optimized layout</span>
                    <Switch
                      checked={printOptimized}
                      onCheckedChange={setPrintOptimized}
                    />
                  </div>
                  {selectedBoat?.vessel_specification && (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Using vessel specification from {selectedBoat.boat_name || selectedBoat.boat_model}
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!activeConfig}
              >
                Generate Document
              </Button>
            </CardContent>
          </Card>

          {/* Vessel Specification Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ship className="h-5 w-5 text-teal-600" />
                Vessel Specification
              </CardTitle>
              <CardDescription>
                Edit detailed vessel data for CE manual generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vessel" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientBoats.map(boat => (
                      <SelectItem key={boat.id} value={boat.id}>
                        {boat.boat_name || boat.boat_model} - {boat.hull_identification_number || 'No HIN'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBoat && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Model:</span>
                    <span className="font-medium">{selectedBoat.boat_model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Specification:</span>
                    <Badge variant={selectedBoat.vessel_specification ? 'default' : 'secondary'}>
                      {selectedBoat.vessel_specification ? 'Configured' : 'Not set'}
                    </Badge>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setShowSpecEditor(true)}
                className="w-full bg-teal-600 hover:bg-teal-700"
                disabled={!selectedBoatId}
              >
                <Settings className="h-4 w-4 mr-2" />
                {selectedBoat?.vessel_specification ? 'Edit Specification' : 'Create Specification'}
              </Button>
            </CardContent>
          </Card>

          {/* Applicable Standards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Applicable Standards
              </CardTitle>
              <CardDescription>
                Based on {activeConfig?.propulsion_type || 'selected'} propulsion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getApplicableRequirements().map(req => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium">{req.name}</p>
                      <p className="text-xs text-slate-500">{req.standard}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Document Types Info */}
          {type === 'technical-file' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Technical File Contents</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {DOCUMENT_TYPES.map(doc => (
                    <AccordionItem key={doc.id} value={doc.id}>
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <doc.icon className="h-4 w-4" />
                          {doc.name}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-slate-600">
                        {doc.description}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Document Preview */}
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
                <Button size="sm" onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700">
                  <FileDown className="h-4 w-4 mr-1" />
                  Export PDF
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {generatedDoc ? (
              <ScrollArea className="h-[700px] border rounded-lg p-6 bg-white">
                <div
                  className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-table:text-sm"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(generatedDoc) }}
                />
              </ScrollArea>
            ) : (
              <div className="h-[700px] border rounded-lg flex items-center justify-center bg-slate-50">
                <div className="text-center text-slate-500">
                  <FileCheck className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">No Document Generated</p>
                  <p className="text-sm">
                    Select a configuration and click "Generate Document" to preview
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Existing Documents */}
      {ceDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved CE Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Boat Model</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ceDocuments.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>{doc.boat_model}</TableCell>
                    <TableCell>{doc.version}</TableCell>
                    <TableCell>{formatEuroDate(doc.date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={doc.status === 'approved' ? 'default' : 'secondary'}
                        className={doc.status === 'approved' ? 'bg-green-600' : ''}
                      >
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Vessel Specification Editor Dialog */}
      {showSpecEditor && selectedBoatId && (
        <VesselSpecificationEditor
          boatId={selectedBoatId}
          onClose={() => setShowSpecEditor(false)}
          onSave={handleSaveSpec}
          initialSpec={selectedBoat?.vessel_specification}
        />
      )}
    </div>
  );
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  let html = markdown
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/  \n/g, '<br>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\[ \]/g, '&#9744;')
    .replace(/\[x\]/g, '&#9745;')
    .split('\n\n').join('</p><p>');

  const tableRegex = /\|(.+)\|\n\|[-| ]+\|\n((\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (match, header, body) => {
    const headerCells = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
    const bodyRows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  return `<p>${html}</p>`;
}
