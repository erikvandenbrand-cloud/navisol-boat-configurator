/**
 * Shop Floor Orders Screen - v4 Portfolio Level (Patch 7.1)
 * Shows all shop floor order items with filters.
 *
 * ============================================
 * GOVERNANCE: INTENT LOCK — OPERATIONAL LOG ONLY
 * ============================================
 * This is an operational log, NOT a procurement system.
 * - All orders in one place (project-specific + general)
 * - Filter by status, project, supplier, creator
 * - Quick actions for status transitions (MANUAL ONLY)
 * - No analytics, KPIs, or dashboards
 * - No purchasing workflows or approvals
 * - Priority field is INERT — no sorting or escalation logic
 * - Must NOT expand into planning or purchasing dashboards
 *
 * PATCH 7.1 UPDATES:
 * - Uses partName instead of description
 * - Uses supplierId/supplierName instead of supplier
 * - Shows "Added by: <user name> · <date>"
 * - Includes Add Item button for full dialog
 * - Supplier filter support
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingCart,
  Package,
  Plus,
  Edit2,
  Trash2,
  Check,
  Truck,
  PackageCheck,
  Search,
  Filter,
  RefreshCw,
  Undo2,
  MoreVertical,
  CircleDot,
  Ship,
  Layers,
  Building2,
  User,
  Image as ImageIcon,
  FolderOpen,
  Globe,
} from 'lucide-react';
import type {
  OrderItem,
  OrderItemStatus,
  OrderItemFilters,
  Supplier,
} from '@/domain/models/order-item';
import type { Project } from '@/domain/models';
import { ORDER_ITEM_STATUS_LABELS, ORDER_ITEM_STATUS_COLORS, canEditSupplier, canMarkReceived } from '@/domain/models/order-item';
import { OrderItemService, type OrderItemAuditContext } from '@/domain/services/OrderItemService';
import { SupplierService } from '@/domain/services/SupplierService';
import { AuthService } from '@/domain/services/AuthService';
import { ProjectRepository } from '@/data/repositories';
import { getDefaultAuditContext, useAuth } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ============================================
// TYPES
// ============================================

interface ShopFloorOrdersScreenProps {
  onNavigateToProject?: (projectId: string) => void;
}

/** User cache for "Added by" display */
type UserCache = Map<string, { name: string; email: string } | null>;

// ============================================
// MAIN COMPONENT
// ============================================

export function ShopFloorOrdersScreen({ onNavigateToProject }: ShopFloorOrdersScreenProps) {
  const { user } = useAuth();
  const userRole = user?.role || 'PRODUCTION';
  const canManageSuppliers = canEditSupplier(userRole);
  const canReceive = canMarkReceived(userRole);

  const [activeTab, setActiveTab] = useState<'all' | 'general' | 'by-project'>('all');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [userCache, setUserCache] = useState<UserCache>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderItemStatus | 'ALL'>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');

  // Load user info for "Added by" display
  const loadUserInfo = useCallback(async (userIds: string[]) => {
    const newCache = new Map(userCache);
    const idsToFetch = userIds.filter((id) => !newCache.has(id));

    for (const userId of idsToFetch) {
      try {
        const userData = await AuthService.getUserById(userId);
        if (userData) {
          newCache.set(userId, { name: userData.name, email: userData.email });
        } else {
          newCache.set(userId, null);
        }
      } catch {
        newCache.set(userId, null);
      }
    }

    if (idsToFetch.length > 0) {
      setUserCache(newCache);
    }
  }, [userCache]);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [orderItems, allProjects, allSuppliers] = await Promise.all([
        OrderItemService.getAll(),
        ProjectRepository.getAll(),
        SupplierService.getAll(),
      ]);
      setItems(orderItems);
      setSuppliers(allSuppliers);

      // Load user info for all items
      const userIds = [...new Set(orderItems.map((item) => item.createdByUserId).filter(Boolean))];
      if (userIds.length > 0) {
        loadUserInfo(userIds);
      }

      // Only show projects in production or with orders
      const projectIds = new Set(orderItems.filter(i => i.projectId).map(i => i.projectId));
      const relevantProjects = allProjects.filter(
        p => ['IN_PRODUCTION', 'ORDER_CONFIRMED'].includes(p.status) || projectIds.has(p.id)
      );
      setProjects(relevantProjects);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadUserInfo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;

    // Tab filter
    if (activeTab === 'general') {
      result = result.filter(item => item.scopeType === 'general' || !item.projectId);
    } else if (activeTab === 'by-project' && projectFilter !== 'ALL') {
      result = result.filter(item => item.projectId === projectFilter);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(item => item.status === statusFilter);
    }

    // Supplier filter
    if (supplierFilter !== 'ALL') {
      result = result.filter(item => item.supplierId === supplierFilter);
    }

    // Search filter (uses partName now)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.partName?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.supplierName?.toLowerCase().includes(query) ||
          item.note?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [items, activeTab, statusFilter, projectFilter, supplierFilter, searchQuery]);

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      NOT_ORDERED: items.filter(i => i.status === 'NOT_ORDERED').length,
      ORDERED: items.filter(i => i.status === 'ORDERED').length,
      RECEIVED: items.filter(i => i.status === 'RECEIVED').length,
    };
  }, [items]);

  // General vs project counts
  const generalCount = items.filter(i => i.scopeType === 'general' || !i.projectId).length;
  const projectCount = items.filter(i => i.scopeType === 'project' && i.projectId).length;

  // ============================================
  // HANDLERS
  // ============================================

  async function handleMarkAsOrdered(id: string) {
    const context = getDefaultAuditContext();
    const result = await OrderItemService.markAsOrdered(id, context);
    if (result.ok) {
      loadData();
    } else {
      alert(result.error);
    }
  }

  async function handleMarkAsReceived(id: string) {
    const context = { ...getDefaultAuditContext(), userRole };
    const result = await OrderItemService.markAsReceived(id, context);
    if (result.ok) {
      loadData();
    } else {
      alert(result.error);
    }
  }

  async function handleRevert(id: string) {
    const context = getDefaultAuditContext();
    const result = await OrderItemService.revertToNotOrdered(id, context);
    if (result.ok) {
      loadData();
    } else {
      alert(result.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this order item?')) return;
    const context = getDefaultAuditContext();
    const result = await OrderItemService.delete(id, context);
    if (result.ok) {
      loadData();
    } else {
      alert(result.error);
    }
  }

  async function handleAddSupplier() {
    if (!newSupplierName.trim()) return;

    const context = getDefaultAuditContext();
    const result = await SupplierService.create(
      { name: newSupplierName.trim() },
      context,
      userRole
    );

    if (result.ok) {
      setNewSupplierName('');
      setShowAddSupplierDialog(false);
      // Reload suppliers
      const supplierList = await SupplierService.getAll();
      setSuppliers(supplierList);
    } else {
      alert(result.error);
    }
  }

  function clearFilters() {
    setStatusFilter('ALL');
    setProjectFilter('ALL');
    setSupplierFilter('ALL');
    setSearchQuery('');
  }

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    projectFilter !== 'ALL' ||
    supplierFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ShoppingCart className="h-7 w-7 text-teal-600" />
            Shop Floor Orders
          </h1>
          <p className="text-slate-600 mt-1">
            Operational purchasing for parts, tools, and materials outside the BOM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button onClick={loadData} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-slate-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Items</p>
                <p className="text-2xl font-bold text-slate-900">{items.length}</p>
              </div>
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span>{generalCount} general</span>
              <span>•</span>
              <span>{projectCount} project-specific</span>
            </div>
          </CardContent>
        </Card>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'NOT_ORDERED' ? 'ALL' : 'NOT_ORDERED')}
          className={`text-left transition-colors rounded-lg ${
            statusFilter === 'NOT_ORDERED' ? 'ring-2 ring-slate-400' : ''
          }`}
        >
          <Card className="h-full">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Not Ordered</p>
                  <p className="text-2xl font-bold text-slate-700">{statusCounts.NOT_ORDERED}</p>
                </div>
                <CircleDot className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-2 text-xs text-slate-500">Needs attention</p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'ORDERED' ? 'ALL' : 'ORDERED')}
          className={`text-left transition-colors rounded-lg ${
            statusFilter === 'ORDERED' ? 'ring-2 ring-amber-400' : ''
          }`}
        >
          <Card className="h-full bg-amber-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600">Ordered</p>
                  <p className="text-2xl font-bold text-amber-700">{statusCounts.ORDERED}</p>
                </div>
                <Truck className="h-8 w-8 text-amber-400" />
              </div>
              <p className="mt-2 text-xs text-amber-600">Awaiting delivery</p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'RECEIVED' ? 'ALL' : 'RECEIVED')}
          className={`text-left transition-colors rounded-lg ${
            statusFilter === 'RECEIVED' ? 'ring-2 ring-green-400' : ''
          }`}
        >
          <Card className="h-full bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Received</p>
                  <p className="text-2xl font-bold text-green-700">{statusCounts.RECEIVED}</p>
                </div>
                <PackageCheck className="h-8 w-8 text-green-400" />
              </div>
              <p className="mt-2 text-xs text-green-600">Completed</p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Tabs: All / General / By Project */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">
              All Orders
              <Badge variant="secondary" className="ml-2">{items.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="general">
              General
              <Badge variant="secondary" className="ml-2">{generalCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="by-project">
              By Project
              <Badge variant="secondary" className="ml-2">{projectCount}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Project filter (only for by-project tab) */}
            {activeTab === 'by-project' && (
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.projectNumber} - {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Supplier filter */}
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Suppliers</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* All Orders */}
        <TabsContent value="all">
          <OrderItemsList
            items={filteredItems}
            projects={projects}
            suppliers={suppliers}
            userCache={userCache}
            isLoading={isLoading}
            canReceive={canReceive}
            onMarkAsOrdered={handleMarkAsOrdered}
            onMarkAsReceived={handleMarkAsReceived}
            onRevert={handleRevert}
            onDelete={handleDelete}
            onNavigateToProject={onNavigateToProject}
            showProject
          />
        </TabsContent>

        {/* General Orders */}
        <TabsContent value="general">
          <OrderItemsList
            items={filteredItems}
            projects={projects}
            suppliers={suppliers}
            userCache={userCache}
            isLoading={isLoading}
            canReceive={canReceive}
            onMarkAsOrdered={handleMarkAsOrdered}
            onMarkAsReceived={handleMarkAsReceived}
            onRevert={handleRevert}
            onDelete={handleDelete}
            onNavigateToProject={onNavigateToProject}
            showProject={false}
          />
        </TabsContent>

        {/* By Project */}
        <TabsContent value="by-project">
          <OrderItemsList
            items={filteredItems}
            projects={projects}
            suppliers={suppliers}
            userCache={userCache}
            isLoading={isLoading}
            canReceive={canReceive}
            onMarkAsOrdered={handleMarkAsOrdered}
            onMarkAsReceived={handleMarkAsReceived}
            onRevert={handleRevert}
            onDelete={handleDelete}
            onNavigateToProject={onNavigateToProject}
            showProject
          />
        </TabsContent>
      </Tabs>

      {/* Add Item Dialog */}
      <AddOrderItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projects={projects}
        suppliers={suppliers}
        canManageSuppliers={canManageSuppliers}
        onAddSupplier={() => setShowAddSupplierDialog(true)}
        onSaved={loadData}
        userRole={userRole}
      />

      {/* Add Supplier Dialog */}
      <Dialog open={showAddSupplierDialog} onOpenChange={setShowAddSupplierDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-600" />
              Add Supplier
            </DialogTitle>
            <DialogDescription>Create a new supplier for order items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier Name *</Label>
              <Input
                id="supplierName"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="e.g., Torqeedo"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSupplierDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSupplier} disabled={!newSupplierName.trim()}>
              <Check className="h-4 w-4 mr-1" />
              Add Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// ADD ORDER ITEM DIALOG
// ============================================

interface AddOrderItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  suppliers: Supplier[];
  canManageSuppliers: boolean;
  onAddSupplier: () => void;
  onSaved: () => void;
  userRole: string;
}

function AddOrderItemDialog({
  open,
  onOpenChange,
  projects,
  suppliers,
  canManageSuppliers,
  onAddSupplier,
  onSaved,
  userRole,
}: AddOrderItemDialogProps) {
  const [partName, setPartName] = useState('');
  const [description, setDescription] = useState('');
  const [scopeType, setScopeType] = useState<'project' | 'general'>('general');
  const [projectId, setProjectId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [supplierId, setSupplierId] = useState<string>('none');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPartName('');
      setDescription('');
      setScopeType('general');
      setProjectId('');
      setQuantity('');
      setUnit('pcs');
      setSupplierId('none');
      setNote('');
      setPriority('NORMAL');
    }
  }, [open]);

  async function handleSave() {
    if (!partName.trim()) {
      alert('Part name is required');
      return;
    }
    if (scopeType === 'project' && !projectId) {
      alert('Please select a project');
      return;
    }

    setIsSaving(true);
    try {
      const context: OrderItemAuditContext = {
        ...getDefaultAuditContext(),
        userRole,
      };
      const result = await OrderItemService.create(
        {
          partName: partName.trim(),
          description: description.trim() || null,
          scopeType,
          projectId: scopeType === 'project' ? projectId : null,
          quantity: quantity ? parseFloat(quantity) : null,
          unit: unit || null,
          supplierId: supplierId !== 'none' ? supplierId : null,
          note: note.trim() || null,
          priority,
        },
        context
      );

      if (result.ok) {
        onOpenChange(false);
        onSaved();
      } else {
        alert(result.error);
      }
    } finally {
      setIsSaving(false);
    }
  }

  const isValid = partName.trim().length > 0 && (scopeType !== 'project' || projectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-teal-600" />
            Add Order Item
          </DialogTitle>
          <DialogDescription>
            Add a new item to the shop floor order list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Part Name */}
          <div className="space-y-2">
            <Label htmlFor="partName">Part Name *</Label>
            <Input
              id="partName"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="e.g., Stainless steel bolt M8x50"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              rows={2}
            />
          </div>

          {/* Scope Toggle */}
          <div className="space-y-2">
            <Label>Scope</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={scopeType === 'project' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setScopeType('project')}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Project
              </Button>
              <Button
                type="button"
                variant={scopeType === 'general' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => { setScopeType('general'); setProjectId(''); }}
              >
                <Globe className="h-4 w-4 mr-2" />
                General
              </Button>
            </div>
          </div>

          {/* Project Picker */}
          {scopeType === 'project' && (
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.projectNumber} - {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 10"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">pcs</SelectItem>
                  <SelectItem value="set">set</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="box">box</SelectItem>
                  <SelectItem value="roll">roll</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label>
              Supplier
              {!canManageSuppliers && <span className="text-slate-400 ml-1">(read-only)</span>}
            </Label>
            <div className="flex gap-2">
              <Select
                value={supplierId}
                onValueChange={setSupplierId}
                disabled={!canManageSuppliers}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManageSuppliers && (
                <Button type="button" variant="outline" size="icon" onClick={onAddSupplier}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            <Check className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// ORDER ITEMS LIST COMPONENT
// ============================================

interface OrderItemsListProps {
  items: OrderItem[];
  projects: Project[];
  suppliers: Supplier[];
  userCache: UserCache;
  isLoading: boolean;
  /** Whether user can mark items as received (ADMIN/OFFICE only) */
  canReceive: boolean;
  onMarkAsOrdered: (id: string) => void;
  onMarkAsReceived: (id: string) => void;
  onRevert: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigateToProject?: (projectId: string) => void;
  showProject: boolean;
}

function OrderItemsList({
  items,
  projects,
  suppliers,
  userCache,
  isLoading,
  canReceive,
  onMarkAsOrdered,
  onMarkAsReceived,
  onRevert,
  onDelete,
  onNavigateToProject,
  showProject,
}: OrderItemsListProps) {
  function getProjectInfo(projectId: string | null | undefined) {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project ? { id: project.id, number: project.projectNumber, title: project.title } : null;
  }

  function getSupplierName(supplierId: string | null | undefined): string | null {
    if (!supplierId) return null;
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || null;
  }

  function getUserDisplay(userId: string | null | undefined): string | null {
    if (!userId) return null;
    const userInfo = userCache.get(userId);
    if (userInfo) {
      return userInfo.name || userInfo.email || userId;
    } else if (userInfo === null) {
      return userId;
    }
    return null;
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDateShort(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  }

  if (isLoading) {
    return <div className="py-8 text-center text-slate-500">Loading...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
          <Package className="h-7 w-7 text-slate-400" />
        </div>
        <h4 className="text-base font-medium text-slate-900 mb-1">No order items</h4>
        <p className="text-sm text-slate-500 max-w-xs">
          Add items you need using the "Add Item" button above.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {items.map(item => {
            const statusColors = ORDER_ITEM_STATUS_COLORS[item.status];
            const projectInfo = getProjectInfo(item.projectId);
            const supplierName = getSupplierName(item.supplierId) || item.supplierName;
            const addedByUser = getUserDisplay(item.createdByUserId);

            return (
              <div
                key={item.id}
                className={`flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors ${
                  item.status === 'RECEIVED' ? 'opacity-60' : ''
                }`}
              >
                {/* Photo or Status Icon */}
                {item.photoUrl ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 transition-colors flex-shrink-0"
                      >
                        <img
                          src={item.photoUrl}
                          alt={item.partName}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0">
                      <img
                        src={item.photoUrl}
                        alt={item.partName}
                        className="w-full h-auto rounded-lg"
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className={`p-2 rounded-lg ${statusColors.bg} flex-shrink-0`}>
                    <span className={statusColors.text}>
                      {item.status === 'NOT_ORDERED' && <CircleDot className="h-4 w-4" />}
                      {item.status === 'ORDERED' && <Truck className="h-4 w-4" />}
                      {item.status === 'RECEIVED' && <PackageCheck className="h-4 w-4" />}
                    </span>
                  </div>
                )}

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{item.partName}</p>
                      {item.description && (
                        <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 flex-wrap">
                        {/* Scope badge */}
                        {showProject && projectInfo && (
                          <button
                            type="button"
                            onClick={() => onNavigateToProject?.(projectInfo.id)}
                            className="flex items-center gap-1 text-teal-600 hover:text-teal-700 hover:underline"
                          >
                            <Ship className="h-3 w-3" />
                            {projectInfo.number}
                          </button>
                        )}
                        {showProject && !projectInfo && (
                          <Badge variant="outline" className="text-[10px] py-0 border-slate-200">
                            <Globe className="h-3 w-3 mr-1" />
                            General
                          </Badge>
                        )}
                        {item.quantity && (
                          <span>
                            {item.quantity} {item.unit || 'pcs'}
                          </span>
                        )}
                        {supplierName && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {supplierName}
                            </span>
                          </>
                        )}
                        {/* Priority (INERT METADATA) */}
                        {item.priority && item.priority !== 'NORMAL' && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 border-slate-200 text-slate-500"
                          >
                            {item.priority}
                          </Badge>
                        )}
                      </div>
                      {item.note && (
                        <p className="text-xs text-slate-500 mt-1 italic line-clamp-1">{item.note}</p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <Badge className={`${statusColors.bg} ${statusColors.text} border-0 text-xs flex-shrink-0`}>
                      {ORDER_ITEM_STATUS_LABELS[item.status]}
                    </Badge>
                  </div>

                  {/* Timestamps with "Added by" */}
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {addedByUser
                        ? <>Added by: {addedByUser} · {formatDateShort(item.createdAt)}</>
                        : <>Added {formatDateShort(item.createdAt)}</>
                      }
                    </span>
                    {item.orderedAt && <span>Ordered: {formatDate(item.orderedAt)}</span>}
                    {item.receivedAt && <span>Received: {formatDate(item.receivedAt)}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.status === 'NOT_ORDERED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() => onMarkAsOrdered(item.id)}
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Mark Ordered
                    </Button>
                  )}
                  {item.status === 'ORDERED' && (
                    <>
                      {canReceive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() => onMarkAsReceived(item.id)}
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          Mark Received
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onRevert(item.id)}
                        title="Revert to Not Ordered"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {item.status === 'NOT_ORDERED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDelete(item.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
