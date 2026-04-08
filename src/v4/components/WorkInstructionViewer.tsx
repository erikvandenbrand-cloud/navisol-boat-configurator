/**
 * Work Instruction Viewer - v4
 * View-only display of work instruction content
 *
 * Features:
 * - Markdown content rendering
 * - Attachment list with download
 * - Comments list and comment submission
 * - Metadata display
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  FileText,
  Globe,
  Ship,
  Clock,
  CheckCircle,
  User,
  Calendar,
  Paperclip,
  Download,
  MessageSquare,
  Send,
  Edit,
  AlertCircle,
  Copy,
} from 'lucide-react';
import type { WorkInstruction, WorkInstructionComment } from '@/domain/models/work-instruction';
import { DEFAULT_PRODUCTION_STAGES } from '@/domain/models/production';
import { WorkInstructionService } from '@/domain/services/WorkInstructionService';
import { BoatModelService, type BoatModel } from '@/domain/services/BoatModelService';
import { useAuth, getDefaultAuditContext } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================
// TYPES
// ============================================

interface WorkInstructionViewerProps {
  workInstructionId: string;
  onBack: () => void;
  onEdit?: () => void;
  onDuplicated?: (newId: string) => void;
}

// ============================================
// MARKDOWN RENDERER (simple)
// ============================================

function renderMarkdown(content: string): string {
  // Simple markdown-to-HTML conversion
  // In production, use a proper markdown library
  let html = content
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Checkboxes
    .replace(/- \[ \] (.+)$/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled class="rounded"><span>$1</span></div>')
    .replace(/- \[x\] (.+)$/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" checked disabled class="rounded"><span class="line-through text-slate-500">$1</span></div>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-4 border-slate-200">')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="my-2">')
    .replace(/\n/g, '<br>');

  return `<div class="prose prose-slate max-w-none"><p class="my-2">${html}</p></div>`;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WorkInstructionViewer({
  workInstructionId,
  onBack,
  onEdit,
  onDuplicated,
}: WorkInstructionViewerProps) {
  const [instruction, setInstruction] = useState<WorkInstruction | null>(null);
  const [comments, setComments] = useState<WorkInstructionComment[]>([]);
  const [boatModel, setBoatModel] = useState<BoatModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, can } = useAuth();
  const canComment = can('library:read'); // Anyone who can read can comment
  const canDuplicate = can('library:create');

  // Load data
  useEffect(() => {
    loadData();
  }, [workInstructionId]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [instructionData, commentsData] = await Promise.all([
        WorkInstructionService.getById(workInstructionId),
        WorkInstructionService.getComments(workInstructionId),
      ]);

      if (!instructionData) {
        setError('Work instruction not found');
        setIsLoading(false);
        return;
      }

      setInstruction(instructionData);
      setComments(commentsData);

      // Load boat model if model-specific
      if (instructionData.scope === 'modelSpecific' && instructionData.modelRef) {
        const model = await BoatModelService.getById(instructionData.modelRef);
        setBoatModel(model);
      }
    } catch (err) {
      console.error('Failed to load work instruction:', err);
      setError('Failed to load work instruction');
    } finally {
      setIsLoading(false);
    }
  }

  // Submit comment
  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const context = getDefaultAuditContext();
      const result = await WorkInstructionService.addComment(
        workInstructionId,
        { body: newComment.trim() },
        context
      );

      if (result.ok) {
        setComments((prev) => [...prev, result.value]);
        setNewComment('');
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
      setError('Failed to submit comment');
    } finally {
      setIsSubmittingComment(false);
    }
  }, [workInstructionId, newComment, isSubmittingComment]);

  // Duplicate instruction
  const handleDuplicate = useCallback(async () => {
    if (isDuplicating) return;

    setIsDuplicating(true);
    try {
      const context = getDefaultAuditContext();
      const result = await WorkInstructionService.duplicate(workInstructionId, context);

      if (result.ok) {
        if (onDuplicated) {
          onDuplicated(result.value.id);
        } else {
          // Fallback: just go back to refresh list
          onBack();
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Failed to duplicate:', err);
      setError('Failed to duplicate work instruction');
    } finally {
      setIsDuplicating(false);
    }
  }, [workInstructionId, isDuplicating, onDuplicated, onBack]);

  // Download attachment
  const handleDownloadAttachment = useCallback((attachment: WorkInstruction['attachments'][0]) => {
    if (attachment.dataUrl) {
      const link = document.createElement('a');
      link.href = attachment.dataUrl;
      link.download = attachment.filename;
      link.click();
    } else if (attachment.url) {
      window.open(attachment.url, '_blank');
    }
  }, []);

  // Get stage name
  const getStageName = useCallback((stageCode: string) => {
    const stage = DEFAULT_PRODUCTION_STAGES.find((s) => s.code === stageCode);
    return stage?.name || stageCode;
  }, []);

  // Format date
  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading work instruction...</p>
        </div>
      </div>
    );
  }

  if (error || !instruction) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {error || 'Work instruction not found'}
              </h3>
              <Button variant="outline" onClick={onBack}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDraft = instruction.status === 'draft';

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="h-7 w-7 text-teal-600" />
            {instruction.title}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
            {/* Stage */}
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {getStageName(instruction.stageCategory)}
            </span>
            {/* Scope */}
            {instruction.scope === 'general' ? (
              <span className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                General
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Ship className="h-4 w-4" />
                {boatModel?.name || 'Model Specific'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status badge */}
          <Badge
            variant={isDraft ? 'outline' : 'default'}
            className={
              isDraft
                ? 'border-amber-300 text-amber-700 bg-amber-50'
                : 'bg-green-100 text-green-700 border-green-200'
            }
          >
            {isDraft ? (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Draft
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Published
              </>
            )}
          </Badge>

          {/* Duplicate button */}
          {canDuplicate && (
            <Button
              onClick={handleDuplicate}
              variant="outline"
              className="gap-2"
              disabled={isDuplicating}
            >
              <Copy className="h-4 w-4" />
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </Button>
          )}

          {/* Edit button */}
          {onEdit && (
            <Button onClick={onEdit} variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
            </CardHeader>
            <CardContent>
              {instruction.content ? (
                <div
                  className="prose prose-slate max-w-none"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: Controlled markdown rendering
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(instruction.content) }}
                />
              ) : (
                <p className="text-slate-500 italic">No content yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          {instruction.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({instruction.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {instruction.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-sm">{attachment.filename}</p>
                          <p className="text-xs text-slate-500">
                            {(attachment.sizeBytes / 1024).toFixed(1)} KB
                            {attachment.description && ` - ${attachment.description}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadAttachment(attachment)}
                        className="gap-1"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comments.length === 0 ? (
                <p className="text-slate-500 text-sm">No comments yet.</p>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-teal-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{comment.createdByName}</span>
                            <span className="text-slate-400 text-xs">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                            {comment.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Add comment */}
              {canComment && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || isSubmittingComment}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {isSubmittingComment ? 'Submitting...' : 'Submit Comment'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Stage</p>
                <p className="font-medium">{getStageName(instruction.stageCategory)}</p>
                <p className="text-xs text-slate-500">{instruction.stageCategory}</p>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Scope</p>
                <p className="font-medium">
                  {instruction.scope === 'general' ? 'General (All Models)' : 'Model Specific'}
                </p>
                {boatModel && (
                  <p className="text-sm text-slate-600">{boatModel.name}</p>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Created</p>
                <p className="text-sm">{formatDate(instruction.createdAt)}</p>
                <p className="text-xs text-slate-500">by {instruction.createdBy}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Last Updated</p>
                <p className="text-sm">{formatDate(instruction.updatedAt)}</p>
                <p className="text-xs text-slate-500">by {instruction.updatedBy}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
