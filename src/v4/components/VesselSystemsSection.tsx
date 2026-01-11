/**
 * Vessel Systems Section - v4
 * UI for editing project.systems (vessel systems/features).
 * Controls which Owner's Manual sections are included by default.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Settings,
  Plus,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
} from 'lucide-react';
import type { Project } from '@/domain/models';
import { SYSTEM_KEYS, ensureOwnerManualTemplateBlocks, getDraftVersion } from '@/domain/models/document-template';
import { ProjectRepository } from '@/data/repositories';
import { useAuth } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ============================================
// TYPES
// ============================================

interface VesselSystemsSectionProps {
  project: Project;
  onRefresh: () => void;
}

// ============================================
// SYSTEM KEY CATEGORIES
// ============================================

/**
 * Group system keys by category for better UX.
 */
const SYSTEM_CATEGORIES: { title: string; keys: readonly string[] }[] = [
  {
    title: 'Propulsion',
    keys: ['electric_propulsion', 'diesel_propulsion', 'outboard_propulsion', 'inboard_propulsion'],
  },
  {
    title: 'Fuel System',
    keys: ['fuel_system'],
  },
  {
    title: 'Electrical',
    keys: ['shore_power', 'solar_power', 'generator'],
  },
  {
    title: 'Steering',
    keys: ['hydraulic_steering', 'cable_steering', 'autopilot'],
  },
  {
    title: 'Safety',
    keys: ['bilge_pump', 'fire_extinguishers', 'fire_suppression_system', 'navigation_lights'],
  },
  {
    title: 'Climate',
    keys: ['heating', 'air_conditioning'],
  },
  {
    title: 'Water Systems',
    keys: ['fresh_water', 'hot_water', 'waste_water', 'holding_tank'],
  },
  {
    title: 'Deck Equipment',
    keys: ['anchor_windlass', 'bow_thruster', 'stern_thruster', 'davits', 'tender', 'swimming_platform', 'bimini_top', 'sprayhood'],
  },
  {
    title: 'Navigation Electronics',
    keys: ['radar', 'ais', 'vhf_radio', 'chartplotter', 'depth_sounder'],
  },
  {
    title: 'Domestic',
    keys: ['refrigeration', 'galley', 'heads', 'shower'],
  },
];

/**
 * Format a system key to human-readable label.
 */
function formatSystemKey(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get all known system keys as a Set for quick lookup.
 */
function getKnownSystemKeys(): Set<string> {
  return new Set(SYSTEM_KEYS);
}

// ============================================
// MAIN COMPONENT
// ============================================

export function VesselSystemsSection({ project, onRefresh }: VesselSystemsSectionProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newCustomKey, setNewCustomKey] = useState('');
  const [pendingSystems, setPendingSystems] = useState<string[] | null>(null);

  // Read-only if project is CLOSED
  const isReadOnly = project.status === 'CLOSED';

  // Only show for NEW_BUILD projects (they have Owner's Manual templates)
  if (project.type !== 'NEW_BUILD') {
    return null;
  }

  // Get current systems (use pending if editing, else project.systems)
  const currentSystems = pendingSystems ?? project.systems ?? [];
  const hasUnsavedChanges = pendingSystems !== null;

  // Separate known and custom keys
  const knownKeys = getKnownSystemKeys();
  const customKeys = currentSystems.filter((key) => !knownKeys.has(key));

  // Count for badge
  const systemCount = currentSystems.length;

  // ============================================
  // HANDLERS
  // ============================================

  function handleToggleSystem(key: string) {
    if (isReadOnly) return;

    const current = pendingSystems ?? project.systems ?? [];
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    setPendingSystems(next);
  }

  function handleAddCustomKey() {
    if (isReadOnly || !newCustomKey.trim()) return;

    const normalized = newCustomKey.trim().toLowerCase().replace(/\s+/g, '_');
    const current = pendingSystems ?? project.systems ?? [];

    if (!current.includes(normalized)) {
      setPendingSystems([...current, normalized]);
    }
    setNewCustomKey('');
  }

  function handleRemoveCustomKey(key: string) {
    if (isReadOnly) return;

    const current = pendingSystems ?? project.systems ?? [];
    setPendingSystems(current.filter((k) => k !== key));
  }

  function handleCancel() {
    setPendingSystems(null);
    setNewCustomKey('');
  }

  async function handleSave() {
    if (isReadOnly || !pendingSystems) return;

    setIsSaving(true);
    try {
      // Update project.systems
      let updatedProject = await ProjectRepository.update(project.id, {
        systems: pendingSystems,
      });

      if (!updatedProject) {
        alert('Failed to save systems');
        return;
      }

      // Now ensure Owner's Manual blocks are up-to-date for new systems
      // This preserves existing block content and user toggles
      // Only adds missing blocks with correct default inclusion
      if (updatedProject.documentTemplates) {
        const updatedTemplates = updatedProject.documentTemplates.map((template) => {
          if (template.type !== 'DOC_OWNERS_MANUAL') {
            return template;
          }
          return ensureOwnerManualTemplateBlocks(template, pendingSystems);
        });

        // Only save if templates changed
        const templatesChanged = updatedTemplates.some((t, i) =>
          t !== updatedProject!.documentTemplates![i]
        );

        if (templatesChanged) {
          await ProjectRepository.update(project.id, {
            documentTemplates: updatedTemplates,
          });
        }
      }

      setPendingSystems(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to save systems:', error);
      alert('Failed to save systems');
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <Card data-testid="vessel-systems-section">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-teal-600" />
                    Vessel Systems
                    {systemCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {systemCount} active
                      </Badge>
                    )}
                    {hasUnsavedChanges && (
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                        Unsaved
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Select installed systems to auto-include relevant Owner's Manual sections
                  </CardDescription>
                </div>
              </div>
              {isReadOnly && (
                <Badge variant="outline" className="text-xs text-slate-500">
                  Read-only
                </Badge>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p>
                  Selecting a system will automatically include its related sections in the Owner's Manual.
                  You can still manually toggle individual sections in the Owner's Manual editor.
                </p>
              </div>
            </div>

            {/* System Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SYSTEM_CATEGORIES.map((category) => (
                <div key={category.title} className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">{category.title}</h4>
                  <div className="space-y-1">
                    {category.keys.map((key) => {
                      const isChecked = currentSystems.includes(key);
                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-teal-50 border border-teal-200'
                              : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                          } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleSystem(key)}
                            disabled={isReadOnly}
                            className="h-4 w-4"
                            data-testid={`system-checkbox-${key}`}
                          />
                          <span className="text-sm text-slate-700">
                            {formatSystemKey(key)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Systems */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-700">Custom Systems</h4>

              {/* Existing custom keys */}
              {customKeys.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customKeys.map((key) => (
                    <Badge
                      key={key}
                      variant="outline"
                      className="flex items-center gap-1 py-1 px-2"
                    >
                      {formatSystemKey(key)}
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomKey(key)}
                          className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                          data-testid={`remove-custom-system-${key}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add custom key */}
              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Add custom system (e.g., water_maker)"
                    value={newCustomKey}
                    onChange={(e) => setNewCustomKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomKey()}
                    className="max-w-xs"
                    data-testid="custom-system-input"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomKey}
                    disabled={!newCustomKey.trim()}
                    data-testid="add-custom-system-btn"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              )}

              {customKeys.length === 0 && !newCustomKey && (
                <p className="text-xs text-slate-500 italic">
                  No custom systems. Add one if your vessel has equipment not listed above.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {hasUnsavedChanges && !isReadOnly && (
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-teal-600 hover:bg-teal-700"
                  data-testid="save-systems-btn"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Save Systems
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
