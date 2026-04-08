/**
 * Generate Equipment List Dialog - v4
 *
 * Dialog for generating equipment lists from project configuration.
 * Supports brand selection and optional unit selection.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  FileText,
  Palette,
  Ship,
  Info,
} from 'lucide-react';
import type {
  Project,
  EquipmentListBrand,
  ConfigurationSnapshot,
  BoatInstance,
} from '@/domain/models';
import { DEFAULT_EQUIPMENT_LIST_BRANDS } from '@/domain/models';
import { EquipmentListService } from '@/domain/services';
import { getAuditContext } from '@/domain/auth';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { toSelectValue, fromSelectValue, NONE_VALUE, CURRENT_VALUE } from '@/v4/utils/selectUtils';

// ============================================
// TYPES
// ============================================

interface GenerateEquipmentListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onGenerated: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function GenerateEquipmentListDialog({
  open,
  onOpenChange,
  project,
  onGenerated,
}: GenerateEquipmentListDialogProps) {
  const [brandKey, setBrandKey] = useState('default');
  const [unitId, setUnitId] = useState<string | undefined>(undefined);
  const [snapshotId, setSnapshotId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brands = DEFAULT_EQUIPMENT_LIST_BRANDS;
  const hasMultipleUnits = (project.boats?.length || 0) > 1;
  const hasSnapshots = project.configurationSnapshots.length > 0;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setBrandKey('default');
      setUnitId(undefined);
      setSnapshotId(undefined);
      setNotes('');
      setError(null);
    }
  }, [open]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await EquipmentListService.generate(
        {
          projectId: project.id,
          unitId: unitId || undefined,
          configurationSnapshotId: snapshotId || undefined,
          brandKey,
          notes: notes.trim() || undefined,
        },
        getAuditContext()
      );

      if (result.ok) {
        onGenerated();
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to generate equipment list');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedBrand = brands.find(b => b.key === brandKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            Generate Equipment List
          </DialogTitle>
          <DialogDescription>
            Create a non-priced equipment list from the project configuration.
            This list can be included with quotes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Brand Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-slate-500" />
              Brand / House Style
            </Label>
            <Select value={brandKey} onValueChange={setBrandKey}>
              <SelectTrigger>
                <SelectValue placeholder="Select brand template" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.key} value={brand.key}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: brand.primaryColor }}
                      />
                      <span>{brand.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBrand?.companyName && (
              <p className="text-xs text-slate-500">
                Company: {selectedBrand.companyName}
              </p>
            )}
          </div>

          {/* Unit Selection (for multi-unit projects) */}
          {hasMultipleUnits && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-slate-500" />
                Unit (optional)
              </Label>
              <Select value={toSelectValue(unitId)} onValueChange={(v) => setUnitId(fromSelectValue(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="All units (project-wide)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>All units (project-wide)</SelectItem>
                  {project.boats?.map((boat) => (
                    <SelectItem key={boat.id} value={boat.id}>
                      {boat.label} {boat.win && `(${boat.win})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Leave empty to generate for the entire project
              </p>
            </div>
          )}

          {/* Configuration Source */}
          {hasSnapshots && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Configuration Source
              </Label>
              <Select value={toSelectValue(snapshotId, CURRENT_VALUE)} onValueChange={(v) => setSnapshotId(fromSelectValue(v, CURRENT_VALUE))}>
                <SelectTrigger>
                  <SelectValue placeholder="Current configuration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CURRENT_VALUE}>Current configuration</SelectItem>
                  {project.configurationSnapshots.map((snapshot) => (
                    <SelectItem key={snapshot.id} value={snapshot.id}>
                      <div className="flex items-center gap-2">
                        <span>Snapshot #{snapshot.snapshotNumber}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {snapshot.trigger}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Use a snapshot for reproducible lists tied to a specific milestone
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes to include..."
              rows={2}
            />
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
            <Info className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-600">
              <p className="font-medium mb-1">Equipment lists contain:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Item names, descriptions, and article numbers</li>
                <li>Quantities and units</li>
                <li>Category groupings</li>
                <li>CE relevance indicators</li>
              </ul>
              <p className="mt-2 text-slate-500">
                No pricing information is included.
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
