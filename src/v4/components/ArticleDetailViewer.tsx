'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  FileText,
  File,
  Image,
  Download,
  ExternalLink,
  Paperclip,
  Tag,
  Clock,
  Scale,
  Info,
  Layers,
  X,
} from 'lucide-react';
import type { ArticleVersion, ArticleAttachment, LibraryArticle, LibraryCategory, LibrarySubcategory } from '@/domain/models';
import { ATTACHMENT_TYPE_LABELS } from '@/domain/models';
import { LibraryArticleService, LibraryCategoryService, LibrarySubcategoryService } from '@/domain/services/LibraryV4Service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================
// TYPES
// ============================================

interface ArticleDetailViewerProps {
  articleVersionId: string;
  articleId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ArticleDetailButtonProps {
  articleVersionId: string;
  articleId?: string;
  articleName?: string;
  articleCode?: string;
}

// ============================================
// HELPERS
// ============================================

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-slate-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

// ============================================
// ATTACHMENT ROW
// ============================================

function AttachmentRow({ attachment }: { attachment: ArticleAttachment }) {
  const handleDownload = () => {
    if (attachment.dataUrl) {
      const link = document.createElement('a');
      link.href = attachment.dataUrl;
      link.download = attachment.filename;
      link.click();
    } else if (attachment.url) {
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpen = () => {
    if (attachment.dataUrl) {
      const win = window.open();
      if (win) {
        win.document.write(`
          <html>
            <head><title>${attachment.filename}</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9;">
              ${attachment.mimeType.startsWith('image/')
                ? `<img src="${attachment.dataUrl}" style="max-width:100%;max-height:100vh;" alt="${attachment.filename}" />`
                : `<iframe src="${attachment.dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`
              }
            </body>
          </html>
        `);
        win.document.close();
      }
    } else if (attachment.url) {
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
    }
  };

  const hasSource = attachment.dataUrl || attachment.url;

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
      {getFileIcon(attachment.mimeType)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{attachment.filename}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {ATTACHMENT_TYPE_LABELS[attachment.type]}
          </Badge>
          <span>{formatFileSize(attachment.sizeBytes)}</span>
          {attachment.notes && <span className="truncate">- {attachment.notes}</span>}
        </div>
      </div>
      {hasSource && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={handleOpen}
            title="Open"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN VIEWER COMPONENT
// ============================================

export function ArticleDetailViewer({
  articleVersionId,
  articleId,
  open,
  onOpenChange,
}: ArticleDetailViewerProps) {
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState<LibraryArticle | null>(null);
  const [version, setVersion] = useState<ArticleVersion | null>(null);
  const [category, setCategory] = useState<LibraryCategory | null>(null);
  const [subcategory, setSubcategory] = useState<LibrarySubcategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && articleVersionId) {
      loadArticleDetails();
    }
  }, [open, articleVersionId]);

  async function loadArticleDetails() {
    setLoading(true);
    setError(null);

    try {
      // Get the pinned article version
      const ver = await LibraryArticleService.getVersionById(articleVersionId);
      if (!ver) {
        setError('Article version not found in library');
        setLoading(false);
        return;
      }
      setVersion(ver);

      // Get the article
      const art = await LibraryArticleService.getById(ver.articleId);
      if (!art) {
        setError('Article not found in library');
        setLoading(false);
        return;
      }
      setArticle(art);

      // Get category and subcategory
      const sub = await LibrarySubcategoryService.getById(art.subcategoryId);
      if (sub) {
        setSubcategory(sub);
        const cat = await LibraryCategoryService.getById(sub.categoryId);
        setCategory(cat);
      }
    } catch (err) {
      setError('Failed to load article details');
    }

    setLoading(false);
  }

  const attachments = version?.attachments || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            Article Details
            <Badge variant="outline" className="text-xs ml-2">
              Read-only
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Pinned article version from project configuration
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        ) : article && version ? (
          <div className="space-y-6">
            {/* Article Header */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="h-6 w-6 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm bg-slate-200 px-2 py-0.5 rounded">
                      {article.code}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      v{version.versionNumber}
                    </Badge>
                    <Badge
                      className={`text-xs ${
                        version.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700 border-0'
                          : version.status === 'DEPRECATED'
                          ? 'bg-red-100 text-red-700 border-0'
                          : 'bg-amber-100 text-amber-700 border-0'
                      }`}
                    >
                      {version.status}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mt-1">{article.name}</h3>
                  {category && subcategory && (
                    <p className="text-sm text-slate-500 mt-1">
                      {category.name} / {subcategory.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Article Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Tag className="h-3.5 w-3.5" />
                  <span className="text-xs">Unit</span>
                </div>
                <p className="font-medium text-slate-900">{article.unit}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="text-xs">Sell Price</span>
                </div>
                <p className="font-medium text-slate-900">{formatCurrency(version.sellPrice)}</p>
              </div>

              {version.weightKg && (
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Scale className="h-3.5 w-3.5" />
                    <span className="text-xs">Weight</span>
                  </div>
                  <p className="font-medium text-slate-900">{version.weightKg} kg</p>
                </div>
              )}

              {version.leadTimeDays && (
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs">Lead Time</span>
                  </div>
                  <p className="font-medium text-slate-900">{version.leadTimeDays} days</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={`text-xs ${
                        tag === 'CE_CRITICAL'
                          ? 'border-amber-300 text-amber-700 bg-amber-50'
                          : tag === 'SAFETY_CRITICAL'
                          ? 'border-red-300 text-red-700 bg-red-50'
                          : ''
                      }`}
                    >
                      {tag.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {version.notes && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Notes
                </h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border">
                  {version.notes}
                </p>
              </div>
            )}

            {/* Specifications */}
            {version.specs && Object.keys(version.specs).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Specifications</h4>
                <div className="bg-slate-50 rounded-lg border divide-y divide-slate-200">
                  {Object.entries(version.specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 px-3 text-sm">
                      <span className="text-slate-600">{key}</span>
                      <span className="font-medium text-slate-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
                {attachments.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {attachments.length}
                  </Badge>
                )}
              </h4>
              {attachments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-lg border">
                  <Paperclip className="h-6 w-6 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No attachments available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <AttachmentRow key={att.id} attachment={att} />
                  ))}
                </div>
              )}
            </div>

            {/* Pinned Version Info */}
            <div className="pt-4 border-t text-xs text-slate-500 flex items-center gap-2">
              <Info className="h-3 w-3" />
              <span>
                Viewing pinned version {version.versionNumber} (ID: {articleVersionId.slice(0, 8)}...)
                {version.approvedAt && ` - Approved ${new Date(version.approvedAt).toLocaleDateString()}`}
              </span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPACT BUTTON FOR BOM ROW
// ============================================

export function ArticleDetailButton({
  articleVersionId,
  articleId,
  articleName,
  articleCode,
}: ArticleDetailButtonProps) {
  const [open, setOpen] = useState(false);

  if (!articleVersionId) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left hover:bg-teal-50 rounded-md p-1 -m-1 transition-colors group"
        title="View article details"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium group-hover:text-teal-700">{articleName}</span>
          <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>

      <ArticleDetailViewer
        articleVersionId={articleVersionId}
        articleId={articleId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

// ============================================
// VIEW ARTICLE ICON BUTTON (for table rows)
// ============================================

export function ViewArticleButton({
  articleVersionId,
  articleId,
}: {
  articleVersionId: string;
  articleId?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!articleVersionId) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-slate-500 hover:text-teal-600 hover:bg-teal-50"
        onClick={() => setOpen(true)}
        title="View article details"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>

      <ArticleDetailViewer
        articleVersionId={articleVersionId}
        articleId={articleId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
