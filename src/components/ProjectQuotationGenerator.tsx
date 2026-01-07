'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  FileText, Download, Eye, Send, Save, Printer, Ship,
  ChevronLeft, Check, Euro, Calendar, User
} from 'lucide-react';
import { useStoreV3, useProject } from '@/lib/store-v3';
import type { Project, ProjectDocument, Client, BoatModel } from '@/lib/types-v3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================
// TYPES
// ============================================

type QuotationTemplate = 'navisol' | 'eagle-boats';

interface QuotationData {
  quoteNumber: string;
  version: number;
  template: QuotationTemplate;
  validUntil: string;
  sellerName: string;
  reference: string;
  notes: string;
  paymentTerms: string;
  deliveryTerms: string;
  deliveryEstimate: string;
}

// ============================================
// HELPERS
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDatePlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// ============================================
// COMPANY INFO
// ============================================

const COMPANY_INFO = {
  address: {
    street: 'Industriestraat 25',
    postal: '8081HH Elburg',
    country: 'Nederland',
    phone: '+31(0)850600139',
  },
  banking: {
    iban: 'NL10INGB0106369652',
    kvk: '91533716',
    btw: 'NL865686506B01',
  },
};

// ============================================
// QUOTATION PREVIEW COMPONENT
// ============================================

interface QuotationPreviewProps {
  project: Project;
  client?: Client;
  model?: BoatModel;
  quotationData: QuotationData;
}

function QuotationPreview({ project, client, model, quotationData }: QuotationPreviewProps) {
  const isEagleBoats = quotationData.template === 'eagle-boats';
  const primaryColor = isEagleBoats ? '#6BBF47' : '#5B8FA8';
  const brandName = isEagleBoats ? 'Eagle Boats' : 'Navisol';

  const includedItems = project.equipment.items.filter(i => i.isIncluded);

  return (
    <div
      className="quotation-preview bg-white text-slate-800 relative overflow-hidden print:shadow-none"
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        lineHeight: '1.4',
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm 20mm',
        boxSizing: 'border-box',
      }}
    >
      {/* Watermark */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '20mm',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '180mm',
          height: '180mm',
          opacity: 0.06,
        }}
      >
        {isEagleBoats ? (
          <svg viewBox="0 0 400 350" fill={primaryColor}>
            <g transform="translate(50, 80)">
              <path d="M20 140 Q80 60 150 100 Q220 60 280 140" fill="none" stroke={primaryColor} strokeWidth="20" strokeLinecap="round" />
              <path d="M40 120 Q90 55 150 90 Q210 55 260 120" fill="none" stroke={primaryColor} strokeWidth="18" strokeLinecap="round" />
              <path d="M60 100 Q100 50 150 80 Q200 50 240 100" fill="none" stroke={primaryColor} strokeWidth="16" strokeLinecap="round" />
              <ellipse cx="260" cy="95" rx="35" ry="30" fill={primaryColor} />
              <path d="M290 95 L340 100 L290 105 Z" fill={primaryColor} />
            </g>
            <path d="M30 280 Q80 250 130 280 T230 280 T330 280" fill="none" stroke={primaryColor} strokeWidth="12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 400 350" fill={primaryColor}>
            <circle cx="200" cy="150" r="90" fill="none" stroke={primaryColor} strokeWidth="14"/>
            <circle cx="200" cy="150" r="22" fill={primaryColor}/>
            <line x1="200" y1="60" x2="200" y2="128" stroke={primaryColor} strokeWidth="12"/>
            <line x1="200" y1="172" x2="200" y2="240" stroke={primaryColor} strokeWidth="12"/>
            <line x1="110" y1="150" x2="178" y2="150" stroke={primaryColor} strokeWidth="12"/>
            <line x1="222" y1="150" x2="290" y2="150" stroke={primaryColor} strokeWidth="12"/>
            <path d="M30 280 Q80 250 130 280 T230 280 T330 280 T400 280" fill="none" stroke={primaryColor} strokeWidth="14" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Header */}
      <div className="flex justify-between mb-8 relative z-10">
        <div className="flex items-start">
          <div style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '3px' }}>
            <span className="text-2xl font-light text-slate-700 tracking-widest">{brandName.toUpperCase()}</span>
          </div>
        </div>
        <div className="text-right text-slate-600" style={{ fontSize: '10px' }}>
          <p>{COMPANY_INFO.address.street}</p>
          <p>{COMPANY_INFO.address.postal}</p>
          <p>{COMPANY_INFO.address.phone}</p>
          <p className="mt-2">KvK: {COMPANY_INFO.banking.kvk}</p>
          <p>BTW: {COMPANY_INFO.banking.btw}</p>
        </div>
      </div>

      {/* Client Address */}
      <div className="mb-6 relative z-10">
        <div className="w-1/2">
          <p className="font-semibold text-slate-900 text-sm">{client?.name || 'Klant'}</p>
          {client?.street && <p className="text-slate-600">{client.street}</p>}
          {(client?.postalCode || client?.city) && (
            <p className="text-slate-600">{client?.postalCode} {client?.city}</p>
          )}
          <p className="text-slate-600">{client?.country || 'Nederland'}</p>
        </div>
      </div>

      {/* Title */}
      <h1
        className="text-right mb-6 relative z-10"
        style={{ fontSize: '32px', fontWeight: '300', color: primaryColor, letterSpacing: '2px' }}
      >
        Offerte
      </h1>

      {/* Quote Details */}
      <div className="flex justify-between mb-6 text-xs relative z-10">
        <div className="space-y-1">
          <div className="flex">
            <span className="text-slate-500 w-28">Offertenummer</span>
            <span className="text-slate-500 mx-2">:</span>
            <span className="font-medium">{quotationData.quoteNumber}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 w-28">Offertedatum</span>
            <span className="text-slate-500 mx-2">:</span>
            <span>{formatDate(new Date())}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 w-28">Vervaldatum</span>
            <span className="text-slate-500 mx-2">:</span>
            <span>{formatDate(quotationData.validUntil)}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 w-28">Verkoper</span>
            <span className="text-slate-500 mx-2">:</span>
            <span>{quotationData.sellerName}</span>
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div className="flex justify-end">
            <span className="text-slate-500 w-28 text-left">Project</span>
            <span className="text-slate-500 mx-2">:</span>
            <span className="w-32 text-left font-mono">{project.projectNumber}</span>
          </div>
          <div className="flex justify-end">
            <span className="text-slate-500 w-28 text-left">Uw referentie</span>
            <span className="text-slate-500 mx-2">:</span>
            <span className="w-32 text-left">{quotationData.reference || '-'}</span>
          </div>
          <div className="flex justify-end">
            <span className="text-slate-500 w-28 text-left">Leveringswijze</span>
            <span className="text-slate-500 mx-2">:</span>
            <span className="w-32 text-left">{quotationData.deliveryTerms}</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6 relative z-10">
        <div className="flex border-b-2 border-slate-300 pb-2 mb-2 font-semibold text-xs" style={{ color: primaryColor }}>
          <div className="flex-1">Omschrijving</div>
          <div className="w-16 text-center">Aantal</div>
          <div className="w-24 text-right">Prijs</div>
          <div className="w-14 text-center">BTW</div>
          <div className="w-24 text-right">Totaal</div>
        </div>

        {/* Model Title */}
        {model && (
          <div className="py-2 border-b border-slate-200">
            <span className="font-medium">{model.name}</span>
            <span className="text-slate-500 ml-2">- {project.specification.propulsionType}</span>
          </div>
        )}

        {/* Items */}
        {includedItems.map((item) => (
          <div key={item.id} className="flex py-1.5 border-b border-slate-100 text-xs">
            <div className="flex-1 pr-2">
              <span>{item.name}</span>
              {item.isOptional && <span className="ml-1 text-slate-400">(Optie)</span>}
            </div>
            <div className="w-16 text-center">{item.quantity} {item.unit}</div>
            <div className="w-24 text-right font-mono">{formatCurrency(item.unitPriceExclVat)}</div>
            <div className="w-14 text-center text-slate-500">{project.equipment.vatRate}%</div>
            <div className="w-24 text-right font-mono">{formatCurrency(item.lineTotalExclVat)}</div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-8 pt-4 border-t-2 relative z-10" style={{ borderColor: primaryColor }}>
        <div className="flex justify-end space-x-8 text-sm">
          <div className="text-right space-y-1">
            <div className="flex justify-between">
              <span className="mr-8">Subtotaal excl. BTW:</span>
              <span className="font-mono">{formatCurrency(project.equipment.totalExclVat)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="mr-8">BTW {project.equipment.vatRate}%:</span>
              <span className="font-mono">{formatCurrency(project.equipment.vatAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-300">
              <span className="mr-8">Totaal incl. BTW:</span>
              <span className="font-mono" style={{ color: primaryColor }}>
                {formatCurrency(project.equipment.totalInclVat)}
              </span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="mt-8 text-xs text-slate-500 space-y-1">
          <p>Betalingstermijn: {quotationData.paymentTerms}</p>
          <p>Leveringsvoorwaarden: {quotationData.deliveryTerms}</p>
          {quotationData.deliveryEstimate && (
            <p>Geschatte levering: {quotationData.deliveryEstimate}</p>
          )}
          <p>Deze offerte is geldig tot {formatDate(quotationData.validUntil)}.</p>
        </div>

        {/* Notes */}
        {quotationData.notes && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-1">Opmerkingen:</p>
            <p className="text-xs text-slate-600 whitespace-pre-line">{quotationData.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface ProjectQuotationGeneratorProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (documentId: string) => void;
}

export function ProjectQuotationGenerator({
  projectId,
  isOpen,
  onClose,
  onSaved
}: ProjectQuotationGeneratorProps) {
  const { project, client, model } = useProject(projectId);
  const { addDocument, getDocumentsByType, getNextQuoteNumber, recalculateEquipmentTotals } = useStoreV3();

  const previewRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Get existing quotations for this project
  const existingQuotations = useMemo(() => {
    if (!project) return [];
    return getDocumentsByType(projectId, 'QUOTATION');
  }, [project, projectId, getDocumentsByType]);

  // Calculate next version
  const nextVersion = existingQuotations.length + 1;

  // Form state
  const [quotationData, setQuotationData] = useState<QuotationData>({
    quoteNumber: '',
    version: nextVersion,
    template: 'navisol',
    validUntil: getDatePlusDays(30),
    sellerName: 'Erik van den Brand',
    reference: '',
    notes: '',
    paymentTerms: '14 dagen na factuurdatum',
    deliveryTerms: 'Af fabriek Elburg',
    deliveryEstimate: '12-16 weken',
  });

  // Initialize quote number
  React.useEffect(() => {
    if (isOpen && !quotationData.quoteNumber) {
      const newNumber = getNextQuoteNumber();
      setQuotationData(prev => ({ ...prev, quoteNumber: newNumber, version: nextVersion }));
    }
  }, [isOpen, getNextQuoteNumber, nextVersion, quotationData.quoteNumber]);

  // Ensure equipment totals are calculated
  React.useEffect(() => {
    if (project) {
      recalculateEquipmentTotals(projectId);
    }
  }, [project, projectId, recalculateEquipmentTotals]);

  if (!project) return null;

  // Save quotation to project documents
  const handleSaveQuotation = async () => {
    // Create the document entry
    const doc = addDocument(projectId, {
      type: 'QUOTATION',
      title: `Offerte ${quotationData.quoteNumber} v${quotationData.version}`,
      description: `${model?.name || 'Custom'} - ${project.specification.propulsionType}`,
      version: quotationData.version,
      versionLabel: `v${quotationData.version}`,
      filename: `Offerte-${quotationData.quoteNumber}-v${quotationData.version}.pdf`,
      fileUrl: '', // Would be set after PDF generation
      mimeType: 'application/pdf',
      status: 'DRAFT',
      quotationData: {
        quoteNumber: quotationData.quoteNumber,
        validUntil: quotationData.validUntil,
        status: 'DRAFT',
      },
      createdById: 'current-user',
      createdByName: quotationData.sellerName,
    });

    onSaved?.(doc.id);
    onClose();
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (typeof window === 'undefined' || !previewRef.current) return;

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const brandName = quotationData.template === 'eagle-boats' ? 'EagleBoats' : 'Navisol';

      const opt = {
        margin: 0,
        filename: `${brandName}-Offerte-${quotationData.quoteNumber}-v${quotationData.version}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      };

      await html2pdf().set(opt).from(previewRef.current).save();
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  // Save and export
  const handleSaveAndExport = async () => {
    await handleSaveQuotation();
    await exportToPDF();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Offerte Genereren
          </DialogTitle>
          <DialogDescription>
            Project: {project.projectNumber} - {project.title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[70vh]">
          {/* Settings Panel */}
          <div className="w-80 border-r p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Project Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Project Info</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Klant</span>
                    <span className="font-medium">{client?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Model</span>
                    <span className="font-medium">{model?.name || 'Custom'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Items</span>
                    <span className="font-medium">
                      {project.equipment.items.filter(i => i.isIncluded).length}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Totaal incl. BTW</span>
                    <span className="text-emerald-600">
                      {formatCurrency(project.equipment.totalInclVat)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Template Selection */}
              <div>
                <Label className="text-xs font-medium text-slate-500 uppercase">Template</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(['navisol', 'eagle-boats'] as QuotationTemplate[]).map(template => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => setQuotationData(prev => ({ ...prev, template }))}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        quotationData.template === template
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center"
                        style={{ backgroundColor: template === 'eagle-boats' ? '#6BBF47' : '#5B8FA8' }}
                      >
                        <Ship className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium">
                        {template === 'eagle-boats' ? 'Eagle Boats' : 'Navisol'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quote Details */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Offertenummer</Label>
                  <Input
                    value={quotationData.quoteNumber}
                    onChange={(e) => setQuotationData(prev => ({ ...prev, quoteNumber: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Versie</Label>
                    <Input
                      type="number"
                      value={quotationData.version}
                      onChange={(e) => setQuotationData(prev => ({ ...prev, version: parseInt(e.target.value) || 1 }))}
                      className="mt-1"
                      min={1}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Geldig tot</Label>
                    <Input
                      type="date"
                      value={quotationData.validUntil}
                      onChange={(e) => setQuotationData(prev => ({ ...prev, validUntil: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Verkoper</Label>
                  <Input
                    value={quotationData.sellerName}
                    onChange={(e) => setQuotationData(prev => ({ ...prev, sellerName: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Uw Referentie</Label>
                  <Input
                    value={quotationData.reference}
                    onChange={(e) => setQuotationData(prev => ({ ...prev, reference: e.target.value }))}
                    className="mt-1"
                    placeholder="Optioneel"
                  />
                </div>

                <div>
                  <Label className="text-xs">Geschatte Levering</Label>
                  <Input
                    value={quotationData.deliveryEstimate}
                    onChange={(e) => setQuotationData(prev => ({ ...prev, deliveryEstimate: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Opmerkingen</Label>
                  <Textarea
                    value={quotationData.notes}
                    onChange={(e) => setQuotationData(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1"
                    rows={3}
                    placeholder="Optionele opmerkingen..."
                  />
                </div>
              </div>

              {/* Existing Quotations */}
              {existingQuotations.length > 0 && (
                <div>
                  <Label className="text-xs font-medium text-slate-500 uppercase">
                    Eerdere Offertes ({existingQuotations.length})
                  </Label>
                  <div className="mt-2 space-y-1">
                    {existingQuotations.slice(0, 3).map(doc => (
                      <div
                        key={doc.id}
                        className="text-xs p-2 bg-slate-50 rounded flex justify-between items-center"
                      >
                        <span>{doc.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {doc.quotationData?.status || 'DRAFT'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 bg-slate-100 p-4 overflow-auto">
            <div ref={previewRef} className="shadow-lg">
              <QuotationPreview
                project={project}
                client={client}
                model={model}
                quotationData={quotationData}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Annuleren
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="w-4 h-4 mr-2" />
              PDF Downloaden
            </Button>
            <Button
              onClick={handleSaveAndExport}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Opslaan & Exporteren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProjectQuotationGenerator;
