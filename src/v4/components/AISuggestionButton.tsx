/**
 * AI Suggestion Button Component - v4
 *
 * A small, scoped "Suggest" button that generates AI suggestions for text content.
 * Only visible when the current user has aiEnabled = true.
 *
 * GOVERNANCE CONSTRAINTS:
 * - AI is restricted to TEXT-AUTHORING SURFACES ONLY
 * - Allowed scopes: 'owners-manual-section', 'compliance-text-snippet'
 * - NOT allowed: vessel identity fields, numeric specs, compliance-critical data
 * - AI is suggestion-only, never authoritative
 * - AI output is never auto-inserted
 * - User must explicitly Accept or Dismiss
 * - No AI influence on compliance status, costs, or workflow
 * - Accepted text becomes normal user-edited content (no persistent AI metadata)
 */

'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Loader2, Check, X, Info } from 'lucide-react';
import { useAuth } from '@/v4/state/useAuth';
import { AISuggestionService, type AISuggestionRequest, type AISuggestionResult } from '@/domain/services/AISuggestionService';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================
// TYPES
// ============================================

interface AISuggestionButtonProps {
  /** The request to send when generating a suggestion */
  request: AISuggestionRequest;
  /** Callback when user accepts the suggestion */
  onAccept: (suggestion: string) => void;
  /** Optional: Label for the button (default: "Suggest") */
  label?: string;
  /** Optional: Variant for button styling */
  variant?: 'default' | 'ghost' | 'outline' | 'subtle';
  /** Optional: Size of the button */
  size?: 'sm' | 'xs';
  /** Optional: Disabled state */
  disabled?: boolean;
  /** Optional: Title for the dialog */
  dialogTitle?: string;
  /** Optional: Description for the dialog */
  dialogDescription?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AISuggestionButton({
  request,
  onAccept,
  label = 'Suggest',
  variant = 'ghost',
  size = 'sm',
  disabled = false,
  dialogTitle = 'AI Suggestion',
  dialogDescription,
}: AISuggestionButtonProps) {
  const { canUseAI } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AISuggestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Don't render if user doesn't have AI enabled
  if (!canUseAI()) {
    return null;
  }

  const handleClick = useCallback(async () => {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const suggestion = await AISuggestionService.generateSuggestion(request);
      setResult(suggestion);
    } catch (err) {
      console.error('AI suggestion error:', err);
      setError('Failed to generate suggestion. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [request]);

  const handleAccept = useCallback(() => {
    if (result) {
      onAccept(result.suggestion);
      setIsOpen(false);
      setResult(null);
    }
  }, [result, onAccept]);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    setResult(null);
    setError(null);
  }, []);

  // Button sizing
  const buttonClass = size === 'xs'
    ? 'h-6 px-2 text-xs gap-1'
    : 'h-7 px-2.5 text-xs gap-1.5';

  return (
    <>
      <Button
        type="button"
        variant={variant === 'subtle' ? 'ghost' : variant}
        className={`${buttonClass} text-purple-600 hover:text-purple-700 hover:bg-purple-50`}
        onClick={handleClick}
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        {label}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              {dialogTitle}
            </DialogTitle>
            {dialogDescription && (
              <DialogDescription>{dialogDescription}</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 min-h-0 py-4">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-4" />
                <p className="text-sm text-slate-600">Generating suggestion...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {result && !isLoading && (
              <div className="space-y-4">
                {/* Demo/Disclaimer Banner */}
                <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <Info className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-purple-700">
                    <p className="font-medium">AI-generated suggestion (demo)</p>
                    <p className="text-purple-600 text-xs mt-0.5">
                      Review carefully before accepting. This text will replace the current content.
                    </p>
                  </div>
                </div>

                {/* Suggestion Content */}
                <div className="border rounded-lg">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b">
                    <span className="text-sm font-medium text-slate-700">Suggested Content</span>
                    {result.isDemo && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                        Demo
                      </Badge>
                    )}
                  </div>
                  <ScrollArea className="max-h-[300px]">
                    <div className="p-4">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {result.suggestion}
                      </p>
                    </div>
                  </ScrollArea>
                </div>

                {/* Current Content (if present in request) */}
                {request.currentContent && request.currentContent.trim() && (
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b">
                      <span className="text-sm font-medium text-slate-500">Current Content</span>
                      <Badge variant="outline" className="text-xs">Will be replaced</Badge>
                    </div>
                    <ScrollArea className="max-h-[150px]">
                      <div className="p-4">
                        <p className="text-sm text-slate-500 whitespace-pre-wrap">
                          {request.currentContent}
                        </p>
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={handleDismiss}>
              <X className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
            {result && !isLoading && (
              <Button
                onClick={handleAccept}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Accept & Replace
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// INLINE VARIANT (No dialog, shows preview inline)
// ============================================

interface AISuggestionInlineProps {
  /** Current content value */
  currentContent: string;
  /** Callback when user accepts the suggestion */
  onAccept: (suggestion: string) => void;
  /** Request generator function - creates request with current content */
  createRequest: (currentContent: string) => AISuggestionRequest;
  /** Optional: Disabled state */
  disabled?: boolean;
}

export function AISuggestionInline({
  currentContent,
  onAccept,
  createRequest,
  disabled = false,
}: AISuggestionInlineProps) {
  const { canUseAI } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Don't render if user doesn't have AI enabled
  if (!canUseAI()) {
    return null;
  }

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setIsVisible(true);

    try {
      const request = createRequest(currentContent);
      const result = await AISuggestionService.generateSuggestion(request);
      setSuggestion(result.suggestion);
    } catch (err) {
      console.error('AI suggestion error:', err);
      setSuggestion(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentContent, createRequest]);

  const handleAccept = useCallback(() => {
    if (suggestion) {
      onAccept(suggestion);
      setIsVisible(false);
      setSuggestion(null);
    }
  }, [suggestion, onAccept]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setSuggestion(null);
  }, []);

  if (!isVisible) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
        onClick={handleGenerate}
        disabled={disabled}
      >
        <Sparkles className="h-3 w-3" />
        Suggest
      </Button>
    );
  }

  return (
    <div className="mt-2 p-3 border border-purple-200 bg-purple-50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-purple-700 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI Suggestion
        </span>
        <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-600 border-purple-200">
          Demo
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
          <span className="text-sm text-purple-600">Generating...</span>
        </div>
      ) : suggestion ? (
        <>
          <p className="text-sm text-purple-800 whitespace-pre-wrap bg-white p-2 rounded border border-purple-100">
            {suggestion}
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleDismiss}
            >
              Dismiss
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
              onClick={handleAccept}
            >
              <Check className="h-3 w-3 mr-1" />
              Accept
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-red-600">Failed to generate suggestion.</p>
      )}
    </div>
  );
}

// ============================================
// AI ENABLED GUARD COMPONENT
// ============================================

interface AIEnabledGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard component that only renders children if user has AI enabled.
 * Use this to wrap AI-related UI sections.
 */
export function AIEnabledGuard({ children, fallback = null }: AIEnabledGuardProps) {
  const { canUseAI } = useAuth();

  if (!canUseAI()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
