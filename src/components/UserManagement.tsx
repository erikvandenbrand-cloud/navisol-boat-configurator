'use client';

import { useState, useMemo } from 'react';
import {
  Users, UserPlus, Edit, Trash2, Shield, Key, Search,
  AlertTriangle, Check, X, UserCog, Mail, Calendar
} from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { formatEuroDate } from '@/lib/formatting';
import { ROLE_NAMES, ROLE_DESCRIPTIONS, type User, type UserRole } from '@/lib/auth-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

const ROLES: UserRole[] = ['viewer', 'production', 'sales', 'manager', 'admin'];

export function UserManagement() {
  const { users, currentUser, addUser, updateUser, deleteUser, resetPassword, hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [users, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.isActive).length,
    admins: users.filter(u => u.role === 'admin').length,
  }), [users]);

  if (!hasPermission('viewUsers')) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-16 w-16 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700">Access Denied</h2>
        <p className="text-slate-500">You don't have permission to view user management.</p>
      </div>
    );
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-600';
      case 'manager': return 'bg-purple-600';
      case 'sales': return 'bg-blue-600';
      case 'production': return 'bg-orange-600';
      default: return 'bg-slate-600';
    }
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const success = deleteUser(deleteConfirm.id);
    if (!success) {
      setError('Cannot delete this user. They may be the last admin or yourself.');
    }
    setDeleteConfirm(null);
  };

  const handleResetPassword = () => {
    if (!resetPasswordUser || !newPassword) return;
    const success = resetPassword(resetPasswordUser.id, newPassword);
    if (success) {
      setResetPasswordUser(null);
      setNewPassword('');
    } else {
      setError('Password must be at least 4 characters.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <UserCog className="h-7 w-7 text-purple-600" />
            User Management
          </h1>
          <p className="text-slate-600">Manage system users and their access permissions</p>
        </div>

        {hasPermission('manageUsers') && (
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-600">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
            <div className="text-sm text-slate-600">Active Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.admins}</div>
            <div className="text-sm text-slate-600">Administrators</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search users by name, username, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className={user.id === currentUser?.id ? 'bg-purple-50' : ''}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-slate-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{user.username}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {ROLE_NAMES[user.role].en}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-500 text-red-600">
                        <X className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? (
                      <span className="text-sm text-slate-600">
                        {formatEuroDate(user.lastLogin)}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {hasPermission('manageUsers') && (
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setResetPasswordUser(user)}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteConfirm(user)}
                          disabled={user.id === currentUser?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map(role => (
              <div key={role} className="p-4 border rounded-lg">
                <Badge className={`${getRoleBadgeColor(role)} mb-2`}>
                  {ROLE_NAMES[role].en}
                </Badge>
                <p className="text-sm text-slate-600">{ROLE_DESCRIPTIONS[role].en}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <UserFormDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSave={(data) => {
          const result = addUser(data);
          if (result) {
            setIsAddDialogOpen(false);
          } else {
            setError('Username already exists.');
          }
        }}
      />

      {/* Edit User Dialog */}
      {editingUser && (
        <UserFormDialog
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          onSave={(data) => {
            const success = updateUser(editingUser.id, data);
            if (success) {
              setEditingUser(null);
            } else {
              setError('Username already exists.');
            }
          }}
        />
      )}

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={() => { setResetPasswordUser(null); setNewPassword(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-600" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordUser?.firstName} {resetPasswordUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 4 characters)"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPasswordUser(null); setNewPassword(''); }}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} className="bg-purple-600 hover:bg-purple-700">
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user "{deleteConfirm?.username}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// User Form Dialog
interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  user?: User;
  onSave: (data: Omit<User, 'id' | 'createdAt'>) => void;
}

function UserFormDialog({ open, onClose, user, onSave }: UserFormDialogProps) {
  const [formData, setFormData] = useState<Partial<User>>(user || {
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'viewer',
    isActive: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      username: formData.username || '',
      password: formData.password || 'password123',
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      email: formData.email || '',
      role: formData.role as UserRole || 'viewer',
      isActive: formData.isActive ?? true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Username *</Label>
              <Input
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            {!user && (
              <div>
                <Label>Initial Password *</Label>
                <Input
                  type="password"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Min 4 characters"
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label>Role *</Label>
              <Select
                value={formData.role || 'viewer'}
                onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role} value={role}>
                      {ROLE_NAMES[role].en} - {ROLE_DESCRIPTIONS[role].en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive ?? true}
                onCheckedChange={(c) => setFormData({ ...formData, isActive: c })}
              />
              <Label>Active Account</Label>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
              {user ? 'Update User' : 'Add User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
