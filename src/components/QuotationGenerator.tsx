'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Download,
  Eye,
  Send,
  Plus,
  Trash2,
  Save,
  Printer,
  Ship,
  Building2,
  Calendar,
  Euro,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { useStoreV2 } from '@/lib/store-v2';
import type { Client, Model, Quotation, QuotationLine, Project } from '@/lib/types-v2';

// ============================================
// COMPANY INFO (shared between templates)
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
    website: 'www.navisol.nl',
    email: 'info@navisol.nl',
  },
};

// ============================================
// QUOTATION TEMPLATES
// ============================================

type QuotationTemplateType = 'navisol' | 'eagle-boats';

interface QuotationTemplate {
  id: QuotationTemplateType;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
}

const QUOTATION_TEMPLATES: QuotationTemplate[] = [
  {
    id: 'navisol',
    name: 'Navisol',
    description: 'Navisol company letterhead with helm wheel watermark',
    primaryColor: '#5B8FA8',
    accentColor: '#5B8FA8',
  },
  {
    id: 'eagle-boats',
    name: 'Eagle Boats',
    description: 'Eagle Boats branded template with eagle logo',
    primaryColor: '#6BBF47',
    accentColor: '#4A4A4A',
  },
];

// ============================================
// TYPES
// ============================================

type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'SUPERSEDED';

interface QuotationLineItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
  line_total: number;
  is_optional?: boolean;
  category?: string;
}

interface QuotationDraft {
  id: string;
  quote_number: string;
  version: number;
  parent_id?: string; // Reference to previous version
  template: QuotationTemplateType;
  client_id: string;
  project_id?: string;
  model_id?: string;
  propulsion_type?: string;
  status: QuotationStatus;
  lines: QuotationLineItem[];
  subtotal_excl_vat: number;
  discount_percent: number;
  discount_amount: number;
  total_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_incl_vat: number;
  valid_until: string;
  delivery_estimate?: string;
  payment_terms: string;
  delivery_terms: string;
  notes?: string;
  internal_notes?: string;
  seller_name: string;
  reference?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  status_history: StatusChange[];
}

interface StatusChange {
  from: QuotationStatus;
  to: QuotationStatus;
  changed_at: string;
  changed_by?: string;
  notes?: string;
}

const STATUS_CONFIG: Record<QuotationStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  DRAFT: { label: 'Concept', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: 'FileText' },
  SENT: { label: 'Verzonden', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: 'Send' },
  ACCEPTED: { label: 'Geaccepteerd', color: 'text-green-700', bgColor: 'bg-green-100', icon: 'CheckCircle' },
  REJECTED: { label: 'Afgewezen', color: 'text-red-700', bgColor: 'bg-red-100', icon: 'XCircle' },
  EXPIRED: { label: 'Verlopen', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: 'Clock' },
  SUPERSEDED: { label: 'Vervangen', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: 'History' },
};

const STORAGE_KEY = 'navisol_quotations';

// ============================================
// HELPER FUNCTIONS
// ============================================

function loadQuotations(): QuotationDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveQuotations(quotations: QuotationDraft[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
  } catch (e) {
    console.error('Failed to save quotations:', e);
  }
}

function generateQuoteNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `OFF-${year}-${random}`;
}

function formatEuroNumber(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  return date.toISOString();
}

// ============================================
// EAGLE BOATS LOGO COMPONENT
// ============================================

function EagleBoatsLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 120" className={className}>
      <defs>
        <linearGradient id="eagleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#888888" />
          <stop offset="50%" stopColor="#444444" />
          <stop offset="100%" stopColor="#222222" />
        </linearGradient>
      </defs>
      {/* Green E bracket - top */}
      <path d="M55 5 L55 20 L115 20 L115 5 L105 5 L105 12 L65 12 L65 5 Z" fill="#6BBF47" />
      {/* Green E bracket - bottom */}
      <path d="M55 100 L55 115 L115 115 L115 100 L105 100 L105 108 L65 108 L65 100 Z" fill="#6BBF47" />
      {/* EAGLE text */}
      <text x="70" y="28" fill="#6BBF47" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="500" letterSpacing="4">EAGLE</text>
      {/* BOATS text */}
      <text x="70" y="98" fill="#6BBF47" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="500" letterSpacing="4">BOATS</text>
      {/* Eagle head and wings - simplified stylized version */}
      <g transform="translate(40, 25)">
        {/* Wing curves - outer to inner */}
        <path d="M10 55 Q35 35 60 55 Q85 35 110 55" fill="none" stroke="#888888" strokeWidth="4" strokeLinecap="round" />
        <path d="M20 50 Q40 35 60 50 Q80 35 100 50" fill="none" stroke="#666666" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 45 Q45 32 60 45 Q75 32 90 45" fill="none" stroke="#444444" strokeWidth="4" strokeLinecap="round" />
        <path d="M40 40 Q50 30 60 40 Q70 30 80 40" fill="none" stroke="#6BBF47" strokeWidth="3" strokeLinecap="round" />
        {/* Eagle head */}
        <ellipse cx="95" cy="40" rx="12" ry="10" fill="url(#eagleGradient)" />
        {/* Beak */}
        <path d="M105 40 L118 42 L105 44 Z" fill="#666666" />
        {/* Eye */}
        <circle cx="98" cy="38" r="2" fill="white" />
      </g>
    </svg>
  );
}

// ============================================
// NAVISOL LOGO COMPONENT
// ============================================

function NavisolLogo({ className = '' }: { className?: string }) {
  return (
    <div className={className} style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '3px' }}>
      <span className="text-3xl font-light text-slate-700 tracking-widest">NAVIS</span>
      <span className="text-3xl font-light text-[#5B8FA8] tracking-widest">
        <svg
          viewBox="0 0 40 40"
          className="inline-block w-8 h-8 -mt-1 mx-0.5"
          fill="#5B8FA8"
        >
          <circle cx="20" cy="20" r="16" fill="none" stroke="#5B8FA8" strokeWidth="2.5"/>
          <circle cx="20" cy="20" r="4" fill="#5B8FA8"/>
          <line x1="20" y1="4" x2="20" y2="16" stroke="#5B8FA8" strokeWidth="2"/>
          <line x1="20" y1="24" x2="20" y2="36" stroke="#5B8FA8" strokeWidth="2"/>
          <line x1="4" y1="20" x2="16" y2="20" stroke="#5B8FA8" strokeWidth="2"/>
          <line x1="24" y1="20" x2="36" y2="20" stroke="#5B8FA8" strokeWidth="2"/>
        </svg>
      </span>
      <span className="text-3xl font-light text-slate-700 tracking-widest">L</span>
    </div>
  );
}

// ============================================
// QUOTATION PREVIEW COMPONENT
// ============================================

interface QuotationPreviewProps {
  quotation: QuotationDraft;
  client?: Client;
  model?: Model;
  template: QuotationTemplateType;
}

function QuotationPreview({ quotation, client, model, template }: QuotationPreviewProps) {
  const isEagleBoats = template === 'eagle-boats';
  const primaryColor = isEagleBoats ? '#6BBF47' : '#5B8FA8';
  const brandName = isEagleBoats ? 'Eagle Boats' : 'Navisol';

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
      {/* Watermark Background */}
      <div
        className="absolute pointer-events-none print:opacity-[0.06]"
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
          /* Eagle Boats watermark - eagle silhouette */
          <svg viewBox="0 0 400 350" fill={primaryColor}>
            {/* Stylized eagle wings */}
            <g transform="translate(50, 80)">
              <path d="M20 140 Q80 60 150 100 Q220 60 280 140" fill="none" stroke={primaryColor} strokeWidth="20" strokeLinecap="round" />
              <path d="M40 120 Q90 55 150 90 Q210 55 260 120" fill="none" stroke={primaryColor} strokeWidth="18" strokeLinecap="round" />
              <path d="M60 100 Q100 50 150 80 Q200 50 240 100" fill="none" stroke={primaryColor} strokeWidth="16" strokeLinecap="round" />
              <path d="M80 80 Q110 45 150 70 Q190 45 220 80" fill="none" stroke={primaryColor} strokeWidth="14" strokeLinecap="round" />
              {/* Eagle head */}
              <ellipse cx="260" cy="95" rx="35" ry="30" fill={primaryColor} />
              <path d="M290 95 L340 100 L290 105 Z" fill={primaryColor} />
            </g>
            {/* Waves */}
            <path d="M30 280 Q80 250 130 280 T230 280 T330 280" fill="none" stroke={primaryColor} strokeWidth="12" strokeLinecap="round" />
            <path d="M0 310 Q60 280 120 310 T240 310 T360 310" fill="none" stroke={primaryColor} strokeWidth="8" strokeLinecap="round" />
          </svg>
        ) : (
          /* Navisol watermark - helm wheel */
          <svg viewBox="0 0 400 350" fill={primaryColor}>
            <circle cx="200" cy="150" r="90" fill="none" stroke={primaryColor} strokeWidth="14"/>
            <circle cx="200" cy="150" r="22" fill={primaryColor}/>
            <line x1="200" y1="60" x2="200" y2="128" stroke={primaryColor} strokeWidth="12"/>
            <line x1="200" y1="172" x2="200" y2="240" stroke={primaryColor} strokeWidth="12"/>
            <line x1="110" y1="150" x2="178" y2="150" stroke={primaryColor} strokeWidth="12"/>
            <line x1="222" y1="150" x2="290" y2="150" stroke={primaryColor} strokeWidth="12"/>
            <line x1="136" y1="86" x2="184" y2="134" stroke={primaryColor} strokeWidth="12"/>
            <line x1="216" y1="166" x2="264" y2="214" stroke={primaryColor} strokeWidth="12"/>
            <line x1="136" y1="214" x2="184" y2="166" stroke={primaryColor} strokeWidth="12"/>
            <line x1="216" y1="134" x2="264" y2="86" stroke={primaryColor} strokeWidth="12"/>
            <path d="M30 280 Q80 250 130 280 T230 280 T330 280 T400 280" fill="none" stroke={primaryColor} strokeWidth="14" strokeLinecap="round"/>
            <path d="M0 320 Q60 290 120 320 T240 320 T360 320" fill="none" stroke={primaryColor} strokeWidth="10" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Header Row */}
      <div className="flex justify-between mb-8 relative z-10">
        {/* Left side - Logo */}
        <div className="flex items-start">
          {isEagleBoats ? (
            <EagleBoatsLogo className="w-40 h-24" />
          ) : (
            <NavisolLogo />
          )}
        </div>

        {/* Center - Address */}
        <div className="text-center text-slate-600" style={{ fontSize: '10px' }}>
          <div className="border-b border-slate-300 pb-2 mb-2 px-4">
            <p className="font-semibold text-slate-700">Adres: <span className="font-bold">{brandName}</span></p>
            <p>{COMPANY_INFO.address.street}</p>
            <p>{COMPANY_INFO.address.postal}</p>
            <p>{COMPANY_INFO.address.country}</p>
            <p>Tel.: {COMPANY_INFO.address.phone}</p>
          </div>
        </div>

        {/* Right side - Company Details */}
        <div className="text-right text-slate-600" style={{ fontSize: '10px' }}>
          <div className="border-b border-slate-300 pb-2 mb-2 px-4">
            <p>IBAN: {COMPANY_INFO.banking.iban}</p>
            <p>KvK: {COMPANY_INFO.banking.kvk}</p>
            <p>BTW: {COMPANY_INFO.banking.btw}</p>
            <p>Website: {COMPANY_INFO.banking.website}</p>
            <p>E-mail: {COMPANY_INFO.banking.email}</p>
          </div>
        </div>
      </div>

      {/* Client Address Block */}
      <div className="mb-6 relative z-10">
        <div className="w-1/2">
          <p className="font-semibold text-slate-900 text-sm">
            {client?.name || 'Klant'}
          </p>
          {client?.client_type === 'company' && (
            <p className="text-slate-600">T.a.v. {client.name}</p>
          )}
          {client?.street_address && <p className="text-slate-600">{client.street_address}</p>}
          {(client?.postal_code || client?.city) && (
            <p className="text-slate-600">{client?.postal_code} {client?.city}</p>
          )}
          <p className="text-slate-600">{client?.country || 'Nederland'}</p>
        </div>
      </div>

      {/* Title */}
      <h1
        className="text-right mb-6 relative z-10"
        style={{
          fontSize: '32px',
          fontWeight: '300',
          color: primaryColor,
          letterSpacing: '2px',
        }}
      >
        Offerte
      </h1>

      {/* Quote Details Row */}
      <div className="flex justify-between mb-6 text-xs relative z-10">
        <div className="space-y-1">
          <div className="flex">
            <span className="text-slate-500 w-28">Offertenummer</span>
            <span className="text-slate-500 mx-2">:</span>
            <span className="font-medium">{quotation.quote_number}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 w-28">Offertedatum</span>
            <span className="text-slate-500 mx-2">:</span>
            <span>{formatDate(quotation.created_at)}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 w-28">Vervaldatum</span>
            <span className="text-slate-500 mx-2">:</span>
            <span>{formatDate(quotation.valid_until)}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 w-28">Verkoper</span>
            <span className="text-slate-500 mx-2">:</span>
            <span>{quotation.seller_name}</span>
          </div>
        </div>

        <div className="space-y-1 text-right">
          <div className="flex justify-end">
            <span className="text-slate-500 w-28 text-left">Debiteurennummer</span>
            <span className="text-slate-500 mx-2">:</span>
            <span className="w-32 text-left">{client?.id?.slice(-4).toUpperCase() || '---'}</span>
          </div>
          <div className="flex justify-end">
            <span className="text-slate-500 w-28 text-left">Uw referentie</span>
            <span className="text-slate-500 mx-2">:</span>
            <span className="w-32 text-left">{quotation.reference || ''}</span>
          </div>
          <div className="flex justify-end">
            <span className="text-slate-500 w-28 text-left">Leveringswijze</span>
            <span className="text-slate-500 mx-2">:</span>
            <span className="w-32 text-left">{quotation.delivery_terms}</span>
          </div>
          <div className="flex justify-end">
            <span className="text-slate-500 w-28 text-left">Pagina</span>
            <span className="text-slate-500 mx-2">:</span>
            <span className="w-32 text-left">1 / 1</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6 relative z-10">
        {/* Table Header */}
        <div
          className="flex border-b-2 border-slate-300 pb-2 mb-2 font-semibold text-xs"
          style={{ color: primaryColor }}
        >
          <div className="flex-1">Omschrijving</div>
          <div className="w-16 text-center">Aantal</div>
          <div className="w-24 text-right">Prijs</div>
          <div className="w-14 text-center">BTW</div>
          <div className="w-24 text-right">Totaalbedrag</div>
        </div>

        {/* Model Title */}
        {model && (
          <div className="py-2 border-b border-slate-200">
            <span className="font-medium">{model.name}</span>
            {quotation.propulsion_type && (
              <span className="text-slate-500 ml-2">- {quotation.propulsion_type}</span>
            )}
          </div>
        )}

        {/* Items */}
        {quotation.lines.map((line) => {
          const vatPercent = Math.round(quotation.vat_rate);

          return (
            <div
              key={line.id}
              className={`flex py-1.5 border-b border-slate-100 text-xs ${
                line.is_optional ? 'text-slate-500 italic' : ''
              }`}
            >
              <div className="flex-1 pr-2">
                <span>{line.description}</span>
                {line.is_optional && (
                  <span className="ml-1 text-[10px]">(Optioneel)</span>
                )}
              </div>
              <div className="w-16 text-center">{line.qty} {line.unit}</div>
              <div className="w-24 text-right font-mono">
                € {formatEuroNumber(line.unit_price)}
              </div>
              <div className="w-14 text-center text-slate-500">{vatPercent}%</div>
              <div className="w-24 text-right font-mono">
                € {formatEuroNumber(line.line_total)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtotal */}
      <div className="flex justify-end border-t-2 border-slate-300 pt-4 relative z-10">
        <div className="text-right">
          <div className="flex items-center text-sm">
            <span className="font-semibold mr-8">Subtotaal</span>
            <span className="font-mono font-bold text-lg">€ {formatEuroNumber(quotation.subtotal_excl_vat)}</span>
          </div>
        </div>
      </div>

      {/* Discount (if any) */}
      {quotation.discount_amount > 0 && (
        <div className="flex justify-end mt-2 relative z-10">
          <div className="text-right">
            <div className="flex items-center text-sm text-green-700">
              <span className="mr-8">Korting ({quotation.discount_percent}%)</span>
              <span className="font-mono">- € {formatEuroNumber(quotation.discount_amount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer - Totals */}
      <div className="mt-8 pt-4 border-t-2 relative z-10" style={{ borderColor: primaryColor }}>
        <div className="flex justify-end space-x-8 text-sm">
          <div className="text-right space-y-1">
            <div className="flex justify-between">
              <span className="mr-8">Subtotaal excl. BTW:</span>
              <span className="font-mono">€ {formatEuroNumber(quotation.total_excl_vat)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="mr-8">BTW {Math.round(quotation.vat_rate)}%:</span>
              <span className="font-mono">€ {formatEuroNumber(quotation.vat_amount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-300">
              <span className="mr-8">Totaal incl. BTW:</span>
              <span className="font-mono" style={{ color: primaryColor }}>€ {formatEuroNumber(quotation.total_incl_vat)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="mt-8 text-xs text-slate-500 space-y-1">
          <p>Betalingstermijn: {quotation.payment_terms}</p>
          <p>Leveringsvoorwaarden: {quotation.delivery_terms}</p>
          {quotation.delivery_estimate && (
            <p>Geschatte levering: {quotation.delivery_estimate}</p>
          )}
          <p>Deze offerte is geldig tot {formatDate(quotation.valid_until)}.</p>
        </div>

        {/* Notes */}
        {quotation.notes && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-1">Opmerkingen:</p>
            <p className="text-xs text-slate-600 whitespace-pre-line">{quotation.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN QUOTATION GENERATOR COMPONENT
// ============================================

type ViewMode = 'editor' | 'preview' | 'history';

export function QuotationGenerator() {
  const { clients, models, projects, settings, currentUser } = useStoreV2();

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [propulsionType, setPropulsionType] = useState<string>('Electric');
  const [validityDays, setValidityDays] = useState(30);
  const [sellerName, setSellerName] = useState(
    currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Erik van den Brand'
  );
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [deliveryEstimate, setDeliveryEstimate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('14 dagen na factuurdatum');
  const [deliveryTerms, setDeliveryTerms] = useState('Af fabriek Elburg');
  const [selectedTemplate, setSelectedTemplate] = useState<QuotationTemplateType>('navisol');

  const [lines, setLines] = useState<QuotationLineItem[]>([]);
  const [savedQuotations, setSavedQuotations] = useState<QuotationDraft[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  // Load quotations from localStorage on mount
  React.useEffect(() => {
    const loaded = loadQuotations();
    setSavedQuotations(loaded);
    setIsLoaded(true);
  }, []);

  // Save quotations to localStorage when they change
  React.useEffect(() => {
    if (isLoaded) {
      saveQuotations(savedQuotations);
    }
  }, [savedQuotations, isLoaded]);

  // Get selected entities
  const selectedClient = useMemo(() =>
    clients.find(c => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const selectedModel = useMemo(() =>
    models.find(m => m.id === selectedModelId),
    [models, selectedModelId]
  );

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
    const discountAmount = subtotal * (discountPercent / 100);
    const totalExclVat = subtotal - discountAmount;
    const vatRate = settings.defaults.vat_rate;
    const vatAmount = totalExclVat * (vatRate / 100);
    const totalInclVat = totalExclVat + vatAmount;

    return {
      subtotal,
      discountAmount,
      totalExclVat,
      vatRate,
      vatAmount,
      totalInclVat,
    };
  }, [lines, discountPercent, settings.defaults.vat_rate]);

  // Load model base configuration
  const loadModelConfiguration = () => {
    if (!selectedModel) return;

    const newLines: QuotationLineItem[] = [
      {
        id: `line-${Date.now()}-1`,
        description: `${selectedModel.name} - Basis boot`,
        qty: 1,
        unit: 'st',
        unit_price: selectedModel.base_price_excl_vat,
        line_total: selectedModel.base_price_excl_vat,
        category: 'Basis',
      },
    ];

    // Add propulsion based on type
    if (propulsionType === 'Electric') {
      newLines.push({
        id: `line-${Date.now()}-2`,
        description: 'Elektrische voortstuwing pakket',
        qty: 1,
        unit: 'st',
        unit_price: 12500,
        line_total: 12500,
        category: 'Voortstuwing',
      });
      newLines.push({
        id: `line-${Date.now()}-3`,
        description: 'Lithium accupakket (48V)',
        qty: 1,
        unit: 'st',
        unit_price: 8500,
        line_total: 8500,
        category: 'Voortstuwing',
      });
    } else if (propulsionType === 'Hybrid') {
      newLines.push({
        id: `line-${Date.now()}-2`,
        description: 'Hybride voortstuwing systeem',
        qty: 1,
        unit: 'st',
        unit_price: 18500,
        line_total: 18500,
        category: 'Voortstuwing',
      });
    }

    // Add standard equipment
    newLines.push(
      {
        id: `line-${Date.now()}-4`,
        description: 'Navigatie en instrumentatie',
        qty: 1,
        unit: 'set',
        unit_price: 3500,
        line_total: 3500,
        category: 'Navigatie',
      },
      {
        id: `line-${Date.now()}-5`,
        description: 'Bekleding premium kwaliteit',
        qty: 1,
        unit: 'set',
        unit_price: 4200,
        line_total: 4200,
        category: 'Interieur',
      },
      {
        id: `line-${Date.now()}-6`,
        description: 'Veiligheidspakket (CE conform)',
        qty: 1,
        unit: 'set',
        unit_price: 1850,
        line_total: 1850,
        category: 'Veiligheid',
      },
      {
        id: `line-${Date.now()}-7`,
        description: 'Dekuitrusting (fenders, landvasten, anker)',
        qty: 1,
        unit: 'set',
        unit_price: 950,
        line_total: 950,
        category: 'Dek',
      }
    );

    setLines(newLines);
  };

  // Add custom line
  const addLine = () => {
    const newLine: QuotationLineItem = {
      id: `line-${Date.now()}`,
      description: '',
      qty: 1,
      unit: 'st',
      unit_price: 0,
      line_total: 0,
    };
    setLines([...lines, newLine]);
  };

  // Update line
  const updateLine = (id: string, updates: Partial<QuotationLineItem>) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      const updated = { ...line, ...updates };
      // Recalculate line total
      updated.line_total = updated.qty * updated.unit_price;
      return updated;
    }));
  };

  // Delete line
  const deleteLine = (id: string) => {
    setLines(lines.filter(line => line.id !== id));
  };

  // Create quotation draft
  const createQuotationDraft = (parentQuotation?: QuotationDraft): QuotationDraft => {
    const now = new Date().toISOString();
    const baseNumber = parentQuotation?.quote_number || generateQuoteNumber();
    const version = parentQuotation ? parentQuotation.version + 1 : 1;

    return {
      id: `quo-${Date.now()}`,
      quote_number: baseNumber,
      version,
      parent_id: parentQuotation?.id,
      template: selectedTemplate,
      client_id: selectedClientId,
      project_id: selectedProjectId || undefined,
      model_id: selectedModelId || undefined,
      propulsion_type: propulsionType,
      status: 'DRAFT',
      lines,
      subtotal_excl_vat: calculations.subtotal,
      discount_percent: discountPercent,
      discount_amount: calculations.discountAmount,
      total_excl_vat: calculations.totalExclVat,
      vat_rate: calculations.vatRate,
      vat_amount: calculations.vatAmount,
      total_incl_vat: calculations.totalInclVat,
      valid_until: getDatePlusDays(validityDays),
      delivery_estimate: deliveryEstimate || undefined,
      payment_terms: paymentTerms,
      delivery_terms: deliveryTerms,
      notes: notes || undefined,
      internal_notes: internalNotes || undefined,
      seller_name: sellerName,
      reference: reference || undefined,
      created_at: now,
      updated_at: now,
      status_history: [],
    };
  };

  // Update quotation status
  const updateQuotationStatus = (quotationId: string, newStatus: QuotationStatus, statusNotes?: string) => {
    setSavedQuotations(prev => prev.map(q => {
      if (q.id !== quotationId) return q;

      const now = new Date().toISOString();
      const statusChange: StatusChange = {
        from: q.status,
        to: newStatus,
        changed_at: now,
        changed_by: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : undefined,
        notes: statusNotes,
      };

      return {
        ...q,
        status: newStatus,
        updated_at: now,
        sent_at: newStatus === 'SENT' ? now : q.sent_at,
        accepted_at: newStatus === 'ACCEPTED' ? now : q.accepted_at,
        rejected_at: newStatus === 'REJECTED' ? now : q.rejected_at,
        status_history: [...q.status_history, statusChange],
      };
    }));
  };

  // Create new version of a quotation
  const createNewVersion = (quotation: QuotationDraft) => {
    // Mark current version as superseded
    updateQuotationStatus(quotation.id, 'SUPERSEDED', 'Vervangen door nieuwe versie');

    // Load the quotation data into the editor
    setSelectedClientId(quotation.client_id);
    setSelectedModelId(quotation.model_id || '');
    setSelectedProjectId(quotation.project_id || '');
    setPropulsionType(quotation.propulsion_type || 'Electric');
    setSelectedTemplate(quotation.template);
    setReference(quotation.reference || '');
    setNotes(quotation.notes || '');
    setInternalNotes(quotation.internal_notes || '');
    setDiscountPercent(quotation.discount_percent);
    setDeliveryEstimate(quotation.delivery_estimate || '');
    setPaymentTerms(quotation.payment_terms);
    setDeliveryTerms(quotation.delivery_terms);
    setSellerName(quotation.seller_name);
    setLines([...quotation.lines]);
    setEditingQuotationId(quotation.id);
    setViewMode('editor');
  };

  // Duplicate quotation
  const duplicateQuotation = (quotation: QuotationDraft) => {
    setSelectedClientId(quotation.client_id);
    setSelectedModelId(quotation.model_id || '');
    setSelectedProjectId(quotation.project_id || '');
    setPropulsionType(quotation.propulsion_type || 'Electric');
    setSelectedTemplate(quotation.template);
    setReference('');
    setNotes(quotation.notes || '');
    setInternalNotes('');
    setDiscountPercent(quotation.discount_percent);
    setDeliveryEstimate(quotation.delivery_estimate || '');
    setPaymentTerms(quotation.payment_terms);
    setDeliveryTerms(quotation.delivery_terms);
    setSellerName(currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : quotation.seller_name);
    setLines([...quotation.lines]);
    setEditingQuotationId(null);
    setViewMode('editor');
  };

  // Delete quotation
  const deleteQuotation = (quotationId: string) => {
    if (confirm('Weet u zeker dat u deze offerte wilt verwijderen?')) {
      setSavedQuotations(prev => prev.filter(q => q.id !== quotationId));
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedClientId('');
    setSelectedModelId('');
    setSelectedProjectId('');
    setPropulsionType('Electric');
    setReference('');
    setNotes('');
    setInternalNotes('');
    setDiscountPercent(0);
    setDeliveryEstimate('');
    setPaymentTerms('14 dagen na factuurdatum');
    setDeliveryTerms('Af fabriek Elburg');
    setLines([]);
    setEditingQuotationId(null);
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (typeof window === 'undefined' || !previewRef.current) return;

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const quotation = createQuotationDraft();

      const brandName = selectedTemplate === 'eagle-boats' ? 'EagleBoats' : 'Navisol';
      const opt = {
        margin: 0,
        filename: `${brandName}-Offerte-${quotation.quote_number}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      };

      await html2pdf().set(opt).from(previewRef.current).save();
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  // Print quotation
  const printQuotation = () => {
    if (typeof window === 'undefined') return;
    window.print();
  };

  // Save quotation
  const saveQuotation = () => {
    const parentQuotation = editingQuotationId
      ? savedQuotations.find(q => q.id === editingQuotationId)
      : undefined;

    const quotation = createQuotationDraft(parentQuotation);
    setSavedQuotations(prev => [quotation, ...prev]);
    resetForm();
    alert(`Offerte ${quotation.quote_number} v${quotation.version} is opgeslagen.`);
  };

  // Filter quotations for history view
  const filteredQuotations = useMemo(() => {
    let result = savedQuotations;

    // Filter by status
    if (statusFilter !== 'ALL') {
      result = result.filter(q => q.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(q =>
        q.quote_number.toLowerCase().includes(query) ||
        clients.find(c => c.id === q.client_id)?.name.toLowerCase().includes(query) ||
        models.find(m => m.id === q.model_id)?.name.toLowerCase().includes(query) ||
        q.reference?.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    return result.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [savedQuotations, statusFilter, searchQuery, clients, models]);

  // Get quotation versions (all versions of the same quote_number)
  const getQuotationVersions = (quoteNumber: string) => {
    return savedQuotations
      .filter(q => q.quote_number === quoteNumber)
      .sort((a, b) => b.version - a.version);
  };

  // Status statistics
  const statusStats = useMemo(() => {
    const stats: Record<QuotationStatus | 'total', number> = {
      DRAFT: 0,
      SENT: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      EXPIRED: 0,
      SUPERSEDED: 0,
      total: savedQuotations.length,
    };
    for (const q of savedQuotations) {
      stats[q.status]++;
    }
    return stats;
  }, [savedQuotations]);

  const currentQuotation = createQuotationDraft();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-600" />
            Offerte Generator
          </h1>
          <p className="text-slate-600 mt-1">
            Genereer professionele offertes voor Eagle Boats configuraties
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'history' ? 'default' : 'outline'}
            onClick={() => setViewMode(viewMode === 'history' ? 'editor' : 'history')}
            className={viewMode === 'history' ? 'bg-teal-600 hover:bg-teal-700' : ''}
          >
            <Clock className="w-4 h-4 mr-2" />
            Historie ({statusStats.total})
          </Button>
          {viewMode !== 'history' && (
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'preview' ? 'editor' : 'preview')}
            >
              <Eye className="w-4 h-4 mr-2" />
              {viewMode === 'preview' ? 'Editor' : 'Voorbeeld'}
            </Button>
          )}
          {viewMode === 'editor' && (
            <Button onClick={() => { resetForm(); }} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Offerte
            </Button>
          )}
        </div>
      </div>

      {/* History View */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          {/* Status Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`p-3 rounded-lg border text-center transition-all ${
                statusFilter === 'ALL'
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="text-2xl font-bold text-slate-900">{statusStats.total}</p>
              <p className="text-xs text-slate-500">Alle</p>
            </button>
            {(Object.keys(STATUS_CONFIG) as QuotationStatus[]).map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  statusFilter === status
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className={`text-2xl font-bold ${STATUS_CONFIG[status].color}`}>
                  {statusStats[status]}
                </p>
                <p className="text-xs text-slate-500">{STATUS_CONFIG[status].label}</p>
              </button>
            ))}
          </div>

          {/* Search & Filter */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Zoek op offertenummer, klant, model of referentie..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quotations List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Offertes ({filteredQuotations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredQuotations.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Geen offertes gevonden.</p>
                  <Button
                    className="mt-4"
                    onClick={() => { resetForm(); setViewMode('editor'); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Eerste Offerte Maken
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Offertenummer</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Totaal incl. BTW</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotations.map((q) => {
                      const client = clients.find(c => c.id === q.client_id);
                      const model = models.find(m => m.id === q.model_id);
                      const statusConfig = STATUS_CONFIG[q.status];
                      const versions = getQuotationVersions(q.quote_number);
                      const isLatest = versions[0]?.id === q.id;

                      return (
                        <TableRow key={q.id} className={!isLatest ? 'opacity-60' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{q.quote_number}</span>
                              <Badge variant="outline" className="text-xs">
                                v{q.version}
                              </Badge>
                              {!isLatest && (
                                <Badge variant="outline" className="text-xs bg-slate-100">
                                  Oud
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{client?.name || '-'}</TableCell>
                          <TableCell>{model?.name || '-'}</TableCell>
                          <TableCell className="text-right font-mono">
                            € {formatEuroNumber(q.total_incl_vat)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              q.template === 'eagle-boats'
                                ? 'border-green-300 text-green-700'
                                : 'border-blue-300 text-blue-700'
                            }>
                              {q.template === 'eagle-boats' ? 'Eagle Boats' : 'Navisol'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {formatDate(q.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {/* Status actions */}
                              {q.status === 'DRAFT' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateQuotationStatus(q.id, 'SENT')}
                                  title="Markeer als verzonden"
                                >
                                  <Send className="w-4 h-4 text-blue-600" />
                                </Button>
                              )}
                              {q.status === 'SENT' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateQuotationStatus(q.id, 'ACCEPTED')}
                                    title="Markeer als geaccepteerd"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateQuotationStatus(q.id, 'REJECTED')}
                                    title="Markeer als afgewezen"
                                  >
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                              {/* Common actions */}
                              {isLatest && q.status !== 'SUPERSEDED' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => createNewVersion(q)}
                                  title="Nieuwe versie maken"
                                >
                                  <FileText className="w-4 h-4 text-purple-600" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => duplicateQuotation(q)}
                                title="Dupliceren"
                              >
                                <Copy className="w-4 h-4 text-slate-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteQuotation(q.id)}
                                title="Verwijderen"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'preview' && (
        /* Preview Mode */
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Offerte Voorbeeld</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={printQuotation}>
                    <Printer className="w-4 h-4 mr-2" />
                    Printen
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    PDF Export
                  </Button>
                  <Button size="sm" onClick={saveQuotation}>
                    <Save className="w-4 h-4 mr-2" />
                    Opslaan
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                ref={previewRef}
                className="border border-slate-200 rounded-lg overflow-auto max-h-[800px] bg-white shadow-lg"
              >
                <QuotationPreview
                  quotation={currentQuotation}
                  client={selectedClient}
                  model={selectedModel}
                  template={selectedTemplate}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'editor' && (
        /* Editor Mode */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client & Model Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  Klant & Boot Configuratie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Klant</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer klant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Boot Model</Label>
                    <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer model..." />
                      </SelectTrigger>
                      <SelectContent>
                        {models.filter(m => m.is_active).map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name} - €{formatEuroNumber(model.base_price_excl_vat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Voortstuwing</Label>
                    <Select value={propulsionType} onValueChange={setPropulsionType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Electric">Elektrisch</SelectItem>
                        <SelectItem value="Hybrid">Hybride</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Outboard">Buitenboord</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Uw Referentie</Label>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Optioneel..."
                    />
                  </div>
                </div>

                {selectedModelId && (
                  <Button onClick={loadModelConfiguration} variant="outline" className="w-full">
                    <Ship className="w-4 h-4 mr-2" />
                    Laad {selectedModel?.name} Configuratie
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Template Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  Offerte Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {QUOTATION_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedTemplate === tmpl.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {tmpl.id === 'eagle-boats' ? (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6BBF47' }}>
                            <Ship className="w-6 h-6 text-white" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5B8FA8' }}>
                            <svg viewBox="0 0 40 40" className="w-6 h-6" fill="white">
                              <circle cx="20" cy="20" r="14" fill="none" stroke="white" strokeWidth="2"/>
                              <circle cx="20" cy="20" r="3" fill="white"/>
                              <line x1="20" y1="6" x2="20" y2="17" stroke="white" strokeWidth="1.5"/>
                              <line x1="20" y1="23" x2="20" y2="34" stroke="white" strokeWidth="1.5"/>
                              <line x1="6" y1="20" x2="17" y2="20" stroke="white" strokeWidth="1.5"/>
                              <line x1="23" y1="20" x2="34" y2="20" stroke="white" strokeWidth="1.5"/>
                            </svg>
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-slate-900">{tmpl.name}</h4>
                          <p className="text-xs text-slate-500">{tmpl.description}</p>
                        </div>
                      </div>
                      {selectedTemplate === tmpl.id && (
                        <div className="flex items-center gap-1 text-teal-600 text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Geselecteerd
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Euro className="w-5 h-5 text-teal-600" />
                    Offerte Regels
                  </CardTitle>
                  <Button onClick={addLine} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Regel Toevoegen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {lines.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Geen regels toegevoegd.</p>
                    <p className="text-sm">Selecteer een model en laad de configuratie, of voeg handmatig regels toe.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Omschrijving</TableHead>
                        <TableHead className="w-[10%] text-center">Aantal</TableHead>
                        <TableHead className="w-[10%] text-center">Eenheid</TableHead>
                        <TableHead className="w-[15%] text-right">Prijs</TableHead>
                        <TableHead className="w-[15%] text-right">Totaal</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(line.id, { description: e.target.value })}
                              placeholder="Omschrijving..."
                              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={line.qty}
                              onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) })}
                              className="w-16 text-center border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                              min={1}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.unit}
                              onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                              className="w-12 text-center border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={line.unit_price}
                              onChange={(e) => updateLine(line.id, { unit_price: Number(e.target.value) })}
                              className="w-24 text-right border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                              min={0}
                              step={0.01}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            € {formatEuroNumber(line.line_total)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteLine(line.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
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

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Opmerkingen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Opmerkingen (zichtbaar op offerte)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Eventuele opmerkingen voor de klant..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interne Notities (niet zichtbaar)</Label>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Interne notities..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Settings */}
          <div className="space-y-6">
            {/* Totals Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Totalen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotaal</span>
                  <span className="font-mono">€ {formatEuroNumber(calculations.subtotal)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm text-slate-600 w-20">Korting %</Label>
                  <Input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-20 text-right"
                    min={0}
                    max={100}
                  />
                  <span className="font-mono text-sm text-green-600">
                    - € {formatEuroNumber(calculations.discountAmount)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Totaal excl. BTW</span>
                  <span className="font-mono">€ {formatEuroNumber(calculations.totalExclVat)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">BTW ({calculations.vatRate}%)</span>
                  <span className="font-mono">€ {formatEuroNumber(calculations.vatAmount)}</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Totaal incl. BTW</span>
                  <span className="font-mono text-teal-600">€ {formatEuroNumber(calculations.totalInclVat)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quote Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  Offerte Instellingen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Verkoper</Label>
                  <Input
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Geldigheid (dagen)</Label>
                  <Input
                    type="number"
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Geschatte Levering</Label>
                  <Input
                    value={deliveryEstimate}
                    onChange={(e) => setDeliveryEstimate(e.target.value)}
                    placeholder="bijv. 12-16 weken"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Betalingstermijn</Label>
                  <Input
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Leveringsvoorwaarden</Label>
                  <Input
                    value={deliveryTerms}
                    onChange={(e) => setDeliveryTerms(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  onClick={() => setViewMode('preview')}
                  disabled={lines.length === 0}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Bekijk Voorbeeld
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={saveQuotation}
                  disabled={lines.length === 0 || !selectedClientId}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Offerte Opslaan
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={exportToPDF}
                  disabled={lines.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export als PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .quotation-preview,
          .quotation-preview * {
            visibility: visible;
          }
          .quotation-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 15mm 20mm;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default QuotationGenerator;
