'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  Archive,
} from 'lucide-react';
import type { Client, ClientStatus } from '@/domain/models';
import { ClientRepository } from '@/data/repositories';
import { getAuditContext } from '@/domain/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const STATUS_COLORS: Record<ClientStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  prospect: { bg: 'bg-blue-100', text: 'text-blue-700' },
  inactive: { bg: 'bg-slate-100', text: 'text-slate-500' },
};

export function ClientListScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setIsLoading(true);
    try {
      const clientList = await ClientRepository.getAll();
      setClients(clientList);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredClients = clients
    .filter((c) => !c.archivedAt)
    .filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.clientNumber.toLowerCase().includes(query) ||
          c.city?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const statusCounts = clients.reduce(
    (acc, c) => {
      if (!c.archivedAt) {
        acc[c.status] = (acc[c.status] || 0) + 1;
        acc.total++;
      }
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  async function handleArchive(client: Client) {
    if (!confirm(`Archive client "${client.name}"?`)) return;

    const context = getAuditContext();
    await ClientRepository.archive(client.id, context.userId, 'Archived by user');
    await loadClients();
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Users className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="h-7 w-7 text-teal-600" />
            Clients
          </h1>
          <p className="text-slate-600 mt-1">
            Manage your client database
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />
          New Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Total"
          value={statusCounts.total || 0}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <StatCard
          label="Active"
          value={statusCounts.active || 0}
          color="bg-green-100"
          active={statusFilter === 'active'}
          onClick={() => setStatusFilter('active')}
        />
        <StatCard
          label="Prospects"
          value={statusCounts.prospect || 0}
          color="bg-blue-100"
          active={statusFilter === 'prospect'}
          onClick={() => setStatusFilter('prospect')}
        />
        <StatCard
          label="Inactive"
          value={statusCounts.inactive || 0}
          color="bg-slate-100"
          active={statusFilter === 'inactive'}
          onClick={() => setStatusFilter('inactive')}
        />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No clients found</h3>
            <p className="text-slate-600 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search'
                : 'Add your first client to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:border-teal-300 transition-colors">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      client.type === 'company' ? 'bg-blue-100' : 'bg-teal-100'
                    }`}>
                      {client.type === 'company' ? (
                        <Building2 className="h-5 w-5 text-blue-600" />
                      ) : (
                        <User className="h-5 w-5 text-teal-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{client.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{client.clientNumber}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingClient(client)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleArchive(client)}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm">
                  {client.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {(client.city || client.country) && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{[client.city, client.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Badge className={`${STATUS_COLORS[client.status].bg} ${STATUS_COLORS[client.status].text} border-0`}>
                    {client.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {client.type}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <ClientDialog
        open={showCreateDialog || !!editingClient}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingClient(null);
          }
        }}
        client={editingClient}
        onSave={async () => {
          setShowCreateDialog(false);
          setEditingClient(null);
          await loadClients();
        }}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, color = 'bg-slate-100', active, onClick }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-lg text-center transition-all ${
        active ? 'ring-2 ring-teal-500 ring-offset-2' : ''
      } ${color} hover:opacity-80`}
    >
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </button>
  );
}

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSave: () => Promise<void>;
}

function ClientDialog({ open, onOpenChange, client, onSave }: ClientDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'private' as 'company' | 'private',
    email: '',
    phone: '',
    street: '',
    postalCode: '',
    city: '',
    country: 'Netherlands',
    vatNumber: '',
    status: 'active' as ClientStatus,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        type: client.type,
        email: client.email || '',
        phone: client.phone || '',
        street: client.street || '',
        postalCode: client.postalCode || '',
        city: client.city || '',
        country: client.country,
        vatNumber: client.vatNumber || '',
        status: client.status,
      });
    } else {
      setFormData({
        name: '',
        type: 'private',
        email: '',
        phone: '',
        street: '',
        postalCode: '',
        city: '',
        country: 'Netherlands',
        vatNumber: '',
        status: 'active',
      });
    }
  }, [client]);

  async function handleSubmit() {
    if (!formData.name) return;

    setIsLoading(true);
    try {
      if (client) {
        await ClientRepository.update(client.id, formData);
      } else {
        await ClientRepository.create(formData);
      }
      await onSave();
    } catch (error) {
      console.error('Failed to save client:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'New Client'}</DialogTitle>
          <DialogDescription>
            {client ? 'Update client information' : 'Add a new client to your database'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Client Type</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(v) => setFormData({ ...formData, type: v as 'company' | 'private' })}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="font-normal">Private</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="company" id="company" />
                <Label htmlFor="company" className="font-normal">Company</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={formData.type === 'company' ? 'Company name' : 'Full name'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+31 6 12345678"
              />
            </div>
          </div>

          <div>
            <Label>Street</Label>
            <Input
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              placeholder="Street and number"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Postal Code</Label>
              <Input
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="1234 AB"
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div>
              <Label>Country</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
          </div>

          {formData.type === 'company' && (
            <div>
              <Label>VAT Number</Label>
              <Input
                value={formData.vatNumber}
                onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                placeholder="NL123456789B01"
              />
            </div>
          )}

          <div>
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData({ ...formData, status: v as ClientStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || isLoading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {client ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
