'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Code,
  Eye,
  Save,
  Variable,
  ChevronDown,
  Check,
  AlertTriangle,
} from 'lucide-react';
import type { LibraryDocumentTemplate, TemplateVersion, DocumentType } from '@/domain/models';
import { TemplateService, TEMPLATE_PLACEHOLDERS, type PlaceholderDefinition } from '@/domain/services/TemplateService';
import { TemplateRepository } from '@/data/repositories/LibraryRepository';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: LibraryDocumentTemplate | null;
  version: TemplateVersion | null;
  onSave: () => Promise<void>;
}

// Sample project and client for preview
const SAMPLE_PROJECT = {
  id: 'sample',
  projectNumber: 'PRJ-2026-0001',
  title: 'Eagle 32 Sport for Marina Rotterdam',
  type: 'NEW_BUILD' as const,
  status: 'IN_PRODUCTION' as const,
  clientId: 'sample-client',
  configuration: {
    propulsionType: 'Electric' as const,
    items: [
      { id: '1', itemType: 'LEGACY' as const, name: 'Electric Motor 40kW', category: 'Propulsion', quantity: 1, unit: 'set', unitPriceExclVat: 35000, lineTotalExclVat: 35000, isIncluded: true, ceRelevant: true, safetyCritical: true, isCustom: false, sortOrder: 0 },
      { id: '2', itemType: 'LEGACY' as const, name: 'Battery Pack 80kWh', category: 'Propulsion', quantity: 1, unit: 'set', unitPriceExclVat: 45000, lineTotalExclVat: 45000, isIncluded: true, ceRelevant: true, safetyCritical: true, isCustom: false, sortOrder: 1 },
      { id: '3', itemType: 'LEGACY' as const, name: 'Navigation Display 12"', category: 'Navigation', quantity: 1, unit: 'pcs', unitPriceExclVat: 4200, lineTotalExclVat: 4200, isIncluded: true, ceRelevant: false, safetyCritical: false, isCustom: false, sortOrder: 2 },
    ],
    subtotalExclVat: 84200,
    totalExclVat: 84200,
    vatRate: 21,
    vatAmount: 17682,
    totalInclVat: 101882,
    isFrozen: false,
    lastModifiedAt: new Date().toISOString(),
    lastModifiedBy: 'user-1',
  },
  configurationSnapshots: [],
  quotes: [],
  bomSnapshots: [],
  documents: [],
  amendments: [],
  tasks: [],
  createdAt: new Date().toISOString(),
  createdBy: 'user-1',
  updatedAt: new Date().toISOString(),
  version: 0,
};

const SAMPLE_CLIENT = {
  id: 'sample-client',
  clientNumber: 'CLI-2026-0001',
  name: 'Marina Rotterdam B.V.',
  type: 'company' as const,
  status: 'active' as const,
  email: 'info@marina-rotterdam.nl',
  phone: '+31 10 123 4567',
  street: 'Havenstraat 25',
  postalCode: '3011 AB',
  city: 'Rotterdam',
  country: 'Netherlands',
  vatNumber: 'NL987654321B01',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 0,
};

export function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  version,
  onSave,
}: TemplateEditorDialogProps) {
  const [content, setContent] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('project');

  useEffect(() => {
    if (version) {
      setContent(version.content);
      // Suggest next version
      const parts = version.versionLabel.split('.');
      const minor = parseInt(parts[1] || '0') + 1;
      setVersionLabel(`${parts[0]}.${minor}`);
    } else if (template) {
      // New version - get default content
      setContent(TemplateService.getDefaultTemplate(template.type));
      setVersionLabel('1.0');
    }
    setIsDirty(false);
  }, [template, version]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  }, []);

  const insertPlaceholder = useCallback((placeholder: string) => {
    // Simple insertion at cursor would need a ref to textarea
    // For now, append to content
    setContent(prev => prev + placeholder);
    setIsDirty(true);
  }, []);

  const getRenderedPreview = useCallback(() => {
    return TemplateService.renderTemplate(content, SAMPLE_PROJECT, SAMPLE_CLIENT);
  }, [content]);

  async function handleSave() {
    if (!template || !versionLabel) return;

    setIsLoading(true);
    try {
      const context = getDefaultAuditContext();
      const result = await TemplateService.createTemplateVersion(
        template.id,
        versionLabel,
        content,
        context
      );

      if (result.ok) {
        await onSave();
        onOpenChange(false);
      } else {
        alert(`Failed to save: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove() {
    if (!version) return;

    setIsLoading(true);
    try {
      const context = getDefaultAuditContext();
      const result = await TemplateService.approveVersion(version.id, context);

      if (result.ok) {
        await onSave();
        onOpenChange(false);
      } else {
        alert(`Failed to approve: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to approve template:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Group placeholders by category
  const placeholdersByCategory = TEMPLATE_PLACEHOLDERS.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, PlaceholderDefinition[]>);

  const categoryLabels: Record<string, string> = {
    project: 'Project',
    client: 'Client',
    company: 'Company',
    configuration: 'Configuration',
    date: 'Date',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            {template ? `Edit Template: ${template.name}` : 'Template Editor'}
          </DialogTitle>
          <DialogDescription>
            Edit template content and insert placeholders. Changes create a new version.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left sidebar - Placeholders */}
          <div className="w-64 border-r pr-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <Variable className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium">Placeholders</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Click to insert into template
            </p>

            <div className="space-y-2">
              {Object.entries(placeholdersByCategory).map(([category, placeholders]) => (
                <Collapsible
                  key={category}
                  open={expandedCategory === category}
                  onOpenChange={(open) => setExpandedCategory(open ? category : null)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium bg-slate-50 rounded hover:bg-slate-100">
                    <span>{categoryLabels[category]}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1">
                    {placeholders.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => insertPlaceholder(p.key)}
                        className="w-full text-left p-2 text-xs rounded hover:bg-teal-50 border border-transparent hover:border-teal-200 transition-colors"
                      >
                        <code className="text-teal-600 font-mono">{p.key}</code>
                        <p className="text-slate-500 mt-0.5">{p.label}</p>
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Main editor area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'editor' | 'preview')} className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <TabsList>
                  <TabsTrigger value="editor" className="gap-2">
                    <Code className="h-4 w-4" />
                    Editor
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>

                {version && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        version.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : version.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                      }
                    >
                      {version.status}
                    </Badge>
                    <span className="text-sm text-slate-500">v{version.versionLabel}</span>
                  </div>
                )}
              </div>

              <TabsContent value="editor" className="flex-1 overflow-hidden mt-0">
                <Textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="h-full font-mono text-sm resize-none"
                  placeholder="Enter HTML template content..."
                />
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-hidden mt-0">
                <div className="h-full border rounded-lg overflow-auto bg-white">
                  <iframe
                    srcDoc={getRenderedPreview()}
                    className="w-full h-full"
                    title="Template Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Label htmlFor="version-label">New Version:</Label>
            <Input
              id="version-label"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="1.1"
              className="w-24"
            />
            {isDirty && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {version?.status === 'DRAFT' && (
              <Button
                variant="outline"
                onClick={handleApprove}
                disabled={isLoading}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve Version
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!versionLabel || isLoading || !isDirty}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save New Version
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
