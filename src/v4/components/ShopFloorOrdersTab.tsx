/**
 * Shop Floor Orders Tab - v4 (Patch 7.1 - User Display + Supplier Source-of-Truth)
 * UI for managing shop floor order items (operational purchasing outside BOM).
 *
 * Can be used in two modes:
 * 1. Project-specific: Shows orders for a specific project
 * 2. General: Shows all orders (with filters)
 *
 * ============================================
 * GOVERNANCE: INTENT LOCK — OPERATIONAL LOG ONLY
 * ============================================
 * This is an operational log, NOT a procurement system.
 * - Status transitions are MANUAL ONLY (user clicks required)
 * - No automatic purchasing or workflow triggers
 * - No inventory management or stock tracking
 * - No BOM mutations or cost allocation
 * - Priority field is INERT — no sorting or escalation logic
 * - No analytics, KPIs, or dashboards
 *
 * PATCH 7 ADDITIONS:
 * - partName field (required, primary identifier)
 * - scopeType: 'project' | 'general'
 * - Supplier entity with permission-controlled assignment
 * - Photo attachment
 * - Filtering by scope, supplier, project
 *
 * PATCH 7.1 ADDITIONS:
 * - "Added by: <user name> · <date>" display
 * - Supplier name derived from supplierId (never independently edited)
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Check,
  Clock,
  Truck,
  PackageCheck,
  Search,
  Filter,
  ChevronDown,
  ArrowRight,
  MoreVertical,
  AlertCircle,
  RefreshCw,
  Undo2,
  ShoppingCart,
  CircleDot,
  Building2,
  Image as ImageIcon,
  X,
  User,
  Calendar,
  FolderOpen,
  Globe,
} from 'lucide-react';
import type {
  OrderItem,
  OrderItemStatus,
  OrderItemScopeType,
  CreateOrderItemInput,
  UpdateOrderItemInput,
  OrderItemFilters,
  Supplier,
} from '@/domain/models/order-item';
import { ORDER_ITEM_STATUS_LABELS, ORDER_ITEM_STATUS_COLORS, canEditSupplier, canMarkReceived } from '@/domain/models/order-item';
import { OrderItemService, type OrderItemAuditContext } from '@/domain/services/OrderItemService';
import { SupplierService } from '@/domain/services/SupplierService';
import { AuthService } from '@/domain/services/AuthService';
import { getDefaultAuditContext, useAuth } from '@/v4/state/useAuth';
import { ProjectRepository } from '@/data/repositories';
import type { Project, User as UserModel } from '@/domain/models';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ============================================
// TYPES
// ============================================

interface ShopFloorOrdersTabProps {
  /** If provided, shows only orders for this project. If null/undefined, shows general overview. */
  projectId?: string | null;
  /** Project title for display (optional) */
  projectTitle?: string;
  /** Callback when order count changes (for badge updates) */
  onCountChange?: (counts: Record<OrderItemStatus, number>) => void;
  /** Show compact mode (less padding, smaller text) */
  compact?: boolean;
}

interface OrderFormData {
  partName: string;
  description: string;
  quantity: string;
  unit: string;
  scopeType: OrderItemScopeType;
  projectId: string | null;
  supplierId: string | null;
  // Note: supplierName removed in Patch 7.1 - derived from supplierId
  photoUrl: string | null;
  note: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | null;
}

/** User cache for "Added by" display */
type UserCache = Map<string, { name: string; email: string } | null>;

// ============================================
// HELPERS
// ============================================

function getDefaultFormData(defaultProjectId?: string | null): OrderFormData {
  return {
    partName: '',
    description: '',
    quantity: '',
    unit: 'pcs',
    scopeType: defaultProjectId ? 'project' : 'general',
    projectId: defaultProjectId || null,
    supplierId: null,
    photoUrl: null,
    note: '',
    priority: 'NORMAL',
  };
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

function getStatusIcon(status: OrderItemStatus) {
  switch (status) {
    case 'NOT_ORDERED':
      return <CircleDot className="h-4 w-4" />;
    case 'ORDERED':
      return <Truck className="h-4 w-4" />;
    case 'RECEIVED':
      return <PackageCheck className="h-4 w-4" />;
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ShopFloorOrdersTab({
  projectId,
  projectTitle,
  onCountChange,
  compact = false,
}: ShopFloorOrdersTabProps) {
  const { user } = useAuth();
  const userRole = user?.role || 'PRODUCTION';
  const canManageSuppliers = canEditSupplier(userRole);
  const canReceive = canMarkReceived(userRole);

  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userCache, setUserCache] = useState<UserCache>(new Map());

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderItemStatus | 'ALL'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<OrderItemScopeType | 'ALL'>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrderItem | null>(null);
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');

  // Load suppliers and projects
  useEffect(() => {
    async function loadSuppliers() {
      const supplierList = await SupplierService.getAll();
      setSuppliers(supplierList);
    }
    loadSuppliers();
  }, []);

  useEffect(() => {
    async function loadProjects() {
      if (!projectId) {
        // Only load projects list when in general view
        const allProjects = await ProjectRepository.getAll();
        // Filter to active projects (not CLOSED or DELIVERED)
        setProjects(allProjects.filter((p: Project) => !['CLOSED', 'DELIVERED'].includes(p.status)));
      }
    }
    loadProjects();
  }, [projectId]);

  // Load user info for "Added by" display (Patch 7.1)
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

  // Load items
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      let data: OrderItem[];
      if (projectId) {
        data = await OrderItemService.getByProjectId(projectId);
      } else {
        // Apply filters
        const filters: OrderItemFilters = {
          status: statusFilter,
          scopeType: scopeFilter,
          supplierId: supplierFilter,
          projectId: projectFilter,
          searchQuery: searchQuery,
        };
        data = await OrderItemService.getFiltered(filters);
      }
      setItems(data);

      // Load user info for all items (Patch 7.1)
      const userIds = [...new Set(data.map((item) => item.createdByUserId).filter(Boolean))];
      if (userIds.length > 0) {
        loadUserInfo(userIds);
      }

      // Notify parent of counts
      if (onCountChange) {
        const counts = await (projectId
          ? OrderItemService.getProjectStatusCounts(projectId)
          : OrderItemService.getStatusCounts());
        onCountChange(counts);
      }
    } catch (error) {
      console.error('Failed to load order items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, statusFilter, scopeFilter, supplierFilter, projectFilter, searchQuery, onCountChange, loadUserInfo]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Filter items locally for project-specific view
  const filteredItems = useMemo(() => {
    if (!projectId) {
      // Already filtered from service
      return items;
    }

    let result = items;

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.partName?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          // supplierName is always derived from supplierId now, but for legacy, keep this
          item.supplierName?.toLowerCase().includes(query) ||
          item.note?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [items, statusFilter, searchQuery, projectId]);

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      NOT_ORDERED: items.filter((i) => i.status === 'NOT_ORDERED').length,
      ORDERED: items.filter((i) => i.status === 'ORDERED').length,
      RECEIVED: items.filter((i) => i.status === 'RECEIVED').length,
    };
  }, [items]);

  // ============================================
  // HANDLERS
  // ============================================

  async function handleCreate(data: OrderFormData) {
    const context: OrderItemAuditContext = {
      ...getDefaultAuditContext(),
      userRole,
    };
    const result = await OrderItemService.create(
      {
        scopeType: data.scopeType,
        projectId: data.scopeType === 'project' ? data.projectId : null,
        partName: data.partName.trim(),
        description: data.description?.trim() || null,
        quantity: data.quantity ? parseFloat(data.quantity) : null,
        unit: data.unit || null,
        supplierId: data.supplierId,
        // Note: supplierName not passed - derived by service (Patch 7.1)
        photoUrl: data.photoUrl,
        note: data.note?.trim() || null,
        priority: data.priority,
      },
      context
    );

    if (result.ok) {
      setShowAddDialog(false);
      loadItems();
    } else {
      alert(result.error);
    }
  }

  async function handleUpdate(id: string, data: OrderFormData) {
    const context: OrderItemAuditContext = {
      ...getDefaultAuditContext(),
      userRole,
    };
    const result = await OrderItemService.update(
      id,
      {
        partName: data.partName.trim(),
        description: data.description?.trim() || null,
        quantity: data.quantity ? parseFloat(data.quantity) : null,
        unit: data.unit || null,
        supplierId: data.supplierId,
        // Note: supplierName not passed - derived by service (Patch 7.1)
        photoUrl: data.photoUrl,
        note: data.note?.trim() || null,
        priority: data.priority,
      },
      context
    );

    if (result.ok) {
      setEditingItem(null);
      loadItems();
    } else {
      alert(result.error);
    }
  }

  async function handleMarkAsOrdered(id: string) {
    const context = getDefaultAuditContext();
    const result = await OrderItemService.markAsOrdered(id, context);
    if (result.ok) {
      loadItems();
    } else {
      alert(result.error);
    }
  }

  async function handleMarkAsReceived(id: string) {
    const context = { ...getDefaultAuditContext(), userRole };
    const result = await OrderItemService.markAsReceived(id, context);
    if (result.ok) {
      loadItems();
    } else {
      alert(result.error);
    }
  }

  async function handleRevertToNotOrdered(id: string) {
    const context = getDefaultAuditContext();
    const result = await OrderItemService.revertToNotOrdered(id, context);
    if (result.ok) {
      loadItems();
    } else {
      alert(result.error);
    }
  }

  async function handleDelete(id: string) {
    const context = getDefaultAuditContext();
    const result = await OrderItemService.delete(id, context);
    if (result.ok) {
      setDeleteTarget(null);
      loadItems();
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
    setScopeFilter('ALL');
    setSupplierFilter('ALL');
    setProjectFilter('ALL');
    setSearchQuery('');
  }

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    scopeFilter !== 'ALL' ||
    supplierFilter !== 'ALL' ||
    projectFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  // ============================================
  // RENDER
  // ============================================

  const title = projectId ? 'Project Orders' : 'Shop Floor Orders';
  const description = projectId
    ? `Order items for ${projectTitle || 'this project'} (outside BOM)`
    : 'All shop floor order items (outside BOM)';

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header Card */}
        <Card>
          <CardHeader className={`flex flex-row items-center justify-between ${compact ? 'py-3' : ''}`}>
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-teal-600" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size={compact ? 'sm' : 'default'}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'NOT_ORDERED' ? 'ALL' : 'NOT_ORDERED')}
                className={`p-3 rounded-lg border transition-colors ${
                  statusFilter === 'NOT_ORDERED'
                    ? 'border-slate-400 bg-slate-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-xs text-slate-500">Not Ordered</p>
                <p className="text-xl font-bold text-slate-700">{statusCounts.NOT_ORDERED}</p>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'ORDERED' ? 'ALL' : 'ORDERED')}
                className={`p-3 rounded-lg border transition-colors ${
                  statusFilter === 'ORDERED'
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-slate-200 hover:border-amber-200'
                }`}
              >
                <p className="text-xs text-amber-600">Ordered</p>
                <p className="text-xl font-bold text-amber-700">{statusCounts.ORDERED}</p>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'RECEIVED' ? 'ALL' : 'RECEIVED')}
                className={`p-3 rounded-lg border transition-colors ${
                  statusFilter === 'RECEIVED'
                    ? 'border-green-400 bg-green-50'
                    : 'border-slate-200 hover:border-green-200'
                }`}
              >
                <p className="text-xs text-green-600">Received</p>
                <p className="text-xl font-bold text-green-700">{statusCounts.RECEIVED}</p>
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search part name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Scope Filter (only in general view) */}
              {!projectId && (
                <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as OrderItemScopeType | 'ALL')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Scopes</SelectItem>
                    <SelectItem value="project">
                      <span className="flex items-center gap-2">
                        <FolderOpen className="h-3.5 w-3.5" />
                        Project
                      </span>
                    </SelectItem>
                    <SelectItem value="general">
                      <span className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        General
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Project Filter (only when scope includes project) */}
              {!projectId && (scopeFilter === 'ALL' || scopeFilter === 'project') && (
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Supplier Filter */}
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Suppliers</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Items List */}
            {isLoading ? (
              <div className="py-8 text-center text-slate-500">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                  <Package className="h-7 w-7 text-slate-400" />
                </div>
                <h4 className="text-base font-medium text-slate-900 mb-1">
                  {hasActiveFilters ? 'No matching items' : 'No order items'}
                </h4>
                <p className="text-sm text-slate-500 max-w-xs mb-5">
                  {hasActiveFilters
                    ? 'Try different search or filter.'
                    : 'Add items you need that are not in the BOM.'}
                </p>
                {!hasActiveFilters && (
                  <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <OrderItemRow
                    key={item.id}
                    item={item}
                    compact={compact}
                    showProject={!projectId}
                    projects={projects}
                    suppliers={suppliers}
                    canManageSuppliers={canManageSuppliers}
                    canReceive={canReceive}
                    onEdit={() => setEditingItem(item)}
                    onDelete={() => setDeleteTarget(item)}
                    onMarkAsOrdered={() => handleMarkAsOrdered(item.id)}
                    onMarkAsReceived={() => handleMarkAsReceived(item.id)}
                    onRevert={() => handleRevertToNotOrdered(item.id)}
                    userCache={userCache}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <OrderItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSave={handleCreate}
        title="Add Order Item"
        description={
          projectId
            ? 'Add an item to order for this project.'
            : 'Add a general order item or link to a project.'
        }
        defaultProjectId={projectId}
        projects={projects}
        suppliers={suppliers}
        canManageSuppliers={canManageSuppliers}
        onAddSupplier={() => setShowAddSupplierDialog(true)}
        lockScope={!!projectId}
      />

      {/* Edit Dialog */}
      {editingItem && (
        <OrderItemDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onSave={(data) => handleUpdate(editingItem.id, data)}
          initialData={editingItem}
          title="Edit Order Item"
          description="Update the order item details."
          defaultProjectId={projectId}
          projects={projects}
          suppliers={suppliers}
          canManageSuppliers={canManageSuppliers}
          onAddSupplier={() => setShowAddSupplierDialog(true)}
          lockScope
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.partName}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </TooltipProvider>
  );
}

// ============================================
// ORDER ITEM ROW
// ============================================

interface OrderItemRowProps {
  item: OrderItem;
  compact?: boolean;
  showProject?: boolean;
  projects: Project[];
  suppliers: Supplier[];
  canManageSuppliers: boolean;
  /** Whether user can mark items as received (ADMIN/OFFICE only) */
  canReceive: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMarkAsOrdered: () => void;
  onMarkAsReceived: () => void;
  onRevert: () => void;
  userCache: UserCache;
}

function OrderItemRow({
  item,
  compact,
  showProject,
  projects,
  suppliers,
  canManageSuppliers,
  canReceive,
  onEdit,
  onDelete,
  onMarkAsOrdered,
  onMarkAsReceived,
  onRevert,
  userCache,
}: OrderItemRowProps) {
  const statusColors = ORDER_ITEM_STATUS_COLORS[item.status];
  const project = projects.find((p) => p.id === item.projectId);

  // Supplier name is always derived from supplierId (Patch 7.1)
  const supplierName =
    item.supplierId && suppliers.length
      ? suppliers.find((s) => s.id === item.supplierId)?.name || null
      : null;

  // "Added by" user display (Patch 7.1)
  let addedByDisplay: string | null = null;
  if (item.createdByUserId) {
    const userInfo = userCache.get(item.createdByUserId);
    if (userInfo) {
      addedByDisplay = userInfo.name || userInfo.email || item.createdByUserId;
    } else if (userInfo === null) {
      addedByDisplay = item.createdByUserId;
    } else {
      addedByDisplay = null; // loading
    }
  }

  return (
    <div
      className={`flex items-start gap-4 p-3 border rounded-lg hover:bg-slate-50 transition-colors ${
        item.status === 'RECEIVED' ? 'opacity-70' : ''
      }`}
    >
      {/* Photo Thumbnail or Status Icon */}
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
          <span className={statusColors.text}>{getStatusIcon(item.status)}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`font-medium text-slate-900 ${compact ? 'text-sm' : ''}`}>
              {item.partName}
            </p>
            {item.description && (
              <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
              {/* Scope Badge */}
              {showProject && (
                <>
                  {item.scopeType === 'general' || !item.projectId ? (
                    <Badge variant="outline" className="text-[10px] py-0 border-slate-200 text-slate-500">
                      <Globe className="h-3 w-3 mr-1" />
                      General
                    </Badge>
                  ) : project ? (
                    <Badge variant="outline" className="text-[10px] py-0 border-teal-200 text-teal-600">
                      <FolderOpen className="h-3 w-3 mr-1" />
                      {project.title}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-0 border-slate-200 text-slate-500">
                      <FolderOpen className="h-3 w-3 mr-1" />
                      Project
                    </Badge>
                  )}
                </>
              )}

              {/* Quantity */}
              {item.quantity && (
                <span>
                  {item.quantity} {item.unit || 'pcs'}
                </span>
              )}

              {/* Supplier */}
              {supplierName && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {supplierName}
                  </span>
                </>
              )}

              {/* Priority (INERT METADATA — no color coding implying escalation) */}
              {item.priority && item.priority !== 'NORMAL' && (
                <>
                  <span>•</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 border-slate-200 text-slate-500"
                  >
                    {item.priority}
                  </Badge>
                </>
              )}
            </div>

            {/* Note */}
            {item.note && (
              <p className="text-xs text-slate-500 mt-1 italic truncate max-w-[400px]">{item.note}</p>
            )}

            {/* Meta Row: Created by, timestamps */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
              {/* Created by */}
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {addedByDisplay
                  ? <>Added by: {addedByDisplay} · {formatDateShort(item.createdAt)}</>
                  : <>Added {formatDateShort(item.createdAt)}</>
                }
              </span>
              {/* Ordered at */}
              {item.orderedAt && (
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  Ordered: {formatDate(item.orderedAt)}
                </span>
              )}
              {/* Received at */}
              {item.receivedAt && (
                <span className="flex items-center gap-1">
                  <PackageCheck className="h-3 w-3" />
                  Received: {formatDate(item.receivedAt)}
                </span>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <Badge className={`${statusColors.bg} ${statusColors.text} border-0 text-xs flex-shrink-0`}>
            {ORDER_ITEM_STATUS_LABELS[item.status]}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Primary Action Button */}
        {item.status === 'NOT_ORDERED' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                onClick={onMarkAsOrdered}
              >
                <Truck className="h-3.5 w-3.5" />
                Mark Ordered
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mark this item as ordered</TooltipContent>
          </Tooltip>
        )}
        {item.status === 'ORDERED' && canReceive && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 border-green-200 text-green-700 hover:bg-green-50"
                onClick={onMarkAsReceived}
              >
                <PackageCheck className="h-3.5 w-3.5" />
                Mark Received
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mark this item as received</TooltipContent>
          </Tooltip>
        )}

        {/* More Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {item.status !== 'RECEIVED' && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {item.status === 'ORDERED' && (
              <DropdownMenuItem onClick={onRevert}>
                <Undo2 className="h-4 w-4 mr-2" />
                Revert to Not Ordered
              </DropdownMenuItem>
            )}
            {item.status === 'NOT_ORDERED' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================
// ORDER ITEM DIALOG
// ============================================

interface OrderItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: OrderFormData) => void;
  initialData?: OrderItem;
  title: string;
  description: string;
  defaultProjectId?: string | null;
  projects: Project[];
  suppliers: Supplier[];
  canManageSuppliers: boolean;
  onAddSupplier: () => void;
  lockScope?: boolean;
}

function OrderItemDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  title,
  description,
  defaultProjectId,
  projects,
  suppliers,
  canManageSuppliers,
  onAddSupplier,
  lockScope,
}: OrderItemDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<OrderFormData>(() =>
    initialData
      ? {
          partName: initialData.partName || '',
          description: initialData.description || '',
          quantity: initialData.quantity?.toString() || '',
          unit: initialData.unit || 'pcs',
          scopeType: initialData.scopeType || (initialData.projectId ? 'project' : 'general'),
          projectId: initialData.projectId || null,
          supplierId: initialData.supplierId || null,
          photoUrl: initialData.photoUrl || null,
          note: initialData.note || '',
          priority: initialData.priority || 'NORMAL',
        }
      : getDefaultFormData(defaultProjectId)
  );

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          partName: initialData.partName || '',
          description: initialData.description || '',
          quantity: initialData.quantity?.toString() || '',
          unit: initialData.unit || 'pcs',
          scopeType: initialData.scopeType || (initialData.projectId ? 'project' : 'general'),
          projectId: initialData.projectId || null,
          supplierId: initialData.supplierId || null,
          photoUrl: initialData.photoUrl || null,
          note: initialData.note || '',
          priority: initialData.priority || 'NORMAL',
        });
      } else {
        setFormData(getDefaultFormData(defaultProjectId));
      }
    }
  }, [open, initialData, defaultProjectId]);

  function handleSubmit() {
    if (!formData.partName.trim()) {
      alert('Part name is required');
      return;
    }
    if (formData.scopeType === 'project' && !formData.projectId) {
      alert('Please select a project');
      return;
    }
    onSave(formData);
  }

  function handleSupplierChange(supplierId: string) {
    if (supplierId === 'none') {
      setFormData((prev) => ({ ...prev, supplierId: null }));
    } else {
      setFormData((prev) => ({
        ...prev,
        supplierId,
      }));
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to data URL
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, photoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setFormData((prev) => ({ ...prev, photoUrl: null }));
  }

  const isValid = formData.partName.trim().length > 0 &&
    (formData.scopeType !== 'project' || formData.projectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-teal-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Part Name */}
          <div className="space-y-2">
            <Label htmlFor="partName">Part Name *</Label>
            <Input
              id="partName"
              value={formData.partName}
              onChange={(e) => setFormData((prev) => ({ ...prev, partName: e.target.value }))}
              placeholder="e.g., Stainless steel bolt M8x50"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details..."
              rows={2}
            />
          </div>

          {/* Scope Toggle */}
          {!lockScope && (
            <div className="space-y-2">
              <Label>Scope</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.scopeType === 'project' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setFormData((prev) => ({ ...prev, scopeType: 'project' }))}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Project
                </Button>
                <Button
                  type="button"
                  variant={formData.scopeType === 'general' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setFormData((prev) => ({ ...prev, scopeType: 'general', projectId: null }))}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  General
                </Button>
              </div>
            </div>
          )}

          {/* Project Picker (when scope is project) */}
          {formData.scopeType === 'project' && !defaultProjectId && (
            <div className="space-y-2">
              <Label htmlFor="projectId">Project *</Label>
              <Select
                value={formData.projectId || ''}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, projectId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="e.g., 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select
                value={formData.unit}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, unit: v }))}
              >
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
            <Label htmlFor="supplier">
              Supplier
              {!canManageSuppliers && <span className="text-slate-400 ml-1">(read-only)</span>}
            </Label>
            <div className="flex gap-2">
              <Select
                value={formData.supplierId || 'none'}
                onValueChange={handleSupplierChange}
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

          {/* Photo */}
          <div className="space-y-2">
            <Label>Photo</Label>
            {formData.photoUrl ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={formData.photoUrl}
                  alt="Order item"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add Photo
                </Button>
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority || 'NORMAL'}
              onValueChange={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  priority: v as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
                }))
              }
            >
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
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            <Check className="h-4 w-4 mr-1" />
            {initialData ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// QUICK ADD COMPONENT (for embedding in other views)
// ============================================

interface QuickAddOrderItemProps {
  projectId?: string | null;
  onAdded?: () => void;
}

export function QuickAddOrderItem({ projectId, onAdded }: QuickAddOrderItemProps) {
  const { user } = useAuth();
  const userRole = user?.role || 'PRODUCTION';
  const [partName, setPartName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd() {
    if (!partName.trim()) return;

    setIsAdding(true);
    try {
      const context: OrderItemAuditContext = {
        ...getDefaultAuditContext(),
        userRole,
      };
      const result = await OrderItemService.create(
        {
          scopeType: projectId ? 'project' : 'general',
          projectId: projectId || null,
          partName: partName.trim(),
        },
        context
      );

      if (result.ok) {
        setPartName('');
        onAdded?.();
      } else {
        alert(result.error);
      }
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={partName}
        onChange={(e) => setPartName(e.target.value)}
        placeholder="Quick add: Part name"
        className="flex-1"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && partName.trim()) {
            handleAdd();
          }
        }}
      />
      <Button
        onClick={handleAdd}
        disabled={!partName.trim() || isAdding}
        size="sm"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add
      </Button>
    </div>
  );
}
