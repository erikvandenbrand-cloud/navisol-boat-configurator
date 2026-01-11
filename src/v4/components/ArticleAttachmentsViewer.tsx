'use client';

import { useState, useEffect } from 'react';
import { FileText, File, Image, Download, ExternalLink, Paperclip, Package } from 'lucide-react';
import type { ArticleVersion, ArticleAttachment, LibraryArticle } from '@/domain/models';
import { ATTACHMENT_TYPE_LABELS } from '@/domain/models';
import { LibraryArticleService } from '@/domain/services/LibraryV4Service';
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

interface ArticleAttachmentsViewerProps {
  articleVersionId: string;
  projectId: string;
  trigger: React.ReactNode;
}

interface AttachmentRowProps {
  attachment: ArticleAttachment;
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

// ============================================
// ATTACHMENT ROW (READ-ONLY)
// ============================================

function AttachmentRow({ attachment }: AttachmentRowProps) {
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
      // Open in new tab for viewing
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
// MAIN COMPONENT
// ============================================

export function ArticleAttachmentsViewer({
  articleVersionId,
  projectId,
  trigger,
}: ArticleAttachmentsViewerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState<LibraryArticle | null>(null);
  const [version, setVersion] = useState<ArticleVersion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && articleVersionId) {
      loadArticleVersion();
    }
  }, [open, articleVersionId]);

  async function loadArticleVersion() {
    setLoading(true);
    setError(null);

    try {
      // Get the article version by ID (this is from pinned snapshot)
      const ver = await LibraryArticleService.getVersionById(articleVersionId);
      if (!ver) {
        setError('Article version not found');
        setLoading(false);
        return;
      }

      setVersion(ver);

      // Get the article for display info
      const art = await LibraryArticleService.getById(ver.articleId);
      setArticle(art);
    } catch (err) {
      setError('Failed to load article attachments');
    }

    setLoading(false);
  }

  const attachments = version?.attachments || [];

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-teal-600" />
              Article Attachments
            </DialogTitle>
            <DialogDescription>
              {article ? (
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                    {article.code}
                  </span>
                  <span>{article.name}</span>
                  <Badge variant="outline" className="text-xs">
                    v{version?.versionNumber}
                  </Badge>
                </span>
              ) : (
                'View attachments for this article'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            ) : attachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <Paperclip className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">No attachments available</p>
                <p className="text-xs text-slate-400 mt-1">
                  This article version has no attached files
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <AttachmentRow key={att.id} attachment={att} />
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              <span>
                {attachments.length} attachment{attachments.length !== 1 ? 's' : ''} from pinned article version
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// COMPACT BUTTON FOR TASK ROW
// ============================================

interface ArticleAttachmentsButtonProps {
  articleVersionId: string;
  projectId: string;
}

export function ArticleAttachmentsButton({
  articleVersionId,
  projectId,
}: ArticleAttachmentsButtonProps) {
  return (
    <ArticleAttachmentsViewer
      articleVersionId={articleVersionId}
      projectId={projectId}
      trigger={
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-slate-600 hover:text-teal-600 hover:bg-teal-50"
          title="View Article Attachments"
        >
          <Paperclip className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">Files</span>
        </Button>
      }
    />
  );
}
