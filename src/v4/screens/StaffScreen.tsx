'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  UserCheck,
  UserX,
  Search,
  Tag,
} from 'lucide-react';
import type { StaffMember, CreateStaffInput, UpdateStaffInput } from '@/domain/models';
import { StaffRepository } from '@/data/repositories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

export function StaffScreen() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setIsLoading(true);
    try {
      const all = await StaffRepository.getAll();
      setStaff(all);
    } catch (error) {
      console.error('Failed to load staff:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter staff based on search and active status
  const filteredStaff = staff.filter((s) => {
    // Filter by active status
    if (!showInactive && !s.isActive) return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(query) ||
        s.label?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Open create dialog
  function openCreateDialog() {
    setFormName('');
    setFormLabel('');
    setFormNotes('');
    setShowCreateDialog(true);
  }

  // Open edit dialog
  function openEditDialog(member: StaffMember) {
    setEditingStaff(member);
    setFormName(member.name);
    setFormLabel(member.label || '');
    setFormNotes(member.notes || '');
    setShowEditDialog(true);
  }

  // Open delete confirmation
  function openDeleteDialog(member: StaffMember) {
    setDeletingStaff(member);
    setShowDeleteDialog(true);
  }

  // Create new staff member
  async function handleCreate() {
    if (!formName.trim()) return;

    setIsSaving(true);
    try {
      const input: CreateStaffInput = {
        name: formName.trim(),
        label: formLabel.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };
      await StaffRepository.create(input);
      await loadStaff();
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create staff:', error);
      alert('Failed to create staff member');
    } finally {
      setIsSaving(false);
    }
  }

  // Update existing staff member
  async function handleUpdate() {
    if (!editingStaff || !formName.trim()) return;

    setIsSaving(true);
    try {
      const input: UpdateStaffInput = {
        name: formName.trim(),
        label: formLabel.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };
      await StaffRepository.update(editingStaff.id, input);
      await loadStaff();
      setShowEditDialog(false);
      setEditingStaff(null);
    } catch (error) {
      console.error('Failed to update staff:', error);
      alert('Failed to update staff member');
    } finally {
      setIsSaving(false);
    }
  }

  // Delete staff member
  async function handleDelete() {
    if (!deletingStaff) return;

    try {
      await StaffRepository.delete(deletingStaff.id);
      await loadStaff();
      setShowDeleteDialog(false);
      setDeletingStaff(null);
    } catch (error) {
      console.error('Failed to delete staff:', error);
      alert('Failed to delete staff member');
    }
  }

  // Toggle active status
  async function handleToggleActive(member: StaffMember) {
    try {
      if (member.isActive) {
        await StaffRepository.deactivate(member.id);
      } else {
        await StaffRepository.reactivate(member.id);
      }
      await loadStaff();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  }

  // Format date
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const activeCount = staff.filter((s) => s.isActive).length;
  const inactiveCount = staff.filter((s) => !s.isActive).length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
          <p className="text-slate-500 mt-1">
            Manage staff members for consistent assignment across projects
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{staff.length}</p>
                <p className="text-xs text-slate-500">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{activeCount}</p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <UserX className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-500">{inactiveCount}</p>
                <p className="text-xs text-slate-500">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>
                Staff names can be selected when assigning tasks in Planning and Production
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              {/* Show inactive toggle */}
              <Button
                variant={showInactive ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowInactive(!showInactive)}
              >
                {showInactive ? 'Hide Inactive' : 'Show Inactive'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Users className="h-8 w-8 text-slate-300 animate-pulse" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="text-base font-medium text-slate-900 mb-1">
                {searchQuery ? 'No staff found' : 'No staff members yet'}
              </h4>
              <p className="text-sm text-slate-500 max-w-xs mb-5">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add staff members to enable consistent assignment across projects'}
              </p>
              {!searchQuery && (
                <Button variant="outline" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow
                    key={member.id}
                    className={!member.isActive ? 'opacity-50' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-teal-700">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          {member.notes && (
                            <p className="text-xs text-slate-500 truncate max-w-xs">
                              {member.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.label ? (
                        <Badge variant="outline" className="gap-1">
                          <Tag className="h-3 w-3" />
                          {member.label}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.isActive ? (
                        <Badge className="bg-green-100 text-green-700 border-0">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDate(member.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => openEditDialog(member)}
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleToggleActive(member)}
                          title={member.isActive ? 'Deactivate' : 'Reactivate'}
                        >
                          {member.isActive ? (
                            <UserX className="h-3.5 w-3.5 text-slate-500" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5 text-green-600" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600"
                          onClick={() => openDeleteDialog(member)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Add a new staff member for task assignment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                placeholder="Enter name..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input
                placeholder="e.g., Electrician, Yard, Welder..."
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                A hint about their role or specialty
              </p>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Any additional notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formName.trim() || isSaving}
            >
              {isSaving ? 'Adding...' : 'Add Staff Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff member details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                placeholder="Enter name..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input
                placeholder="e.g., Electrician, Yard, Welder..."
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Any additional notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formName.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingStaff?.name}</strong>?
              This action cannot be undone.
              <br /><br />
              <span className="text-amber-600">
                Note: Existing task assignments will keep the name as free text.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
