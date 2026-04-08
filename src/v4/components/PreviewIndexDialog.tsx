/**
 * Preview Index Dialog - v4
 * Lists available document previews for the project.
 * Read-only, no data changes.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Eye,
  Book,
  BookOpen,
  FolderOpen,
  AlertTriangle,
  ChevronRight,
  FileText,
  Paperclip,
  Check,
  X,
} from 'lucide-react';
import type { Project, AppliedStandard } from '@/domain/models';
import {
  getDraftVersion,
  getApprovedVersion,
  isModularOwnerManual,
} from '@/domain/models/document-template';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import OwnerManualPreview from './OwnerManualPreview';

// ============================================
// TYPES
// ============================================

interface PreviewIndexDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PreviewType = 'owners-manual' | 'applied-standards' | 'technical-dossier';

// ============================================
// COMPONENT
// ============================================

export function PreviewIndexDialog({
  project,
  open,
  onOpenChange,
}: PreviewIndexDialogProps) {
  const [activePreview, setActivePreview] = useState<PreviewType | null>(null);
  const [showOwnerManualPreview, setShowOwnerManualPreview] = useState(false);

  // Owner's Manual availability
  const ownerManualTemplate = project.documentTemplates?.find(
    (t) => t.type === 'DOC_OWNERS_MANUAL'
  );
  const currentVersion = ownerManualTemplate
    ? getDraftVersion(ownerManualTemplate) || getApprovedVersion(ownerManualTemplate)
    : undefined;
  const hasModularBlocks = currentVersion && isModularOwnerManual(currentVersion);
  const ownerManualBlocks = hasModularBlocks ? currentVersion.ownerManualBlocks : [];
  const includedBlocksCount = ownerManualBlocks?.filter((b: any) => b.included).length || 0;
  const ownerManualAvailable = hasModularBlocks && includedBlocksCount > 0;

  // Applied Standards availability
  const appliedStandards = project.appliedStandards || [];
  const appliedStandardsAvailable = appliedStandards.length > 0;

  // Technical Dossier availability (attachments)
  const technicalDossierAttachments = useMemo(() => {
    const attachments: { name: string; type: string; chapterTitle: string; sectionTitle?: string }[] = [];
    for (const pack of project.compliancePacks || []) {
      for (const chapter of pack.chapters) {
        for (const att of chapter.attachments) {
          attachments.push({
            name: att.filename,
            type: att.type,
            chapterTitle: chapter.title,
          });
        }
        for (const section of chapter.sections) {
          for (const att of section.attachments) {
            attachments.push({
              name: att.filename,
              type: att.type,
              chapterTitle: chapter.title,
              sectionTitle: section.title,
            });
          }
        }
      }
    }
    return attachments;
  }, [project.compliancePacks]);
  const technicalDossierAvailable = technicalDossierAttachments.length > 0;

  const previewItems = [
    {
      id: 'owners-manual' as PreviewType,
      title: "Owner's Manual",
      description: 'Draft preview of the modular Owner\'s Manual content',
      icon: Book,
      available: ownerManualAvailable,
      unavailableReason: !ownerManualTemplate
        ? 'No template available'
        : !hasModularBlocks
          ? 'Not started'
          : 'No sections included',
      stats: ownerManualAvailable ? `${includedBlocksCount} sections` : undefined,
    },
    {
      id: 'applied-standards' as PreviewType,
      title: 'Applied Standards',
      description: 'Harmonised standards and technical specifications',
      icon: BookOpen,
      available: appliedStandardsAvailable,
      unavailableReason: 'No standards added',
      stats: appliedStandardsAvailable ? `${appliedStandards.length} standards` : undefined,
    },
    {
      id: 'technical-dossier' as PreviewType,
      title: 'Technical Dossier',
      description: 'Evidence attachments from certification packs',
      icon: FolderOpen,
      available: technicalDossierAvailable,
      unavailableReason: 'No attachments uploaded',
      stats: technicalDossierAvailable ? `${technicalDossierAttachments.length} attachments` : undefined,
    },
  ];

  function handlePreviewClick(previewId: PreviewType) {
    if (previewId === 'owners-manual' && ownerManualAvailable) {
      setShowOwnerManualPreview(true);
    } else {
      setActivePreview(previewId);
    }
  }

  function handleBackToIndex() {
    setActivePreview(null);
  }

  // Render inline preview for Applied Standards
  function renderAppliedStandardsPreview() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBackToIndex}>
            <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
            Back
          </Button>
          <h3 className="font-semibold text-lg">Applied Standards</h3>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-700">Draft preview — not an approved document</span>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[180px]">Code</TableHead>
                <TableHead className="w-[80px]">Year</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[100px] text-center">Harmonised</TableHead>
                <TableHead className="w-[80px] text-center">Evidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appliedStandards.map((standard) => (
                <TableRow key={standard.id}>
                  <TableCell className="font-mono text-sm">{standard.code}</TableCell>
                  <TableCell className="text-sm text-slate-600">{standard.year || '—'}</TableCell>
                  <TableCell className="text-sm">{standard.title || '—'}</TableCell>
                  <TableCell className="text-center">
                    {standard.isHarmonised ? (
                      <Badge className="bg-green-100 text-green-700 border-0">
                        <Check className="h-3 w-3" />
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(standard.evidenceAttachmentIds?.length || 0) > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        {standard.evidenceAttachmentIds?.length}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-slate-500 text-center">
          {appliedStandards.length} standard{appliedStandards.length !== 1 ? 's' : ''} applied
        </p>
      </div>
    );
  }

  // Render inline preview for Technical Dossier
  function renderTechnicalDossierPreview() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBackToIndex}>
            <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
            Back
          </Button>
          <h3 className="font-semibold text-lg">Technical Dossier</h3>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-700">Draft preview — not an approved document</span>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Attachment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicalDossierAttachments.map((att, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-3 w-3 text-slate-400" />
                      {att.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{att.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {att.chapterTitle}
                    {att.sectionTitle && ` / ${att.sectionTitle}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-slate-500 text-center">
          {technicalDossierAttachments.length} attachment{technicalDossierAttachments.length !== 1 ? 's' : ''} in dossier
        </p>
      </div>
    );
  }

  // Render the preview index (list of available previews)
  function renderPreviewIndex() {
    return (
      <div className="space-y-3">
        {previewItems.map((item) => {
          const Icon = item.icon;
          const isAvailable = item.available;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => isAvailable && handlePreviewClick(item.id)}
              disabled={!isAvailable}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                isAvailable
                  ? 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 cursor-pointer'
                  : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
              }`}
              data-testid={`preview-item-${item.id}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isAvailable ? 'bg-teal-100' : 'bg-slate-100'
                }`}>
                  <Icon className={`h-5 w-5 ${isAvailable ? 'text-teal-600' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-slate-900">{item.title}</h4>
                    {isAvailable ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs text-teal-700 border-teal-200">
                          {item.stats}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                        Preview not available
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{item.description}</p>
                  {!isAvailable && (
                    <p className="text-xs text-slate-400 mt-1">{item.unavailableReason}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        <div className="pt-2 text-center">
          <p className="text-xs text-slate-400">
            All previews are draft views — not approved documents
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-teal-600" />
              Document Previews
            </DialogTitle>
            <DialogDescription>
              Preview draft documents for {project.title}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {activePreview === 'applied-standards' && renderAppliedStandardsPreview()}
            {activePreview === 'technical-dossier' && renderTechnicalDossierPreview()}
            {!activePreview && renderPreviewIndex()}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Owner's Manual Preview uses its own dialog */}
      {ownerManualBlocks && (
        <OwnerManualPreview
          blocks={ownerManualBlocks}
          open={showOwnerManualPreview}
          onOpenChange={setShowOwnerManualPreview}
          projectTitle={project.title}
        />
      )}
    </>
  );
}

export default PreviewIndexDialog;
