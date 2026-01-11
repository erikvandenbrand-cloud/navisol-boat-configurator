'use client';

import { useState, useEffect } from 'react';
import {
  FileEdit,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  Package,
  DollarSign,
} from 'lucide-react';
import type { Project, ConfigurationItem, AmendmentType } from '@/domain/models';
import { generateUUID } from '@/domain/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AmendmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSubmit: (amendment: {
    type: AmendmentType;
    reason: string;
    changes: {
      itemsToAdd?: Omit<ConfigurationItem, 'id'>[];
      itemsToRemove?: string[];
      itemsToUpdate?: { id: string; updates: Partial<ConfigurationItem> }[];
    };
  }) => Promise<void>;
}

const AMENDMENT_TYPES: { value: AmendmentType; label: string; description: string }[] = [
  { value: 'EQUIPMENT_ADD', label: 'Add Equipment', description: 'Add new items to the configuration' },
  { value: 'EQUIPMENT_REMOVE', label: 'Remove Equipment', description: 'Remove items from the configuration' },
  { value: 'EQUIPMENT_CHANGE', label: 'Change Equipment', description: 'Modify existing equipment items' },
  { value: 'SCOPE_CHANGE', label: 'Scope Change', description: 'Change project scope or requirements' },
  { value: 'PRICE_ADJUSTMENT', label: 'Price Adjustment', description: 'Adjust pricing for items' },
  { value: 'SPECIFICATION_CHANGE', label: 'Specification Change', description: 'Change technical specifications' },
];

const CATEGORIES = [
  'Hull', 'Propulsion', 'Navigation', 'Safety', 'Comfort',
  'Electronics', 'Deck Equipment', 'Interior', 'Exterior', 'Other',
];

export function AmendmentDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
}: AmendmentDialogProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'remove' | 'update'>('add');
  const [amendmentType, setAmendmentType] = useState<AmendmentType>('EQUIPMENT_ADD');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Items to add
  const [newItems, setNewItems] = useState<Omit<ConfigurationItem, 'id'>[]>([]);

  // Items to remove
  const [itemsToRemove, setItemsToRemove] = useState<Set<string>>(new Set());

  // Items to update
  const [itemUpdates, setItemUpdates] = useState<Map<string, Partial<ConfigurationItem>>>(new Map());

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab('add');
      setAmendmentType('EQUIPMENT_ADD');
      setReason('');
      setNewItems([]);
      setItemsToRemove(new Set());
      setItemUpdates(new Map());
    }
  }, [open]);

  // Calculate price impact
  const priceImpact = (() => {
    let impact = 0;

    // Added items
    for (const item of newItems) {
      impact += item.quantity * item.unitPriceExclVat;
    }

    // Removed items
    if (project) {
      for (const itemId of itemsToRemove) {
        const item = project.configuration.items.find(i => i.id === itemId);
        if (item) {
          impact -= item.lineTotalExclVat;
        }
      }
    }

    // Updated items
    if (project) {
      for (const [itemId, updates] of itemUpdates) {
        const original = project.configuration.items.find(i => i.id === itemId);
        if (original) {
          const newQty = updates.quantity ?? original.quantity;
          const newPrice = updates.unitPriceExclVat ?? original.unitPriceExclVat;
          const newTotal = newQty * newPrice;
          impact += newTotal - original.lineTotalExclVat;
        }
      }
    }

    return impact;
  })();

  function handleAddNewItem() {
    setNewItems([
      ...newItems,
      {
        itemType: 'CUSTOM' as const,
        catalogItemId: undefined,
        catalogVersionId: undefined,
        isCustom: true,
        category: 'Other',
        name: '',
        description: '',
        quantity: 1,
        unit: 'pcs',
        unitPriceExclVat: 0,
        lineTotalExclVat: 0,
        isIncluded: true,
        ceRelevant: false,
        safetyCritical: false,
        sortOrder: 0,
      },
    ]);
  }

  function handleUpdateNewItem(index: number, field: string, value: unknown) {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate line total
    if (field === 'quantity' || field === 'unitPriceExclVat') {
      const qty = field === 'quantity' ? (value as number) : updated[index].quantity;
      const price = field === 'unitPriceExclVat' ? (value as number) : updated[index].unitPriceExclVat;
      updated[index].lineTotalExclVat = qty * price;
    }

    setNewItems(updated);
  }

  function handleRemoveNewItem(index: number) {
    setNewItems(newItems.filter((_, i) => i !== index));
  }

  function toggleRemoveItem(itemId: string) {
    const updated = new Set(itemsToRemove);
    if (updated.has(itemId)) {
      updated.delete(itemId);
    } else {
      updated.add(itemId);
    }
    setItemsToRemove(updated);
  }

  function handleItemUpdate(itemId: string, field: string, value: unknown) {
    const updated = new Map(itemUpdates);
    const existing = updated.get(itemId) || {};
    updated.set(itemId, { ...existing, [field]: value });
    setItemUpdates(updated);
  }

  async function handleSubmit() {
    if (!reason.trim()) {
      alert('Please provide a reason for the amendment');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        type: amendmentType,
        reason: reason.trim(),
        changes: {
          itemsToAdd: newItems.length > 0 ? newItems : undefined,
          itemsToRemove: itemsToRemove.size > 0 ? Array.from(itemsToRemove) : undefined,
          itemsToUpdate: itemUpdates.size > 0
            ? Array.from(itemUpdates.entries()).map(([id, updates]) => ({ id, updates }))
            : undefined,
        },
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit amendment:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }

  if (!project) return null;

  const hasChanges = newItems.length > 0 || itemsToRemove.size > 0 || itemUpdates.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-amber-600" />
            Request Amendment
          </DialogTitle>
          <DialogDescription>
            Request changes to the frozen configuration. Amendments require approval.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Configuration is Frozen</p>
              <p className="text-sm text-amber-700">
                This project is in {project.status.replace('_', ' ')} status.
                Changes must be submitted as amendments and require approval.
              </p>
            </div>
          </div>

          {/* Amendment Type & Reason */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amendment Type</Label>
              <Select value={amendmentType} onValueChange={(v) => setAmendmentType(v as AmendmentType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AMENDMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {AMENDMENT_TYPES.find(t => t.value === amendmentType)?.description}
              </p>
            </div>
            <div>
              <Label>Reason for Amendment *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why this amendment is needed..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Change Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'add' | 'remove' | 'update')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="add" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Items
                {newItems.length > 0 && (
                  <Badge variant="secondary">{newItems.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="remove" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Remove Items
                {itemsToRemove.size > 0 && (
                  <Badge variant="secondary">{itemsToRemove.size}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="update" className="gap-2">
                <FileEdit className="h-4 w-4" />
                Modify Items
                {itemUpdates.size > 0 && (
                  <Badge variant="secondary">{itemUpdates.size}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Add Items Tab */}
            <TabsContent value="add" className="mt-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-slate-600">Add new equipment items</p>
                <Button size="sm" variant="outline" onClick={handleAddNewItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {newItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500 border rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p>No items to add</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={handleAddNewItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Item
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.category}
                            onValueChange={(v) => handleUpdateNewItem(index, 'category', v)}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.name}
                            onChange={(e) => handleUpdateNewItem(index, 'name', e.target.value)}
                            placeholder="Item name"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleUpdateNewItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="h-8 w-16 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPriceExclVat}
                            onChange={(e) => handleUpdateNewItem(index, 'unitPriceExclVat', parseFloat(e.target.value) || 0)}
                            className="h-8 w-24 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.lineTotalExclVat)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600"
                            onClick={() => handleRemoveNewItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Remove Items Tab */}
            <TabsContent value="remove" className="mt-4">
              <p className="text-sm text-slate-600 mb-3">
                Select items to remove from the configuration
              </p>

              {project.configuration.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500 border rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p>No items in configuration</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.configuration.items.map((item) => (
                      <TableRow
                        key={item.id}
                        className={itemsToRemove.has(item.id) ? 'bg-red-50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={itemsToRemove.has(item.id)}
                            onCheckedChange={() => toggleRemoveItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className={itemsToRemove.has(item.id) ? 'line-through text-red-600' : ''}>
                          {item.name}
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {itemsToRemove.has(item.id) ? (
                            <span className="text-red-600">-{formatCurrency(item.lineTotalExclVat)}</span>
                          ) : (
                            formatCurrency(item.lineTotalExclVat)
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Update Items Tab */}
            <TabsContent value="update" className="mt-4">
              <p className="text-sm text-slate-600 mb-3">
                Modify quantities or prices of existing items
              </p>

              {project.configuration.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500 border rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p>No items in configuration</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Current Qty</TableHead>
                      <TableHead className="text-right">New Qty</TableHead>
                      <TableHead className="text-right">Current Price</TableHead>
                      <TableHead className="text-right">New Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.configuration.items.map((item) => {
                      const updates = itemUpdates.get(item.id);
                      const hasUpdates = updates && (updates.quantity !== undefined || updates.unitPriceExclVat !== undefined);

                      return (
                        <TableRow
                          key={item.id}
                          className={hasUpdates ? 'bg-amber-50' : ''}
                        >
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="text-right text-slate-500">{item.quantity}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              placeholder={String(item.quantity)}
                              value={updates?.quantity ?? ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : undefined;
                                handleItemUpdate(item.id, 'quantity', val);
                              }}
                              className="h-8 w-20 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right text-slate-500">
                            {formatCurrency(item.unitPriceExclVat)}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder={String(item.unitPriceExclVat)}
                              value={updates?.unitPriceExclVat ?? ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                handleItemUpdate(item.id, 'unitPriceExclVat', val);
                              }}
                              className="h-8 w-28 text-right"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>

          {/* Price Impact Summary */}
          {hasChanges && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-slate-600" />
                  <span className="font-medium">Price Impact</span>
                </div>
                <span className={`text-xl font-bold ${priceImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {priceImpact >= 0 ? '+' : ''}{formatCurrency(priceImpact)}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                This amendment will {priceImpact >= 0 ? 'increase' : 'decrease'} the total by {formatCurrency(Math.abs(priceImpact))}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !reason.trim() || !hasChanges}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Submit Amendment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
