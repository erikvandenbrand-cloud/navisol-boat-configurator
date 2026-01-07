'use client';

import { useState, useMemo } from 'react';
import {
  Plus, Search, Ship, Package, FileText, ChevronRight,
  ShoppingCart, Calendar, Check, X, AlertTriangle,
  Edit, Trash2, Copy, Eye, MoreHorizontal, Truck,
  ClipboardList, PackagePlus, DollarSign, Users, Zap, Battery
} from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { useStoreV2 } from '@/lib/store-v2';
import { formatEuroCurrency, generateId } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  ProductionOrder,
  ProductionOrderBoat,
  ProductionOrderPart,
  ProductionOrderStatus,
  BoatModel,
  PropulsionType,
  Article,
  Client
} from '@/lib/types';
import type { Model } from '@/lib/types-v2';

// Order status display info
const ORDER_STATUS_INFO: Record<ProductionOrderStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  confirmed: { label: 'Confirmed', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  in_production: { label: 'In Production', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const PROPULSION_TYPES: PropulsionType[] = ['Electric', 'Diesel', 'Hybrid', 'Outboard'];

// Propulsion icons
const PROPULSION_ICONS: Record<PropulsionType, { icon: React.ElementType; color: string }> = {
  Electric: { icon: Zap, color: 'text-emerald-500' },
  Hybrid: { icon: Battery, color: 'text-blue-500' },
  Diesel: { icon: Ship, color: 'text-slate-500' },
  Outboard: { icon: Ship, color: 'text-orange-500' },
};

export function ProductionOrders() {
  const { articles, clients, getClientById, configurations } = useNavisol();
  // Use v2.0 store for Eagle Boats models
  const { models } = useStoreV2();

  // Active Eagle Boats models
  const activeModels = useMemo(() => models.filter(m => m.is_active), [models]);

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<ProductionOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);

  // Helper functions for model data
  const getModelPrice = (modelName: string): number => {
    const model = models.find(m => m.name === modelName);
    return model?.base_price_excl_vat || 0;
  };

  const getModelPropulsionTypes = (modelName: string): PropulsionType[] => {
    const model = models.find(m => m.name === modelName);
    return model?.available_propulsion || ['Electric'];
  };

  const getModelDefaultPropulsion = (modelName: string): PropulsionType => {
    const model = models.find(m => m.name === modelName);
    return model?.default_propulsion || 'Electric';
  };

  // Generate order number
  const generateOrderNumber = () => {
    const year = new Date().getFullYear();
    const count = orders.filter(o => o.order_number.startsWith(`PO-${year}`)).length + 1;
    return `PO-${year}-${count.toString().padStart(4, '0')}`;
  };

  // Calculate parts requirements for an order (including adjustments)
  const calculatePartsRequirements = (boats: ProductionOrderBoat[]): ProductionOrderPart[] => {
    const partsMap = new Map<string, ProductionOrderPart>();

    boats.forEach(boat => {
      // Get standard parts for this model
      const compatibleParts = articles.filter(a =>
        a.boat_model_compat.includes(boat.boat_model) &&
        a.standard_or_optional === 'Standard'
      );

      // Get removed part IDs for this boat
      const removedPartIds = boat.parts_adjustments
        .filter(adj => adj.adjustment_type === 'remove')
        .map(adj => adj.article_id);

      // Add standard parts (excluding removed ones)
      compatibleParts
        .filter(article => !removedPartIds.includes(article.id))
        .forEach(article => {
          const existing = partsMap.get(article.id);
          if (existing) {
            existing.quantity_required += 1;
          } else {
            partsMap.set(article.id, {
              article_id: article.id,
              article_name: article.part_name,
              category: article.category,
              quantity_required: 1,
              quantity_in_stock: article.stock_qty,
              quantity_to_order: Math.max(0, 1 - article.stock_qty),
              quantity_reserved: 0,
              unit_price: article.sales_price_excl_vat,
              total_price: article.sales_price_excl_vat,
              status: article.stock_qty >= 1 ? 'available' : 'to_order',
            });
          }
        });

      // Add extra parts from adjustments
      boat.parts_adjustments
        .filter(adj => adj.adjustment_type === 'add')
        .forEach(adj => {
          const article = articles.find(a => a.id === adj.article_id);
          if (!article) return;

          const existing = partsMap.get(adj.article_id);
          if (existing) {
            existing.quantity_required += adj.quantity;
          } else {
            partsMap.set(adj.article_id, {
              article_id: adj.article_id,
              article_name: article.part_name,
              category: article.category,
              quantity_required: adj.quantity,
              quantity_in_stock: article.stock_qty,
              quantity_to_order: Math.max(0, adj.quantity - article.stock_qty),
              quantity_reserved: 0,
              unit_price: article.sales_price_excl_vat,
              total_price: article.sales_price_excl_vat * adj.quantity,
              status: article.stock_qty >= adj.quantity ? 'available' : 'to_order',
            });
          }
        });
    });

    // Update quantities and status
    return Array.from(partsMap.values()).map(part => {
      const toOrder = Math.max(0, part.quantity_required - part.quantity_in_stock);
      return {
        ...part,
        quantity_to_order: toOrder,
        total_price: part.unit_price * part.quantity_required,
        status: toOrder === 0 ? 'available' : toOrder < part.quantity_required ? 'partial' : 'to_order',
      };
    });
  };

  // Create new order
  const createOrder = (orderData: Omit<ProductionOrder, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'parts_requirements'>) => {
    const parts = calculatePartsRequirements(orderData.boats);
    const newOrder: ProductionOrder = {
      ...orderData,
      id: generateId(),
      order_number: generateOrderNumber(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      parts_requirements: parts,
    };
    setOrders(prev => [...prev, newOrder]);
    return newOrder;
  };

  // Update order
  const updateOrder = (id: string, updates: Partial<ProductionOrder>) => {
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, ...updates, updated_at: new Date().toISOString() } : o
    ));
  };

  // Delete order
  const deleteOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.client_id && getClientById(order.client_id)?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: orders.length,
    draft: orders.filter(o => o.status === 'draft').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    inProduction: orders.filter(o => o.status === 'in_production').length,
    totalBoats: orders.reduce((sum, o) => sum + o.boats.length, 0),
    totalValue: orders.reduce((sum, o) => sum + o.total_price_excl_vat, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production Orders</h1>
          <p className="text-slate-600">Create and manage orders for multiple boats</p>
        </div>

        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Production Order
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by order number or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(ORDER_STATUS_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${info.bgColor}`} />
                      {info.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                <div className="text-xs text-slate-600">Total Orders</div>
              </div>
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-600">{stats.draft}</div>
                <div className="text-xs text-slate-600">Drafts</div>
              </div>
              <Edit className="h-8 w-8 text-slate-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
                <div className="text-xs text-slate-600">Confirmed</div>
              </div>
              <Check className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.inProduction}</div>
                <div className="text-xs text-slate-600">In Production</div>
              </div>
              <Ship className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600">{stats.totalBoats}</div>
                <div className="text-xs text-slate-600">Total Boats</div>
              </div>
              <Ship className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900">{formatEuroCurrency(stats.totalValue)}</div>
                <div className="text-xs text-slate-600">Total Value</div>
              </div>
              <DollarSign className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">Boats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead className="text-center">Parts Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const client = order.client_id ? getClientById(order.client_id) : null;
                  const statusInfo = ORDER_STATUS_INFO[order.status];
                  const partsToOrder = order.parts_requirements.filter(p => p.status === 'to_order').length;

                  return (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell>
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client ? (
                          <div>
                            <div className="font-medium">{client.company_name || `${client.first_name} ${client.last_name}`}</div>
                            <div className="text-xs text-slate-500">{client.city}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">No client</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Ship className="h-4 w-4 text-emerald-500" />
                          <span className="font-medium">{order.boats.length}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap justify-center gap-1">
                          {order.boats.map((b, i) => {
                            const PropIcon = PROPULSION_ICONS[b.propulsion_type]?.icon || Ship;
                            const iconColor = PROPULSION_ICONS[b.propulsion_type]?.color || 'text-slate-400';
                            return (
                              <span key={b.id} className="flex items-center gap-0.5">
                                {b.boat_model.replace('Eagle ', '')}
                                <PropIcon className={`h-3 w-3 ${iconColor}`} />
                                {i < order.boats.length - 1 && ', '}
                              </span>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatEuroCurrency(order.total_price_excl_vat)}
                      </TableCell>
                      <TableCell>
                        {order.target_completion_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {new Date(order.target_completion_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {partsToOrder > 0 ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {partsToOrder} to order
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingOrder(order)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingOrder(order)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Order
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {order.status === 'draft' && (
                              <DropdownMenuItem
                                onClick={() => updateOrder(order.id, { status: 'confirmed', confirmed_at: new Date().toISOString() })}
                              >
                                <Check className="h-4 w-4 mr-2 text-blue-600" />
                                Confirm Order
                              </DropdownMenuItem>
                            )}
                            {order.status === 'confirmed' && (
                              <DropdownMenuItem
                                onClick={() => updateOrder(order.id, { status: 'in_production' })}
                              >
                                <Ship className="h-4 w-4 mr-2 text-orange-600" />
                                Start Production
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteOrder(order.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Ship className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No production orders yet</h3>
              <p className="text-slate-500 mb-4">Create your first production order to get started</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        clients={clients}
        articles={articles}
        boatModels={activeModels}
        getModelPrice={getModelPrice}
        getModelPropulsionTypes={getModelPropulsionTypes}
        getModelDefaultPropulsion={getModelDefaultPropulsion}
        onSubmit={(data) => {
          createOrder(data);
          setIsCreateOpen(false);
        }}
      />

      {/* View Order Dialog */}
      {viewingOrder && (
        <ViewOrderDialog
          order={viewingOrder}
          client={viewingOrder.client_id ? getClientById(viewingOrder.client_id) : undefined}
          onClose={() => setViewingOrder(null)}
        />
      )}
    </div>
  );
}

// Create Order Dialog Component
interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  articles: Article[];
  boatModels: Model[];
  getModelPrice: (name: string) => number;
  getModelPropulsionTypes: (name: string) => PropulsionType[];
  getModelDefaultPropulsion: (name: string) => PropulsionType;
  onSubmit: (data: Omit<ProductionOrder, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'parts_requirements'>) => void;
}

function CreateOrderDialog({ open, onOpenChange, clients, articles, boatModels, getModelPrice, getModelPropulsionTypes, getModelDefaultPropulsion, onSubmit }: CreateOrderDialogProps) {
  const [clientId, setClientId] = useState<string>('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [boats, setBoats] = useState<ProductionOrderBoat[]>([]);
  const [discount, setDiscount] = useState(0);

  // Get active boat model names
  const activeModelNames = useMemo(() =>
    boatModels.map(m => m.name),
    [boatModels]
  );

  // Get default model (first Eagle Boats model)
  const defaultModel = activeModelNames[0] || 'Eagle 25TS';

  // Add boat
  const addBoat = () => {
    setBoats([...boats, {
      id: generateId(),
      boat_model: defaultModel,
      propulsion_type: getModelDefaultPropulsion(defaultModel),
      status: 'pending',
      parts_adjustments: [],
    }]);
  };

  // Update boat
  const updateBoat = (index: number, updates: Partial<ProductionOrderBoat>) => {
    setBoats(boats.map((b, i) => i === index ? { ...b, ...updates } : b));
  };

  // Remove boat
  const removeBoat = (index: number) => {
    setBoats(boats.filter((_, i) => i !== index));
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    const boatsTotal = boats.reduce((sum, boat) => sum + getModelPrice(boat.boat_model), 0);
    const discountAmount = boatsTotal * (discount / 100);
    return boatsTotal - discountAmount;
  }, [boats, discount, getModelPrice]);

  // Handle submit
  const handleSubmit = () => {
    onSubmit({
      client_id: clientId || undefined,
      status: 'draft',
      target_completion_date: targetDate || undefined,
      boats,
      total_price_excl_vat: totalPrice,
      discount_percent: discount || undefined,
      notes: notes || undefined,
    });
    // Reset form
    setClientId('');
    setTargetDate('');
    setNotes('');
    setBoats([]);
    setDiscount(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-emerald-600" />
            Create Production Order
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Client & Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client (optional)</Label>
                <Select value={clientId || 'none'} onValueChange={(v) => setClientId(v === 'none' ? '' : v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name || `${c.first_name} ${c.last_name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Completion Date</Label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            {/* Boats */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Boats in Order</Label>
                <Button size="sm" onClick={addBoat}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Boat
                </Button>
              </div>

              {boats.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Ship className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No boats added yet</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={addBoat}>
                    Add First Boat
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {boats.map((boat, index) => (
                    <BoatCard
                      key={boat.id}
                      boat={boat}
                      index={index}
                      articles={articles}
                      boatModels={boatModels}
                      getModelPrice={getModelPrice}
                      getModelPropulsionTypes={getModelPropulsionTypes}
                      getModelDefaultPropulsion={getModelDefaultPropulsion}
                      onUpdate={(updates) => updateBoat(index, updates)}
                      onRemove={() => removeBoat(index)}
                    />
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number.parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div className="text-right">
                <Label>Total Price (excl. VAT)</Label>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {formatEuroCurrency(totalPrice)}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for this order..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={boats.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Boat Card Component with Parts Adjustments
interface BoatCardProps {
  boat: ProductionOrderBoat;
  index: number;
  articles: Article[];
  boatModels: Model[];
  getModelPrice: (name: string) => number;
  getModelPropulsionTypes: (name: string) => PropulsionType[];
  getModelDefaultPropulsion: (name: string) => PropulsionType;
  onUpdate: (updates: Partial<ProductionOrderBoat>) => void;
  onRemove: () => void;
}

function BoatCard({ boat, index, articles, boatModels, getModelPrice, getModelPropulsionTypes, getModelDefaultPropulsion, onUpdate, onRemove }: BoatCardProps) {
  const [showPartsPanel, setShowPartsPanel] = useState(false);
  const [searchPart, setSearchPart] = useState('');
  const [addPartQty, setAddPartQty] = useState(1);

  // Get compatible parts for this boat model
  const compatibleParts = useMemo(() => {
    return articles.filter(a =>
      a.boat_model_compat.includes(boat.boat_model) ||
      a.boat_model_compat.includes('Custom' as BoatModel)
    );
  }, [articles, boat.boat_model]);

  // Filter parts for search
  const filteredParts = useMemo(() => {
    if (!searchPart) return compatibleParts.slice(0, 20);
    const q = searchPart.toLowerCase();
    return compatibleParts.filter(p =>
      p.part_name.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [compatibleParts, searchPart]);

  // Add a part adjustment
  const addPart = (articleId: string, qty: number) => {
    const existing = boat.parts_adjustments.find(a => a.article_id === articleId && a.adjustment_type === 'add');
    if (existing) {
      // Update existing
      const updated = boat.parts_adjustments.map(a =>
        a.article_id === articleId && a.adjustment_type === 'add'
          ? { ...a, quantity: a.quantity + qty }
          : a
      );
      onUpdate({ parts_adjustments: updated });
    } else {
      onUpdate({
        parts_adjustments: [...boat.parts_adjustments, {
          article_id: articleId,
          adjustment_type: 'add',
          quantity: qty,
        }]
      });
    }
    setSearchPart('');
    setAddPartQty(1);
  };

  // Remove a standard part
  const removePart = (articleId: string) => {
    const existing = boat.parts_adjustments.find(a => a.article_id === articleId && a.adjustment_type === 'remove');
    if (!existing) {
      onUpdate({
        parts_adjustments: [...boat.parts_adjustments, {
          article_id: articleId,
          adjustment_type: 'remove',
          quantity: 1,
        }]
      });
    }
  };

  // Undo a removal
  const undoRemoval = (articleId: string) => {
    onUpdate({
      parts_adjustments: boat.parts_adjustments.filter(a =>
        !(a.article_id === articleId && a.adjustment_type === 'remove')
      )
    });
  };

  // Remove an added part
  const removeAddedPart = (articleId: string) => {
    onUpdate({
      parts_adjustments: boat.parts_adjustments.filter(a =>
        !(a.article_id === articleId && a.adjustment_type === 'add')
      )
    });
  };

  // Get standard parts for this model
  const standardParts = useMemo(() => {
    return articles.filter(a =>
      a.boat_model_compat.includes(boat.boat_model) &&
      a.standard_or_optional === 'Standard'
    );
  }, [articles, boat.boat_model]);

  // Count adjustments
  const addedCount = boat.parts_adjustments.filter(a => a.adjustment_type === 'add').length;
  const removedCount = boat.parts_adjustments.filter(a => a.adjustment_type === 'remove').length;

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Basic boat info */}
        <div className="flex items-start gap-4">
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Eagle Boats Model</Label>
              <Select
                value={boat.boat_model}
                onValueChange={(v) => {
                  onUpdate({
                    boat_model: v,
                    propulsion_type: getModelDefaultPropulsion(v),
                    parts_adjustments: []
                  });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {boatModels.filter(m => m.is_active).map(m => (
                    <SelectItem key={m.id} value={m.name}>
                      <div className="flex items-center gap-2">
                        <Ship className="h-3 w-3 text-emerald-500" />
                        {m.name}
                        {m.length_m && <span className="text-xs text-slate-400">({m.length_m}m)</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Propulsion</Label>
              <Select
                value={boat.propulsion_type}
                onValueChange={(v) => onUpdate({ propulsion_type: v as PropulsionType })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getModelPropulsionTypes(boat.boat_model).map(p => {
                    const PropIcon = PROPULSION_ICONS[p]?.icon || Ship;
                    const iconColor = PROPULSION_ICONS[p]?.color || 'text-slate-400';
                    return (
                      <SelectItem key={p} value={p}>
                        <div className="flex items-center gap-2">
                          <PropIcon className={`h-3 w-3 ${iconColor}`} />
                          {p}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Hull Number</Label>
              <Input
                value={boat.hull_number || ''}
                onChange={(e) => onUpdate({ hull_number: e.target.value })}
                placeholder="e.g., NAV-2024-001"
                className="mt-1"
              />
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold">
              {formatEuroCurrency(getModelPrice(boat.boat_model))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Parts adjustments toggle */}
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPartsPanel(!showPartsPanel)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Parts Adjustments
              {(addedCount > 0 || removedCount > 0) && (
                <span className="text-xs">
                  ({addedCount > 0 && <span className="text-green-600">+{addedCount}</span>}
                  {addedCount > 0 && removedCount > 0 && ', '}
                  {removedCount > 0 && <span className="text-red-600">-{removedCount}</span>})
                </span>
              )}
            </span>
            <ChevronRight className={`h-4 w-4 transition-transform ${showPartsPanel ? 'rotate-90' : ''}`} />
          </Button>

          {showPartsPanel && (
            <div className="mt-3 space-y-4">
              {/* Add parts section */}
              <div className="p-3 bg-green-50 rounded-lg">
                <Label className="text-xs text-green-800 font-medium flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  Add Extra Parts
                </Label>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search parts to add..."
                      value={searchPart}
                      onChange={(e) => setSearchPart(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                  <Input
                    type="number"
                    min="1"
                    value={addPartQty}
                    onChange={(e) => setAddPartQty(Math.max(1, Number.parseInt(e.target.value) || 1))}
                    className="w-16 h-9"
                  />
                </div>

                {searchPart && (
                  <div className="mt-2 max-h-32 overflow-y-auto border rounded-lg bg-white">
                    {filteredParts.length > 0 ? (
                      filteredParts.map(part => (
                        <div
                          key={part.id}
                          className="px-2 py-1.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-sm border-b last:border-b-0"
                          onClick={() => addPart(part.id, addPartQty)}
                        >
                          <div>
                            <span className="font-medium">{part.part_name}</span>
                            <span className="text-slate-500 ml-2">{part.brand}</span>
                          </div>
                          <span className="text-slate-600">{formatEuroCurrency(part.sales_price_excl_vat)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-2 py-3 text-center text-sm text-slate-500">
                        No parts found
                      </div>
                    )}
                  </div>
                )}

                {/* Added parts list */}
                {boat.parts_adjustments.filter(a => a.adjustment_type === 'add').length > 0 && (
                  <div className="mt-3 space-y-1">
                    <Label className="text-xs text-slate-600">Added parts:</Label>
                    {boat.parts_adjustments
                      .filter(a => a.adjustment_type === 'add')
                      .map(adj => {
                        const part = articles.find(a => a.id === adj.article_id);
                        return (
                          <div key={adj.article_id} className="flex items-center justify-between bg-white px-2 py-1 rounded text-sm">
                            <span>
                              <span className="font-medium">{part?.part_name}</span>
                              <span className="text-slate-500 ml-2">x{adj.quantity}</span>
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500"
                              onClick={() => removeAddedPart(adj.article_id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Remove standard parts section */}
              <div className="p-3 bg-red-50 rounded-lg">
                <Label className="text-xs text-red-800 font-medium flex items-center gap-1">
                  <Trash2 className="h-3 w-3" />
                  Remove Standard Parts
                </Label>
                <p className="text-xs text-red-600 mt-1 mb-2">
                  Click a standard part to exclude it from this boat
                </p>

                <div className="flex flex-wrap gap-1">
                  {standardParts.slice(0, 15).map(part => {
                    const isRemoved = boat.parts_adjustments.some(
                      a => a.article_id === part.id && a.adjustment_type === 'remove'
                    );
                    return (
                      <Badge
                        key={part.id}
                        variant="outline"
                        className={`cursor-pointer text-xs ${
                          isRemoved
                            ? 'bg-red-200 text-red-800 line-through'
                            : 'bg-white hover:bg-red-100'
                        }`}
                        onClick={() => isRemoved ? undoRemoval(part.id) : removePart(part.id)}
                      >
                        {part.part_name}
                        {isRemoved && <X className="h-3 w-3 ml-1" />}
                      </Badge>
                    );
                  })}
                  {standardParts.length > 15 && (
                    <span className="text-xs text-slate-500 self-center ml-1">
                      +{standardParts.length - 15} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// View Order Dialog Component
interface ViewOrderDialogProps {
  order: ProductionOrder;
  client?: Client;
  onClose: () => void;
}

function ViewOrderDialog({ order, client, onClose }: ViewOrderDialogProps) {
  const statusInfo = ORDER_STATUS_INFO[order.status];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Order {order.order_number}
            </DialogTitle>
            <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="boats">Boats ({order.boats.length})</TabsTrigger>
            <TabsTrigger value="parts">Parts ({order.parts_requirements.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Order Number</span>
                    <span className="font-medium">{order.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Created</span>
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  {order.confirmed_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Confirmed</span>
                      <span>{new Date(order.confirmed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {order.target_completion_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Target Completion</span>
                      <span>{new Date(order.target_completion_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Client</CardTitle>
                </CardHeader>
                <CardContent>
                  {client ? (
                    <div className="space-y-1">
                      <div className="font-medium">{client.company_name || `${client.first_name} ${client.last_name}`}</div>
                      <div className="text-sm text-slate-600">{client.email}</div>
                      <div className="text-sm text-slate-600">{client.city}, {client.country}</div>
                    </div>
                  ) : (
                    <span className="text-slate-400">No client assigned</span>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pricing Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-slate-600">{order.boats.length} boats</span>
                      {order.discount_percent && (
                        <span className="text-sm text-slate-500 ml-2">
                          ({order.discount_percent}% discount applied)
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatEuroCurrency(order.total_price_excl_vat)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="boats" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {order.boats.map((boat, index) => {
                  const addedParts = boat.parts_adjustments.filter(a => a.adjustment_type === 'add');
                  const removedParts = boat.parts_adjustments.filter(a => a.adjustment_type === 'remove');

                  return (
                    <Card key={boat.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <Ship className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <div className="font-medium">{boat.boat_model}</div>
                              <div className="text-sm text-slate-500">
                                {boat.propulsion_type} | {boat.hull_number || 'No hull number'}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {boat.status === 'pending' ? 'Pending' :
                             boat.status === 'in_production' ? 'In Production' : 'Completed'}
                          </Badge>
                        </div>

                        {/* Parts Adjustments Summary */}
                        {(addedParts.length > 0 || removedParts.length > 0) && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            {addedParts.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs font-medium text-green-700 mr-1">Added:</span>
                                {addedParts.map(adj => (
                                  <Badge key={adj.article_id} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    +{adj.quantity}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {removedParts.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs font-medium text-red-700 mr-1">Removed:</span>
                                {removedParts.map(adj => (
                                  <Badge key={adj.article_id} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 line-through">
                                    Part
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="parts" className="mt-4">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead className="text-center">Required</TableHead>
                    <TableHead className="text-center">In Stock</TableHead>
                    <TableHead className="text-center">To Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.parts_requirements.map((part) => (
                    <TableRow key={part.article_id}>
                      <TableCell>
                        <div className="font-medium">{part.article_name}</div>
                        <div className="text-xs text-slate-500">{part.category}</div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {part.quantity_required}
                      </TableCell>
                      <TableCell className="text-center">
                        {part.quantity_in_stock}
                      </TableCell>
                      <TableCell className="text-center">
                        {part.quantity_to_order > 0 ? (
                          <span className="text-red-600 font-medium">{part.quantity_to_order}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {part.status === 'available' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Available
                          </Badge>
                        )}
                        {part.status === 'partial' && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Partial
                          </Badge>
                        )}
                        {part.status === 'to_order' && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            To Order
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatEuroCurrency(part.total_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
