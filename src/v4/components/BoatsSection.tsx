/**
 * Boats Section - v4
 * Manages boat instances for serial production (NEW_BUILD projects)
 */

'use client';

import { useState } from 'react';
import { Plus, Anchor, Ship, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Project, BoatInstance } from '@/domain/models';
import { generateUUID } from '@/domain/models';
import { WINRegisterService } from '@/domain/services/WINRegisterService';
import { ProjectRepository } from '@/data/repositories';
import { getAuditContext } from '@/domain/auth';
import { PermissionGuard } from '@/v4/state/useAuth';

// ============================================
// PROPS
// ============================================

interface BoatsSectionProps {
  project: Project;
  onRefresh: () => Promise<void>;
}

// ============================================
// COMPONENT
// ============================================

export function BoatsSection({ project, onRefresh }: BoatsSectionProps) {
  // Get boats with migration applied
  const boats = WINRegisterService.getProjectBoats(project);

  // Editing state
  const [editingBoatId, setEditingBoatId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editWin, setEditWin] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<BoatInstance | null>(null);

  // Determine if editing is allowed
  const isClosed = project.status === 'CLOSED';
  const isNewBuild = project.type === 'NEW_BUILD';

  // Save boats to project
  async function saveBoats(updatedBoats: BoatInstance[]) {
    setIsSaving(true);
    try {
      await ProjectRepository.update(project.id, {
        boats: updatedBoats,
      });
      await onRefresh();
    } catch (error) {
      console.error('Failed to save boats:', error);
    } finally {
      setIsSaving(false);
    }
  }

  // Add a new boat
  async function handleAddBoat() {
    if (isClosed) return;

    const nextNumber = boats.length + 1;
    const newBoat: BoatInstance = {
      id: generateUUID(),
      label: `Boat ${String(nextNumber).padStart(2, '0')}`,
      win: undefined,
    };

    await saveBoats([...boats, newBoat]);
  }

  // Start editing a boat
  function handleStartEdit(boat: BoatInstance) {
    if (isClosed) return;
    setEditingBoatId(boat.id);
    setEditLabel(boat.label);
    setEditWin(boat.win || '');
  }

  // Cancel editing
  function handleCancelEdit() {
    setEditingBoatId(null);
    setEditLabel('');
    setEditWin('');
  }

  // Save edit
  async function handleSaveEdit() {
    if (!editingBoatId || isClosed) return;

    const updatedBoats = boats.map((boat) =>
      boat.id === editingBoatId
        ? {
            ...boat,
            label: editLabel.trim() || boat.label,
            win: editWin.trim() || undefined,
          }
        : boat
    );

    await saveBoats(updatedBoats);
    handleCancelEdit();
  }

  // Handle blur to save
  async function handleBlur() {
    if (editingBoatId) {
      await handleSaveEdit();
    }
  }

  // Handle key press
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }

  // Check if boat can be deleted (must have at least 1 boat remaining)
  function canDeleteBoat(): boolean {
    return boats.length > 1;
  }

  // Start delete confirmation
  function handleStartDelete(boat: BoatInstance) {
    if (isClosed || !canDeleteBoat()) return;
    setDeleteTarget(boat);
  }

  // Cancel delete
  function handleCancelDelete() {
    setDeleteTarget(null);
  }

  // Confirm delete and renumber labels if needed
  async function handleConfirmDelete() {
    if (!deleteTarget || !canDeleteBoat()) return;

    // Remove the boat
    const remainingBoats = boats.filter((b) => b.id !== deleteTarget.id);

    // Renumber labels for boats with default "Boat XX" pattern
    const renumberedBoats = remainingBoats.map((boat, index) => {
      // Only renumber if the label matches the default pattern
      const defaultPattern = /^Boat \d{2}$/;
      if (defaultPattern.test(boat.label)) {
        return {
          ...boat,
          label: `Boat ${String(index + 1).padStart(2, '0')}`,
        };
      }
      return boat;
    });

    await saveBoats(renumberedBoats);
    setDeleteTarget(null);
  }

  // Get delete confirmation message
  function getDeleteConfirmationMessage(): string {
    if (!deleteTarget) return '';

    const warnings: string[] = [];

    if (deleteTarget.win) {
      warnings.push(`This boat has a registered WIN/CIN: ${deleteTarget.win}`);
    }

    if (warnings.length > 0) {
      return `${warnings.join('. ')}. Are you sure you want to delete "${deleteTarget.label}"? This action cannot be undone.`;
    }

    return `Are you sure you want to delete "${deleteTarget.label}"? This action cannot be undone.`;
  }

  // Show only for NEW_BUILD projects
  if (!isNewBuild) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-teal-600" />
            Boats
          </CardTitle>
          <CardDescription>
            {isClosed
              ? 'Boat instances for this project (read-only)'
              : 'Manage boat instances for serial production'}
          </CardDescription>
        </div>
        {!isClosed && (
          <PermissionGuard permission="project:update">
            <Button onClick={handleAddBoat} disabled={isSaving} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Boat
            </Button>
          </PermissionGuard>
        )}
      </CardHeader>
      <CardContent>
        {boats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <Ship className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 mb-4">
              No boats defined for this project yet.
            </p>
            {!isClosed && (
              <Button variant="outline" size="sm" onClick={handleAddBoat}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Boat
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead className="w-[200px]">Label</TableHead>
                  <TableHead>WIN / CIN</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  {!isClosed && boats.length > 1 && (
                    <TableHead className="w-[80px]">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {boats.map((boat, index) => {
                  const isEditing = editingBoatId === boat.id;

                  return (
                    <TableRow key={boat.id}>
                      <TableCell className="text-slate-500">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            className="h-8"
                            autoFocus
                            disabled={isSaving}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(boat)}
                            className={`text-left font-medium ${
                              isClosed
                                ? 'cursor-default text-slate-700'
                                : 'hover:text-teal-600 cursor-pointer'
                            }`}
                            disabled={isClosed}
                          >
                            {boat.label}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editWin}
                            onChange={(e) => setEditWin(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g., NL-NAV-00001-2025"
                            className="h-8 font-mono"
                            disabled={isSaving}
                          />
                        ) : boat.win ? (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(boat)}
                            className={`text-left font-mono text-sm ${
                              isClosed
                                ? 'cursor-default text-slate-900'
                                : 'hover:text-teal-600 cursor-pointer'
                            }`}
                            disabled={isClosed}
                          >
                            {boat.win}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(boat)}
                            className={`text-left text-slate-400 ${
                              isClosed
                                ? 'cursor-default'
                                : 'hover:text-teal-600 cursor-pointer'
                            }`}
                            disabled={isClosed}
                          >
                            {isClosed ? '—' : 'Click to add WIN'}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {boat.win ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200">
                            Registered
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      {!isClosed && boats.length > 1 && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartDelete(boat)}
                            disabled={isSaving}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            data-testid={`delete-boat-${boat.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>{boats.length} boat{boats.length !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span className="text-green-600">
                  {boats.filter((b) => b.win).length} with WIN
                </span>
                <span>•</span>
                <span className="text-amber-600">
                  {boats.filter((b) => !b.win).length} pending
                </span>
              </div>
              {isClosed && (
                <Badge variant="outline" className="text-slate-500">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Read-only (Project closed)
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && handleCancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Boat
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {deleteTarget?.win && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <strong>Warning:</strong> This boat has a registered WIN/CIN:{' '}
                      <code className="bg-amber-100 px-1 rounded">{deleteTarget.win}</code>
                    </div>
                  </div>
                </div>
              )}
              <p>
                Are you sure you want to delete <strong>"{deleteTarget?.label}"</strong>?
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-boat"
            >
              {isSaving ? 'Deleting...' : 'Delete Boat'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
