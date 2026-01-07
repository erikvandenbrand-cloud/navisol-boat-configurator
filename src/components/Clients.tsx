'use client';

import { useState, useMemo } from 'react';
import {
  Users, User, Plus, Search, Edit, Trash2, Ship, FileText,
  Mail, Phone, MapPin, Building, Eye, ChevronRight, Receipt,
  AlertTriangle, Anchor, Calendar, Hash, Clock, Factory
} from 'lucide-react';
import { ProductionTimeline } from './ProductionTimeline';
import { useNavisol } from '@/lib/store';
import { formatEuroCurrency, formatEuroDate, calculateLineTotal, calculateTotalInclVAT } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import type { Client, ClientBoat, BoatModel, PropulsionType, ProjectCategory } from '@/lib/types';
import { PROJECT_CATEGORY_INFO } from '@/lib/types';

export function Clients() {
  const {
    clients, addClient, updateClient, deleteClient,
    clientBoats, addClientBoat, updateClientBoat, deleteClientBoat, getClientBoats,
    configurations, quotations, settings
  } = useNavisol();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isAddBoatOpen, setIsAddBoatOpen] = useState(false);
  const [editingBoat, setEditingBoat] = useState<ClientBoat | null>(null);
  const [viewingProduction, setViewingProduction] = useState<ClientBoat | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'client' | 'boat'; id: string; name: string } | null>(null);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch =
        client.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  // Get client's boats
  const selectedClientBoats = useMemo(() => {
    if (!selectedClient) return [];
    return getClientBoats(selectedClient.id);
  }, [selectedClient, getClientBoats]);

  // Get client's configurations
  const selectedClientConfigs = useMemo(() => {
    if (!selectedClient) return [];
    return configurations.filter(c => c.client_id === selectedClient.id);
  }, [selectedClient, configurations]);

  // Get client's quotations
  const selectedClientQuotations = useMemo(() => {
    if (!selectedClient) return [];
    return quotations.filter(q => q.client_id === selectedClient.id);
  }, [selectedClient, quotations]);

  // Stats
  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    prospects: clients.filter(c => c.status === 'prospect').length,
    totalBoats: clientBoats.length,
  }), [clients, clientBoats]);

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'client') {
      deleteClient(deleteConfirm.id);
      if (selectedClient?.id === deleteConfirm.id) {
        setSelectedClient(null);
      }
    } else {
      deleteClientBoat(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="h-7 w-7 text-emerald-600" />
            Clients
          </h1>
          <p className="text-slate-600">Manage clients, their boats, and related documents</p>
        </div>

        <Button onClick={() => setIsAddClientOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-600">Total Clients</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
            <div className="text-sm text-slate-600">Active Clients</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.prospects}</div>
            <div className="text-sm text-slate-600">Prospects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{stats.totalBoats}</div>
            <div className="text-sm text-slate-600">Total Boats</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Client List</CardTitle>
            <div className="space-y-2 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="prospect">Prospects</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {filteredClients.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No clients found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredClients.map((client) => {
                    const boatCount = getClientBoats(client.id).length;
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setSelectedClient(client)}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          selectedClient?.id === client.id
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              {client.company_name || `${client.first_name} ${client.last_name}`}
                            </div>
                            {client.company_name && (
                              <div className="text-sm text-slate-500">
                                {client.first_name} {client.last_name}
                              </div>
                            )}
                          </div>
                          <Badge
                            variant={client.status === 'active' ? 'default' : 'secondary'}
                            className={client.status === 'active' ? 'bg-emerald-600' : ''}
                          >
                            {client.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Ship className="h-3 w-3" />
                            {boatCount} boat{boatCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {client.city}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Client Details */}
        <Card className="lg:col-span-2">
          {selectedClient ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      {selectedClient.company_name || `${selectedClient.first_name} ${selectedClient.last_name}`}
                    </CardTitle>
                    <CardDescription>
                      Client since {formatEuroDate(selectedClient.created_at)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditClientOpen(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setDeleteConfirm({
                        type: 'client',
                        id: selectedClient.id,
                        name: selectedClient.company_name || `${selectedClient.first_name} ${selectedClient.last_name}`
                      })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="info">
                  <TabsList className="mb-4">
                    <TabsTrigger value="info">Information</TabsTrigger>
                    <TabsTrigger value="boats">
                      Boats ({selectedClientBoats.length})
                    </TabsTrigger>
                    <TabsTrigger value="documents">
                      Documents ({selectedClientQuotations.length + selectedClientConfigs.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-900">Contact Information</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-slate-400" />
                            <span>{selectedClient.first_name} {selectedClient.last_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <a href={`mailto:${selectedClient.email}`} className="text-emerald-600 hover:underline">
                              {selectedClient.email}
                            </a>
                          </div>
                          {selectedClient.phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <span>{selectedClient.phone}</span>
                            </div>
                          )}
                          {selectedClient.mobile && (
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <span>{selectedClient.mobile} (mobile)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-900">Address</h4>
                        <div className="space-y-1 text-slate-600">
                          <p>{selectedClient.street_address}</p>
                          <p>{selectedClient.postal_code} {selectedClient.city}</p>
                          <p>{selectedClient.country}</p>
                        </div>
                      </div>

                      {(selectedClient.vat_number || selectedClient.chamber_of_commerce) && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-slate-900">Business Details</h4>
                          <div className="space-y-2 text-sm">
                            {selectedClient.vat_number && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">VAT Number:</span>
                                <span>{selectedClient.vat_number}</span>
                              </div>
                            )}
                            {selectedClient.chamber_of_commerce && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">CoC Number:</span>
                                <span>{selectedClient.chamber_of_commerce}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedClient.notes && (
                        <div className="col-span-2 space-y-2">
                          <h4 className="font-medium text-slate-900">Notes</h4>
                          <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg">
                            {selectedClient.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="boats">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-slate-900">Registered Boats</h4>
                        <Button size="sm" onClick={() => setIsAddBoatOpen(true)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Boat
                        </Button>
                      </div>

                      {selectedClientBoats.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                          <Ship className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>No boats registered for this client</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedClientBoats.map((boat) => (
                            <div
                              key={boat.id}
                              className="p-4 border rounded-lg hover:border-emerald-200 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    <Ship className="h-4 w-4 text-emerald-600" />
                                    {boat.boat_name || boat.boat_model}
                                  </div>
                                  <div className="text-sm text-slate-500 mt-1">
                                    {boat.boat_model} - {boat.propulsion_type}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={boat.status === 'delivered' ? 'default' : 'secondary'}
                                    className={boat.status === 'delivered' ? 'bg-emerald-600' : boat.status === 'in_production' ? 'bg-blue-600' : ''}
                                  >
                                    {boat.status.replace('_', ' ')}
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setViewingProduction(boat)}
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                  >
                                    <Factory className="h-4 w-4 mr-1" />
                                    Production
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingBoat(boat)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500"
                                    onClick={() => setDeleteConfirm({
                                      type: 'boat',
                                      id: boat.id,
                                      name: boat.boat_name || boat.boat_model
                                    })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Production progress indicator */}
                              {boat.production_timeline && boat.production_timeline.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Production Progress
                                    </span>
                                    <span>
                                      {boat.production_timeline.filter(t => t.status === 'completed').length} / {boat.production_timeline.length} stages
                                    </span>
                                  </div>
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full transition-all"
                                      style={{
                                        width: `${(boat.production_timeline.filter(t => t.status === 'completed').length / boat.production_timeline.length) * 100}%`
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                                {boat.hull_identification_number && (
                                  <div>
                                    <span className="text-slate-500">HIN:</span>{' '}
                                    <span className="font-mono">{boat.hull_identification_number}</span>
                                  </div>
                                )}
                                {boat.year_built && (
                                  <div>
                                    <span className="text-slate-500">Year:</span> {boat.year_built}
                                  </div>
                                )}
                                {boat.home_port && (
                                  <div>
                                    <span className="text-slate-500">Port:</span> {boat.home_port}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="documents">
                    <div className="space-y-6">
                      {/* Quotations */}
                      <div>
                        <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Quotations ({selectedClientQuotations.length})
                        </h4>
                        {selectedClientQuotations.length === 0 ? (
                          <p className="text-slate-500 text-sm">No quotations for this client</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Number</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Configuration</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedClientQuotations.map((q) => (
                                <TableRow key={q.id}>
                                  <TableCell className="font-mono">{q.quotation_number}</TableCell>
                                  <TableCell>{q.date}</TableCell>
                                  <TableCell>{q.configuration.name}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatEuroCurrency(q.total_incl_vat)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{q.status || 'draft'}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

                      {/* Configurations */}
                      <div>
                        <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Configurations ({selectedClientConfigs.length})
                        </h4>
                        {selectedClientConfigs.length === 0 ? (
                          <p className="text-slate-500 text-sm">No configurations for this client</p>
                        ) : (
                          <div className="space-y-2">
                            {selectedClientConfigs.map((config) => (
                              <div key={config.id} className="p-3 border rounded-lg flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{config.name}</div>
                                  <div className="text-sm text-slate-500">
                                    {config.boat_model} - {config.propulsion_type}
                                  </div>
                                </div>
                                <div className="text-sm text-slate-500">
                                  {formatEuroDate(config.created_at)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="h-[600px] flex items-center justify-center">
              <div className="text-center text-slate-500">
                <User className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-1">Select a Client</p>
                <p className="text-sm">Choose a client from the list to view their details</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Add Client Dialog */}
      <ClientFormDialog
        open={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onSave={(data) => {
          addClient(data);
          setIsAddClientOpen(false);
        }}
      />

      {/* Edit Client Dialog */}
      {selectedClient && (
        <ClientFormDialog
          open={isEditClientOpen}
          onClose={() => setIsEditClientOpen(false)}
          client={selectedClient}
          onSave={(data) => {
            updateClient(selectedClient.id, data);
            setIsEditClientOpen(false);
          }}
        />
      )}

      {/* Add Boat Dialog */}
      {selectedClient && (
        <BoatFormDialog
          open={isAddBoatOpen}
          onClose={() => setIsAddBoatOpen(false)}
          clientId={selectedClient.id}
          onSave={(data) => {
            addClientBoat(data);
            setIsAddBoatOpen(false);
          }}
        />
      )}

      {/* Edit Boat Dialog */}
      {editingBoat && (
        <BoatFormDialog
          open={!!editingBoat}
          onClose={() => setEditingBoat(null)}
          clientId={editingBoat.client_id}
          boat={editingBoat}
          onSave={(data) => {
            updateClientBoat(editingBoat.id, data);
            setEditingBoat(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete {deleteConfirm?.type === 'client' ? 'Client' : 'Boat'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"?
              {deleteConfirm?.type === 'client' && ' This will also delete all associated boats.'}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Production Timeline Dialog */}
      {viewingProduction && (
        <Dialog open={!!viewingProduction} onOpenChange={() => setViewingProduction(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-blue-600" />
                Production Tracking - {viewingProduction.boat_name || viewingProduction.boat_model}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <ProductionTimeline
                boat={viewingProduction}
                onUpdate={(boatId, updates) => {
                  updateClientBoat(boatId, updates);
                  // Update the viewing boat state to reflect changes
                  setViewingProduction(prev => prev ? { ...prev, ...updates } : null);
                }}
              />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Client Form Dialog
interface ClientFormDialogProps {
  open: boolean;
  onClose: () => void;
  client?: Client;
  onSave: (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => void;
}

function ClientFormDialog({ open, onClose, client, onSave }: ClientFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Client>>(client || {
    first_name: '',
    last_name: '',
    email: '',
    street_address: '',
    postal_code: '',
    city: '',
    country: 'Netherlands',
    status: 'prospect',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      company_name: formData.company_name,
      first_name: formData.first_name || '',
      last_name: formData.last_name || '',
      email: formData.email || '',
      phone: formData.phone,
      mobile: formData.mobile,
      street_address: formData.street_address || '',
      postal_code: formData.postal_code || '',
      city: formData.city || '',
      country: formData.country || 'Netherlands',
      vat_number: formData.vat_number,
      chamber_of_commerce: formData.chamber_of_commerce,
      notes: formData.notes,
      status: formData.status || 'prospect',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Personal/Company Info */}
              <div className="space-y-4">
                <h4 className="font-medium border-b pb-2">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Company Name (optional)</Label>
                    <Input
                      value={formData.company_name || ''}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      value={formData.first_name || ''}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      value={formData.last_name || ''}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Mobile</Label>
                    <Input
                      value={formData.mobile || ''}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={formData.status || 'prospect'}
                      onValueChange={(v) => setFormData({ ...formData, status: v as Client['status'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h4 className="font-medium border-b pb-2">Address</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Street Address *</Label>
                    <Input
                      value={formData.street_address || ''}
                      onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Postal Code *</Label>
                    <Input
                      value={formData.postal_code || ''}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>City *</Label>
                    <Input
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Country *</Label>
                    <Input
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div className="space-y-4">
                <h4 className="font-medium border-b pb-2">Business Details (optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>VAT Number</Label>
                    <Input
                      value={formData.vat_number || ''}
                      onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Chamber of Commerce</Label>
                    <Input
                      value={formData.chamber_of_commerce || ''}
                      onChange={(e) => setFormData({ ...formData, chamber_of_commerce: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              {client ? 'Update Client' : 'Add Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Boat Form Dialog
interface BoatFormDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  boat?: ClientBoat;
  onSave: (data: Omit<ClientBoat, 'id' | 'created_at' | 'updated_at'>) => void;
}

function BoatFormDialog({ open, onClose, clientId, boat, onSave }: BoatFormDialogProps) {
  const [formData, setFormData] = useState<Partial<ClientBoat>>(boat || {
    client_id: clientId,
    boat_model: 'Eagle 25TS',
    propulsion_type: 'Electric',
    status: 'ordered',
    project_category: 'new_build',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      client_id: clientId,
      boat_name: formData.boat_name,
      hull_identification_number: formData.hull_identification_number,
      boat_model: formData.boat_model as BoatModel || 'Eagle 25TS',
      propulsion_type: formData.propulsion_type as PropulsionType || 'Electric',
      configuration_id: formData.configuration_id,
      year_built: formData.year_built,
      delivery_date: formData.delivery_date,
      registration_number: formData.registration_number,
      home_port: formData.home_port,
      notes: formData.notes,
      status: formData.status || 'ordered',
      project_category: formData.project_category as ProjectCategory || 'new_build',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{boat ? 'Edit Boat' : 'Add New Boat'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label>Boat Name</Label>
              <Input
                value={formData.boat_name || ''}
                onChange={(e) => setFormData({ ...formData, boat_name: e.target.value })}
                placeholder="e.g., Sea Spirit"
              />
            </div>

            {/* Project Category - Primary Classification */}
            <div>
              <Label>Project Category *</Label>
              <Select
                value={formData.project_category || 'new_build'}
                onValueChange={(v) => setFormData({ ...formData, project_category: v as ProjectCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROJECT_CATEGORY_INFO) as ProjectCategory[]).map(cat => (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${PROJECT_CATEGORY_INFO[cat].bgColor}`} />
                        <span>{PROJECT_CATEGORY_INFO[cat].label_en}</span>
                        <span className="text-xs text-slate-400">- {PROJECT_CATEGORY_INFO[cat].description_en}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Boat Model *</Label>
                <Select
                  value={formData.boat_model || 'Eagle 25TS'}
                  onValueChange={(v) => setFormData({ ...formData, boat_model: v as BoatModel })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Eagle 525T">Eagle 525T</SelectItem>
                    <SelectItem value="Eagle 25TS">Eagle 25TS</SelectItem>
                    <SelectItem value="Eagle 28TS">Eagle 28TS</SelectItem>
                    <SelectItem value="Eagle 32TS">Eagle 32TS</SelectItem>
                    <SelectItem value="Eagle C550">Eagle C550</SelectItem>
                    <SelectItem value="Eagle C570">Eagle C570</SelectItem>
                    <SelectItem value="Eagle C720">Eagle C720</SelectItem>
                    <SelectItem value="Eagle C999">Eagle C999</SelectItem>
                    <SelectItem value="Eagle 28SG">Eagle 28SG</SelectItem>
                    <SelectItem value="Eagle Hybruut 28">Eagle Hybruut 28</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Propulsion *</Label>
                <Select
                  value={formData.propulsion_type || 'Electric'}
                  onValueChange={(v) => setFormData({ ...formData, propulsion_type: v as PropulsionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Electric">Electric</SelectItem>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="Outboard">Outboard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Hull Identification Number (HIN)</Label>
              <Input
                value={formData.hull_identification_number || ''}
                onChange={(e) => setFormData({ ...formData, hull_identification_number: e.target.value })}
                placeholder="e.g., NL-NAV12345A123"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Year Built</Label>
                <Input
                  type="number"
                  value={formData.year_built || ''}
                  onChange={(e) => setFormData({ ...formData, year_built: Number.parseInt(e.target.value) || undefined })}
                  placeholder={new Date().getFullYear().toString()}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status || 'ordered'}
                  onValueChange={(v) => setFormData({ ...formData, status: v as ClientBoat['status'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="in_production">In Production</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="warranty">Warranty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Registration Number</Label>
                <Input
                  value={formData.registration_number || ''}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Home Port</Label>
                <Input
                  value={formData.home_port || ''}
                  onChange={(e) => setFormData({ ...formData, home_port: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              {boat ? 'Update Boat' : 'Add Boat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
