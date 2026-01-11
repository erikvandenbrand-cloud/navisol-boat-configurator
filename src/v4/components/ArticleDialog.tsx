'use client';

import { useState, useEffect, useRef } from 'react';
import { Package, Plus, Check, Clock, AlertTriangle, X, Save, Trash2, Upload, FileText, File, Image, Download, ExternalLink } from 'lucide-react';
import type {
  LibraryArticle,
  ArticleVersion,
  LibrarySubcategory,
  LibraryCategory,
  CreateArticleInput,
  CreateArticleVersionInput,
  ArticleTag,
  ArticleAttachment,
  AttachmentType,
} from '@/domain/models';
import { ATTACHMENT_TYPE_LABELS } from '@/domain/models';
import { LibraryArticleService, LibraryCategoryService, LibrarySubcategoryService } from '@/domain/services';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface ArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'new-version';
  article?: LibraryArticle | null;
  version?: ArticleVersion | null;
  onSaved: () => void;
}

const AVAILABLE_TAGS: { value: ArticleTag; label: string }[] = [
  { value: 'CE_CRITICAL', label: 'CE Critical' },
  { value: 'SAFETY_CRITICAL', label: 'Safety Critical' },
  { value: 'OPTIONAL', label: 'Optional' },
  { value: 'STANDARD', label: 'Standard' },
];

const ATTACHMENT_TYPES: { value: AttachmentType; label: string }[] = [
  { value: '3D', label: '3D Model' },
  { value: 'CNC', label: 'CNC File' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'DRAWING', label: 'Drawing' },
  { value: 'DATASHEET', label: 'Datasheet' },
  { value: 'OTHER', label: 'Other' },
];

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArticleDialog({
  open,
  onOpenChange,
  mode,
  article,
  version,
  onSaved,
}: ArticleDialogProps) {
  // Category/subcategory state
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [subcategories, setSubcategories] = useState<LibrarySubcategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [filteredSubcategories, setFilteredSubcategories] = useState<LibrarySubcategory[]>([]);

  // Article state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [tags, setTags] = useState<ArticleTag[]>([]);

  // Version state
  const [sellPrice, setSellPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [vatRate, setVatRate] = useState('21');
  const [weightKg, setWeightKg] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [notes, setNotes] = useState('');

  // Attachments state
  const [attachments, setAttachments] = useState<ArticleAttachment[]>([]);
  const [newAttachmentType, setNewAttachmentType] = useState<AttachmentType>('DATASHEET');
  const [newAttachmentNotes, setNewAttachmentNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategoriesAndSubcategories();
  }, []);

  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        resetForm();
      } else if (article && version) {
        // Populate form from existing article/version
        setCode(article.code);
        setName(article.name);
        setSubcategoryId(article.subcategoryId);
        setUnit(article.unit);
        setTags(article.tags || []);

        setSellPrice(version.sellPrice.toString());
        setCostPrice(version.costPrice?.toString() || '');
        setVatRate(version.vatRate.toString());
        setWeightKg(version.weightKg?.toString() || '');
        setLeadTimeDays(version.leadTimeDays?.toString() || '');
        setNotes(version.notes || '');
        setAttachments(version.attachments || []);

        // Find category from subcategory
        const subcategory = subcategories.find(s => s.id === article.subcategoryId);
        if (subcategory) {
          setSelectedCategoryId(subcategory.categoryId);
        }
      }
    }
  }, [open, mode, article, version, subcategories]);

  useEffect(() => {
    // Filter subcategories based on selected category
    if (selectedCategoryId) {
      setFilteredSubcategories(subcategories.filter(s => s.categoryId === selectedCategoryId));
    } else {
      setFilteredSubcategories([]);
    }
  }, [selectedCategoryId, subcategories]);

  async function loadCategoriesAndSubcategories() {
    try {
      const [cats, subs] = await Promise.all([
        LibraryCategoryService.getAll(),
        LibrarySubcategoryService.getAll(),
      ]);
      setCategories(cats);
      setSubcategories(subs);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  function resetForm() {
    setCode('');
    setName('');
    setSubcategoryId('');
    setSelectedCategoryId('');
    setUnit('pcs');
    setTags([]);
    setSellPrice('');
    setCostPrice('');
    setVatRate('21');
    setWeightKg('');
    setLeadTimeDays('');
    setNotes('');
    setAttachments([]);
    setError(null);
  }

  function toggleTag(tag: ArticleTag) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  // Process a file and add it as an attachment
  function processFile(file: File) {
    // Read file as base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const newAttachment: ArticleAttachment = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: newAttachmentType,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'current-user',
        notes: newAttachmentNotes || undefined,
      };
      setAttachments(prev => [...prev, newAttachment]);
      setNewAttachmentNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  // Drag and drop handlers
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      // Process the first file (could extend to multiple)
      processFile(files[0]);
    }
  }

  function removeAttachment(id: string) {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }

  // Download attachment (available to all users who can view)
  function handleDownloadAttachment(att: ArticleAttachment) {
    if (att.dataUrl) {
      const link = document.createElement('a');
      link.href = att.dataUrl;
      link.download = att.filename;
      link.click();
    } else if (att.url) {
      window.open(att.url, '_blank', 'noopener,noreferrer');
    }
  }

  // Open attachment in new tab (available to all users who can view)
  function handleOpenAttachment(att: ArticleAttachment) {
    if (att.dataUrl) {
      const win = window.open();
      if (win) {
        win.document.write(`
          <html>
            <head><title>${att.filename}</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9;">
              ${att.mimeType.startsWith('image/')
                ? `<img src="${att.dataUrl}" style="max-width:100%;max-height:100vh;" alt="${att.filename}" />`
                : `<iframe src="${att.dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`
              }
            </body>
          </html>
        `);
        win.document.close();
      }
    } else if (att.url) {
      window.open(att.url, '_blank', 'noopener,noreferrer');
    }
  }

  async function handleSave() {
    setIsLoading(true);
    setError(null);

    try {
      const context = getDefaultAuditContext();
      const sellPriceNum = parseFloat(sellPrice);
      const costPriceNum = costPrice ? parseFloat(costPrice) : undefined;
      const vatRateNum = parseFloat(vatRate) || 21;
      const weightKgNum = weightKg ? parseFloat(weightKg) : undefined;
      const leadTimeDaysNum = leadTimeDays ? parseInt(leadTimeDays) : undefined;

      if (isNaN(sellPriceNum) || sellPriceNum < 0) {
        setError('Please enter a valid sell price');
        setIsLoading(false);
        return;
      }

      if (mode === 'create') {
        if (!code || !name || !subcategoryId) {
          setError('Please fill in all required fields');
          setIsLoading(false);
          return;
        }

        const input: CreateArticleInput = {
          code,
          name,
          subcategoryId,
          unit,
          tags,
          sellPrice: sellPriceNum,
          costPrice: costPriceNum,
          vatRate: vatRateNum,
          weightKg: weightKgNum,
          leadTimeDays: leadTimeDaysNum,
          notes: notes || undefined,
        };

        const result = await LibraryArticleService.create(input, context);
        if (!result.ok) {
          setError(result.error);
          setIsLoading(false);
          return;
        }

        // Add attachments to the created version
        if (result.value.currentVersionId && attachments.length > 0) {
          for (const att of attachments) {
            await LibraryArticleService.addAttachment(
              result.value.currentVersionId,
              {
                type: att.type,
                filename: att.filename,
                mimeType: att.mimeType,
                sizeBytes: att.sizeBytes,
                dataUrl: att.dataUrl,
                notes: att.notes,
              },
              context
            );
          }
        }

        // Auto-approve the initial version
        if (result.value.currentVersionId) {
          await LibraryArticleService.approveVersion(result.value.currentVersionId, context);
        }
      } else if (mode === 'new-version' && article) {
        const input: CreateArticleVersionInput = {
          sellPrice: sellPriceNum,
          costPrice: costPriceNum,
          vatRate: vatRateNum,
          weightKg: weightKgNum,
          leadTimeDays: leadTimeDaysNum,
          notes: notes || undefined,
          attachments: attachments,
        };

        const result = await LibraryArticleService.createVersion(article.id, input, context);
        if (!result.ok) {
          setError(result.error);
          setIsLoading(false);
          return;
        }

        // Auto-approve the new version
        await LibraryArticleService.approveVersion(result.value.id, context);
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save article:', err);
      setError('An error occurred while saving');
    } finally {
      setIsLoading(false);
    }
  }

  const title = mode === 'create' ? 'Create Article' :
    mode === 'edit' ? 'Edit Article' : 'New Article Version';

  const description = mode === 'create'
    ? 'Add a new article to the library'
    : mode === 'edit'
      ? 'Update article details'
      : `Create a new version for ${article?.code}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Article Info - only editable in create mode */}
          {mode === 'create' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Article Code *</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g., PROP-MOTOR-E50"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Electric Motor 50kW"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subcategory">Subcategory *</Label>
                  <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!selectedCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubcategories.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">pcs (pieces)</SelectItem>
                      <SelectItem value="set">set</SelectItem>
                      <SelectItem value="m">m (meters)</SelectItem>
                      <SelectItem value="m2">m² (square meters)</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="L">L (liters)</SelectItem>
                      <SelectItem value="hr">hr (hours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AVAILABLE_TAGS.map(tag => (
                      <button
                        key={tag.value}
                        type="button"
                        onClick={() => toggleTag(tag.value)}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                          tags.includes(tag.value)
                            ? 'bg-teal-100 border-teal-300 text-teal-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Version Info - shown for existing article */}
          {mode !== 'create' && article && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Code:</span>
                  <span className="ml-2 font-mono font-medium">{article.code}</span>
                </div>
                <div>
                  <span className="text-slate-500">Name:</span>
                  <span className="ml-2 font-medium">{article.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Unit:</span>
                  <span className="ml-2">{article.unit}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Pricing</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sellPrice">Sell Price (€) *</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  step="0.01"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="costPrice">Cost Price (€)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="Optional"
                />
                {!costPrice && sellPrice && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    No cost price - margin unknown
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="vatRate">VAT Rate (%)</Label>
                <Select value={vatRate} onValueChange={setVatRate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="9">9%</SelectItem>
                    <SelectItem value="21">21%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Additional Info</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weightKg">Weight (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.01"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this version..."
                rows={3}
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Attachments</h4>

            {/* Existing attachments */}
            {attachments.length > 0 && (
              <div className="space-y-2 mb-4">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 p-2 bg-slate-50 rounded-md border"
                  >
                    {getFileIcon(att.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.filename}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Badge variant="outline" className="text-xs">
                          {ATTACHMENT_TYPE_LABELS[att.type]}
                        </Badge>
                        <span>{formatFileSize(att.sizeBytes)}</span>
                        {att.notes && <span className="truncate">- {att.notes}</span>}
                      </div>
                    </div>
                    {/* Open/Download buttons - available to all users who can view */}
                    {(att.dataUrl || att.url) && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-600 hover:text-teal-600"
                          onClick={() => handleOpenAttachment(att)}
                          title="Open"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-600 hover:text-teal-600"
                          onClick={() => handleDownloadAttachment(att)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {/* Delete button - for editing */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600"
                      onClick={() => removeAttachment(att.id)}
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new attachment - with drag and drop */}
            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`p-3 border-2 border-dashed rounded-lg transition-colors ${
                isDragging
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs">Attachment Type</Label>
                  <Select value={newAttachmentType} onValueChange={(v) => setNewAttachmentType(v as AttachmentType)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTACHMENT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <Input
                    className="h-8 text-sm"
                    value={newAttachmentNotes}
                    onChange={(e) => setNewAttachmentNotes(e.target.value)}
                    placeholder="e.g., Rev 2.1"
                  />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
              {isDragging ? (
                <div className="py-4 text-center">
                  <Upload className="h-8 w-8 mx-auto text-teal-500 mb-2" />
                  <p className="text-sm font-medium text-teal-700">Drop file here</p>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    or drag and drop a file here
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'new-version' ? 'Create Version' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
