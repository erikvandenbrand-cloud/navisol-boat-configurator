'use client';

import { useState, useMemo } from 'react';
import {
  ClipboardList, Plus, Search, Edit, Trash2, Copy, Eye, ChevronDown, ChevronRight,
  Ship, Wrench, Shield, FileCheck, Star, Save, X, GripVertical, Camera,
  CheckCircle2, AlertTriangle, Settings
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/lib/auth-store';
import { useProcedures } from '@/lib/procedures-store';
import { generateId } from '@/lib/formatting';
import {
  type ChecklistTemplate,
  type ChecklistTemplateItem,
  type BoatModel,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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

const BOAT_MODELS: (BoatModel | 'all')[] = ['all', 'Eagle 525T', 'Eagle 25TS', 'Eagle 28TS', 'Eagle 32TS', 'Eagle C550', 'Eagle C570', 'Eagle C720', 'Eagle C999', 'Eagle 28SG', 'Eagle Hybruut 28', 'Custom'];

const CHECKLIST_TYPES: { value: ChecklistTemplate['checklist_type']; label: string }[] = [
  { value: 'vessel_completion', label: 'Vessel Completion' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'quality_check', label: 'Quality Check' },
  { value: 'safety_inspection', label: 'Safety Inspection' },
];

const CATEGORY_OPTIONS = [
  { value: 'safety', label: 'Safety', color: 'bg-red-100 text-red-700' },
  { value: 'documentation', label: 'Documentation', color: 'bg-blue-100 text-blue-700' },
  { value: 'systems', label: 'Systems', color: 'bg-purple-100 text-purple-700' },
  { value: 'quality', label: 'Quality', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'handover', label: 'Handover', color: 'bg-green-100 text-green-700' },
  { value: 'intake', label: 'Intake', color: 'bg-slate-100 text-slate-700' },
  { value: 'service', label: 'Service', color: 'bg-orange-100 text-orange-700' },
  { value: 'testing', label: 'Testing', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'completion', label: 'Completion', color: 'bg-emerald-100 text-emerald-700' },
];

type NewTemplateItem = Omit<ChecklistTemplateItem, 'id'> & { id?: string };

// Sortable Item Component for drag-and-drop
interface SortableItemProps {
  item: NewTemplateItem;
  index: number;
  onUpdate: (index: number, updates: Partial<NewTemplateItem>) => void;
  onRemove: (index: number) => void;
}

function SortableChecklistItem({ item, index, onUpdate, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id || `item-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 bg-slate-50 ${isDragging ? 'shadow-lg ring-2 ring-teal-500' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex flex-col items-center gap-1 pt-2 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-5 w-5 text-slate-400 hover:text-slate-600" />
          <span className="text-xs font-medium text-slate-400">{index + 1}</span>
        </div>

        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8">
              <Input
                value={item.description}
                onChange={(e) => onUpdate(index, { description: e.target.value })}
                placeholder="Item description..."
              />
            </div>
            <div className="col-span-4">
              <Select
                value={item.category}
                onValueChange={(v) => onUpdate(index, { category: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={item.required}
                onCheckedChange={(v) => onUpdate(index, { required: !!v })}
              />
              <span className="text-sm">Required</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={item.photo_required}
                onCheckedChange={(v) => onUpdate(index, { photo_required: !!v, photo_count: v ? 1 : 0 })}
              />
              <span className="text-sm">Photo Required</span>
            </label>

            {item.photo_required && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Count:</span>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={item.photo_count || 1}
                  onChange={(e) => onUpdate(index, { photo_count: parseInt(e.target.value) || 1 })}
                  className="w-16 h-8"
                />
              </div>
            )}
          </div>

          <Input
            value={item.instructions || ''}
            onChange={(e) => onUpdate(index, { instructions: e.target.value })}
            placeholder="Optional instructions for this item..."
            className="text-sm"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700"
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TemplateManagement() {
  const { currentUser, hasPermission } = useAuth();
  const {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  } = useProcedures();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ChecklistTemplate['checklist_type'] | 'all'>('all');
  const [filterModel, setFilterModel] = useState<BoatModel | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ChecklistTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [templateToDuplicate, setTemplateToDuplicate] = useState<ChecklistTemplate | null>(null);

  // Editor state
  const [editorForm, setEditorForm] = useState<{
    name: string;
    description: string;
    boat_model: BoatModel | 'all';
    checklist_type: ChecklistTemplate['checklist_type'];
    is_active: boolean;
    items: NewTemplateItem[];
  }>({
    name: '',
    description: '',
    boat_model: 'all',
    checklist_type: 'vessel_completion',
    is_active: true,
    items: [],
  });

  const canManage = hasPermission('createCEDocs');

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || t.checklist_type === filterType;
      const matchesModel = filterModel === 'all' || t.boat_model === filterModel || t.boat_model === 'all';
      return matchesSearch && matchesType && matchesModel;
    });
  }, [templates, searchQuery, filterType, filterModel]);

  // Group templates by type
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, ChecklistTemplate[]> = {};
    CHECKLIST_TYPES.forEach(type => {
      groups[type.value] = filteredTemplates.filter(t => t.checklist_type === type.value);
    });
    return groups;
  }, [filteredTemplates]);

  const openEditor = (template?: ChecklistTemplate) => {
    if (template) {
      setEditorForm({
        name: template.name,
        description: template.description || '',
        boat_model: template.boat_model,
        checklist_type: template.checklist_type,
        is_active: template.is_active,
        // Ensure all items have IDs for drag-and-drop
        items: template.items.map(item => ({ ...item, id: item.id || generateId() })),
      });
      setEditingTemplate(template);
    } else {
      setEditorForm({
        name: '',
        description: '',
        boat_model: 'all',
        checklist_type: 'vessel_completion',
        is_active: true,
        items: [],
      });
      setEditingTemplate(null);
    }
    setShowEditor(true);
  };

  const addItem = () => {
    const newItem: NewTemplateItem = {
      id: generateId(),
      category: 'safety',
      description: '',
      required: true,
      order: editorForm.items.length + 1,
      photo_required: false,
      photo_count: 0,
      instructions: '',
    };
    setEditorForm(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const updateItem = (index: number, updates: Partial<NewTemplateItem>) => {
    setEditorForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, ...updates } : item),
    }));
  };

  const removeItem = (index: number) => {
    setEditorForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 })),
    }));
  };

  // Drag-and-drop reordering logic
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const oldIndex = editorForm.items.findIndex(item => item.id === activeId);
    const newIndex = editorForm.items.findIndex(item => item.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    setEditorForm(prev => ({
      ...prev,
      items: arrayMove(prev.items, oldIndex, newIndex).map((item, i) => ({ ...item, order: i + 1 })),
    }));
  };

  const saveTemplate = () => {
    if (!currentUser || !editorForm.name) return;

    const templateData = {
      name: editorForm.name,
      description: editorForm.description || undefined,
      boat_model: editorForm.boat_model,
      checklist_type: editorForm.checklist_type,
      is_active: editorForm.is_active,
      items: editorForm.items.map((item, idx) => ({
        ...item,
        id: item.id || generateId(),
        order: idx + 1,
      })) as ChecklistTemplateItem[],
      created_by_id: currentUser.id,
    };

    if (editingTemplate) {
      updateTemplate(editingTemplate.id, templateData);
    } else {
      addTemplate(templateData);
    }

    setShowEditor(false);
    setEditingTemplate(null);
  };

  const handleDuplicate = () => {
    if (!templateToDuplicate || !duplicateName) return;
    duplicateTemplate(templateToDuplicate.id, duplicateName);
    setShowDuplicateDialog(false);
    setTemplateToDuplicate(null);
    setDuplicateName('');
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteTemplate(deleteConfirm.id);
    setDeleteConfirm(null);
    if (selectedTemplate?.id === deleteConfirm.id) {
      setSelectedTemplate(null);
    }
  };

  const getCategoryBadge = (category: string) => {
    const cat = CATEGORY_OPTIONS.find(c => c.value === category);
    return cat ? cat.color : 'bg-slate-100 text-slate-700';
  };

  const getTypeIcon = (type: ChecklistTemplate['checklist_type']) => {
    switch (type) {
      case 'vessel_completion': return Ship;
      case 'maintenance': return Wrench;
      case 'quality_check': return Star;
      case 'safety_inspection': return Shield;
      default: return ClipboardList;
    }
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-slate-500">
          <Shield className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Access Denied</p>
          <p className="text-sm">You don't have permission to manage templates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ClipboardList className="h-7 w-7 text-teal-600" />
            Checklist Template Management
          </h1>
          <p className="text-slate-600">Create and manage checklist templates for vessels</p>
        </div>
        <Button onClick={() => openEditor()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CHECKLIST_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterModel} onValueChange={(v) => setFilterModel(v as typeof filterModel)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by model" />
              </SelectTrigger>
              <SelectContent>
                {BOAT_MODELS.map(model => (
                  <SelectItem key={model} value={model}>{model === 'all' ? 'All Models' : model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1 space-y-4">
          <Tabs defaultValue="vessel_completion" className="w-full">
            <TabsList className="grid grid-cols-2 gap-1">
              <TabsTrigger value="vessel_completion" className="text-xs">Completion</TabsTrigger>
              <TabsTrigger value="maintenance" className="text-xs">Maintenance</TabsTrigger>
            </TabsList>

            {CHECKLIST_TYPES.map(type => (
              <TabsContent key={type.value} value={type.value} className="mt-4 space-y-2">
                {groupedTemplates[type.value]?.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No templates found</p>
                ) : (
                  groupedTemplates[type.value]?.map(template => {
                    const Icon = getTypeIcon(template.checklist_type);
                    return (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedTemplate?.id === template.id ? 'ring-2 ring-teal-500' : ''
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-teal-100 rounded-lg">
                                <Icon className="h-4 w-4 text-teal-700" />
                              </div>
                              <div>
                                <h3 className="font-medium text-sm">{template.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-[10px]">
                                    {template.boat_model === 'all' ? 'All Models' : template.boat_model}
                                  </Badge>
                                  <span className="text-xs text-slate-500">{template.items.length} items</span>
                                </div>
                              </div>
                            </div>
                            <Badge className={template.is_active ? 'bg-green-500' : 'bg-slate-400'}>
                              {template.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Template Details */}
        <Card className="lg:col-span-2">
          {selectedTemplate ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {(() => {
                        const Icon = getTypeIcon(selectedTemplate.checklist_type);
                        return <Icon className="h-5 w-5 text-teal-600" />;
                      })()}
                      {selectedTemplate.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {selectedTemplate.description || 'No description'}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        {selectedTemplate.boat_model === 'all' ? 'All Models' : selectedTemplate.boat_model}
                      </Badge>
                      <Badge variant="outline">
                        {CHECKLIST_TYPES.find(t => t.value === selectedTemplate.checklist_type)?.label}
                      </Badge>
                      <Badge className={selectedTemplate.is_active ? 'bg-green-500' : 'bg-slate-400'}>
                        {selectedTemplate.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setTemplateToDuplicate(selectedTemplate);
                      setDuplicateName(`${selectedTemplate.name} (Copy)`);
                      setShowDuplicateDialog(true);
                    }}>
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditor(selectedTemplate)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteConfirm(selectedTemplate)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">Checklist Items ({selectedTemplate.items.length})</h4>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>{selectedTemplate.items.filter(i => i.required).length} required</span>
                    <span>{selectedTemplate.items.filter(i => i.photo_required).length} need photos</span>
                  </div>
                </div>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px]">Category</TableHead>
                        <TableHead className="w-[80px] text-center">Required</TableHead>
                        <TableHead className="w-[80px] text-center">Photos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTemplate.items.sort((a, b) => a.order - b.order).map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-slate-400">{idx + 1}</TableCell>
                          <TableCell>
                            <span className="text-sm">{item.description}</span>
                            {item.instructions && (
                              <p className="text-xs text-slate-500 mt-0.5">{item.instructions}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${getCategoryBadge(item.category)}`}>
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.required ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.photo_required ? (
                              <div className="flex items-center justify-center gap-1">
                                <Camera className="h-3 w-3 text-blue-500" />
                                <span className="text-xs">{item.photo_count || 1}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </>
          ) : (
            <CardContent className="h-[500px] flex items-center justify-center">
              <div className="text-center text-slate-500">
                <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a Template</p>
                <p className="text-sm">Choose a template from the list to view details</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
            <DialogDescription>Define checklist items for vessel inspections</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={editorForm.name}
                    onChange={(e) => setEditorForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Eagle 850 - New Build Completion"
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editorForm.description}
                    onChange={(e) => setEditorForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Brief description of this template..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Boat Model</Label>
                  <Select
                    value={editorForm.boat_model}
                    onValueChange={(v) => setEditorForm(p => ({ ...p, boat_model: v as BoatModel | 'all' }))}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BOAT_MODELS.map(model => (
                        <SelectItem key={model} value={model}>
                          {model === 'all' ? 'All Models' : model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Checklist Type</Label>
                  <Select
                    value={editorForm.checklist_type}
                    onValueChange={(v) => setEditorForm(p => ({ ...p, checklist_type: v as ChecklistTemplate['checklist_type'] }))}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHECKLIST_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <Switch
                    checked={editorForm.is_active}
                    onCheckedChange={(v) => setEditorForm(p => ({ ...p, is_active: v }))}
                  />
                  <Label>Template is active and available for use</Label>
                </div>
              </div>

              <Separator />

              {/* Checklist Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-medium">Checklist Items ({editorForm.items.length})</Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {editorForm.items.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-slate-400">
                    <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No checklist items yet. Click "Add Item" to start.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={editorForm.items.map(item => item.id).filter(Boolean) as string[]}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {editorForm.items.map((item, index) => (
                          <SortableChecklistItem
                            key={item.id || index}
                            item={item}
                            index={index}
                            onUpdate={updateItem}
                            onRemove={removeItem}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancel</Button>
            <Button onClick={saveTemplate} className="bg-teal-600 hover:bg-teal-700" disabled={!editorForm.name || editorForm.items.length === 0}>
              <Save className="h-4 w-4 mr-2" />
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Template</DialogTitle>
            <DialogDescription>Create a copy of "{templateToDuplicate?.name}"</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New Template Name</Label>
            <Input
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="Enter name for the copy..."
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>Cancel</Button>
            <Button onClick={handleDuplicate} disabled={!duplicateName}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Template
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TemplateManagement;
