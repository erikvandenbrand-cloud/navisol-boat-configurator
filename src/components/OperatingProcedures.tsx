'use client';

import { useState, useMemo, useRef } from 'react';
import {
  BookOpen, Plus, Search, Edit, Trash2, Eye, ChevronDown, ChevronRight,
  FileText, Image, AlertTriangle, Lightbulb, ListOrdered, List,
  Save, X, Tag, Ship, Check, Filter, Upload, File, Download
} from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { useProcedures } from '@/lib/procedures-store';
import { formatEuroDate, generateId } from '@/lib/formatting';
import {
  type OperatingProcedure,
  type ProcedureCategory,
  type ContentBlock,
  type ContentBlockType,
  type BoatModel,
  PROCEDURE_CATEGORY_INFO,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const BOAT_MODELS: BoatModel[] = ['Eagle 525T', 'Eagle 25TS', 'Eagle 28TS', 'Eagle 32TS', 'Eagle C550', 'Eagle C570', 'Eagle C720', 'Eagle C999', 'Eagle 28SG', 'Eagle Hybruut 28', 'Custom'];

const BLOCK_TYPE_INFO: Record<ContentBlockType, { label: string; icon: typeof FileText }> = {
  text: { label: 'Text Paragraph', icon: FileText },
  heading: { label: 'Heading', icon: FileText },
  list: { label: 'Bullet/Numbered List', icon: List },
  image: { label: 'Image', icon: Image },
  pdf: { label: 'PDF Document', icon: File },
  warning: { label: 'Warning Box', icon: AlertTriangle },
  tip: { label: 'Tip Box', icon: Lightbulb },
  steps: { label: 'Step-by-Step Instructions', icon: ListOrdered },
};

export function OperatingProcedures() {
  const { currentUser, hasPermission } = useAuth();
  const {
    procedures,
    addProcedure,
    updateProcedure,
    deleteProcedure,
    getProceduresByCategory,
  } = useProcedures();

  const [selectedCategory, setSelectedCategory] = useState<ProcedureCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState<OperatingProcedure | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<OperatingProcedure | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<ProcedureCategory[]>(
    Object.keys(PROCEDURE_CATEGORY_INFO) as ProcedureCategory[]
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Editor state
  const [editorForm, setEditorForm] = useState<Partial<OperatingProcedure>>({
    title: '',
    description: '',
    category: 'hull_structural',
    subcategory: '',
    applicable_models: ['Eagle 525T', 'Eagle 25TS', 'Eagle 28TS', 'Eagle 32TS', 'Eagle C550', 'Eagle C570', 'Eagle C720', 'Eagle C999', 'Eagle 28SG', 'Eagle Hybruut 28'],
    content_blocks: [],
    version: '1.0',
    status: 'draft',
    tags: [],
  });
  const [newTag, setNewTag] = useState('');

  const canManage = hasPermission('createCEDocs'); // Admins can manage procedures

  // Group procedures by category
  const groupedProcedures = useMemo(() => {
    const filtered = searchQuery
      ? procedures.filter(p =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : procedures;

    const groups: Record<ProcedureCategory, OperatingProcedure[]> = {} as Record<ProcedureCategory, OperatingProcedure[]>;
    (Object.keys(PROCEDURE_CATEGORY_INFO) as ProcedureCategory[]).forEach(cat => {
      groups[cat] = filtered.filter(p => p.category === cat && p.status !== 'archived');
    });
    return groups;
  }, [procedures, searchQuery]);

  const toggleCategory = (cat: ProcedureCategory) => {
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const openEditor = (procedure?: OperatingProcedure) => {
    if (procedure) {
      setEditorForm({ ...procedure });
      setEditingProcedure(procedure);
    } else {
      setEditorForm({
        title: '',
        description: '',
        category: 'hull_structural',
        subcategory: '',
        applicable_models: ['Eagle 525T', 'Eagle 25TS', 'Eagle 28TS', 'Eagle 32TS', 'Eagle C550', 'Eagle C570', 'Eagle C720', 'Eagle C999', 'Eagle 28SG', 'Eagle Hybruut 28'],
        content_blocks: [],
        version: '1.0',
        status: 'draft',
        tags: [],
      });
      setEditingProcedure(null);
    }
    setShowEditor(true);
  };

  const addContentBlock = (type: ContentBlockType) => {
    const newBlock: ContentBlock = {
      id: generateId(),
      type,
      order: (editorForm.content_blocks?.length || 0) + 1,
    };

    if (type === 'list') {
      newBlock.items = [''];
      newBlock.listType = 'bullet';
    } else if (type === 'steps') {
      newBlock.steps = [{ step: 1, instruction: '' }];
    } else if (type === 'heading') {
      newBlock.heading_level = 2;
      newBlock.content = '';
    } else {
      newBlock.content = '';
    }

    setEditorForm(prev => ({
      ...prev,
      content_blocks: [...(prev.content_blocks || []), newBlock],
    }));
  };

  const updateContentBlock = (blockId: string, updates: Partial<ContentBlock>) => {
    setEditorForm(prev => ({
      ...prev,
      content_blocks: (prev.content_blocks || []).map(b =>
        b.id === blockId ? { ...b, ...updates } : b
      ),
    }));
  };

  const removeContentBlock = (blockId: string) => {
    setEditorForm(prev => ({
      ...prev,
      content_blocks: (prev.content_blocks || []).filter(b => b.id !== blockId),
    }));
  };

  const handleImageUpload = async (blockId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateContentBlock(blockId, { image_url: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handlePdfUpload = async (blockId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateContentBlock(blockId, {
        pdf_url: e.target?.result as string,
        pdf_name: file.name,
        pdf_size: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    const tag = newTag.trim().toLowerCase();
    if (!editorForm.tags?.includes(tag)) {
      setEditorForm(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }));
    }
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setEditorForm(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t !== tag),
    }));
  };

  const toggleModel = (model: BoatModel) => {
    setEditorForm(prev => ({
      ...prev,
      applicable_models: prev.applicable_models?.includes(model)
        ? prev.applicable_models.filter(m => m !== model)
        : [...(prev.applicable_models || []), model],
    }));
  };

  const saveProcedure = () => {
    if (!currentUser || !editorForm.title || !editorForm.category) return;

    if (editingProcedure) {
      updateProcedure(editingProcedure.id, editorForm);
    } else {
      addProcedure({
        title: editorForm.title!,
        description: editorForm.description,
        category: editorForm.category as ProcedureCategory,
        subcategory: editorForm.subcategory,
        applicable_models: editorForm.applicable_models || [],
        content_blocks: editorForm.content_blocks || [],
        version: editorForm.version || '1.0',
        status: editorForm.status as OperatingProcedure['status'] || 'draft',
        created_by_id: currentUser.id,
        created_by_name: `${currentUser.firstName} ${currentUser.lastName}`,
        tags: editorForm.tags || [],
      });
    }
    setShowEditor(false);
    setEditingProcedure(null);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteProcedure(deleteConfirm.id);
    setDeleteConfirm(null);
    if (selectedProcedure?.id === deleteConfirm.id) {
      setSelectedProcedure(null);
    }
  };

  const renderContentBlock = (block: ContentBlock, isEditing = false) => {
    if (isEditing) {
      return renderEditableBlock(block);
    }

    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${block.heading_level || 2}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag className={`font-bold ${block.heading_level === 1 ? 'text-xl' : block.heading_level === 3 ? 'text-base' : 'text-lg'} text-slate-900 mt-4 mb-2`}>
            {block.content}
          </HeadingTag>
        );
      case 'text':
        return <p className="text-slate-700 mb-3 whitespace-pre-wrap">{block.content}</p>;
      case 'warning':
        return (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-3 rounded-r">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{block.content}</p>
            </div>
          </div>
        );
      case 'tip':
        return (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-3 rounded-r">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-blue-800">{block.content}</p>
            </div>
          </div>
        );
      case 'list':
        const ListTag = block.listType === 'numbered' ? 'ol' : 'ul';
        return (
          <ListTag className={`mb-3 pl-6 ${block.listType === 'numbered' ? 'list-decimal' : 'list-disc'}`}>
            {block.items?.map((item, idx) => (
              <li key={idx} className="text-slate-700 mb-1">{item}</li>
            ))}
          </ListTag>
        );
      case 'steps':
        return (
          <div className="space-y-3 mb-4">
            {block.steps?.map((step) => (
              <div key={step.step} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                  {step.step}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-slate-700">{step.instruction}</p>
                  {step.image_url && (
                    <img src={step.image_url} alt={`Step ${step.step}`} className="mt-2 rounded-lg max-h-48 object-cover" />
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      case 'image':
        return (
          <div className="mb-4">
            {block.image_url && (
              <img src={block.image_url} alt={block.image_caption || 'Procedure image'} className="rounded-lg max-w-full" />
            )}
            {block.image_caption && (
              <p className="text-sm text-slate-500 mt-1 text-center italic">{block.image_caption}</p>
            )}
          </div>
        );
      case 'pdf':
        return (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <File className="h-8 w-8 text-red-600" />
              <div>
                <p className="font-medium text-slate-900">{block.pdf_name || 'Document.pdf'}</p>
                <p className="text-xs text-slate-500">
                  {block.pdf_size ? `${(block.pdf_size / 1024).toFixed(1)} KB` : 'PDF Document'}
                </p>
              </div>
            </div>
            {block.pdf_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={block.pdf_url} download={block.pdf_name}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </a>
              </Button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderEditableBlock = (block: ContentBlock) => {
    return (
      <div className="border rounded-lg p-4 bg-slate-50 mb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">{BLOCK_TYPE_INFO[block.type].label}</Badge>
          <Button variant="ghost" size="sm" onClick={() => removeContentBlock(block.id)} className="text-red-500 h-6 w-6 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {block.type === 'heading' && (
          <div className="space-y-2">
            <Select value={String(block.heading_level || 2)} onValueChange={(v) => updateContentBlock(block.id, { heading_level: Number(v) as 1 | 2 | 3 })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">H1 - Large</SelectItem>
                <SelectItem value="2">H2 - Medium</SelectItem>
                <SelectItem value="3">H3 - Small</SelectItem>
              </SelectContent>
            </Select>
            <Input value={block.content || ''} onChange={(e) => updateContentBlock(block.id, { content: e.target.value })} placeholder="Heading text..." />
          </div>
        )}

        {(block.type === 'text' || block.type === 'warning' || block.type === 'tip') && (
          <Textarea value={block.content || ''} onChange={(e) => updateContentBlock(block.id, { content: e.target.value })} placeholder={`${block.type === 'warning' ? 'Warning message...' : block.type === 'tip' ? 'Tip message...' : 'Paragraph text...'}`} rows={3} />
        )}

        {block.type === 'list' && (
          <div className="space-y-2">
            <Select value={block.listType || 'bullet'} onValueChange={(v) => updateContentBlock(block.id, { listType: v as 'bullet' | 'numbered' })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bullet">Bullet List</SelectItem>
                <SelectItem value="numbered">Numbered List</SelectItem>
              </SelectContent>
            </Select>
            {block.items?.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Input value={item} onChange={(e) => {
                  const newItems = [...(block.items || [])];
                  newItems[idx] = e.target.value;
                  updateContentBlock(block.id, { items: newItems });
                }} placeholder={`Item ${idx + 1}...`} />
                <Button variant="ghost" size="sm" onClick={() => {
                  const newItems = (block.items || []).filter((_, i) => i !== idx);
                  updateContentBlock(block.id, { items: newItems });
                }} className="text-red-500"><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => updateContentBlock(block.id, { items: [...(block.items || []), ''] })}>
              <Plus className="h-4 w-4 mr-1" />Add Item
            </Button>
          </div>
        )}

        {block.type === 'steps' && (
          <div className="space-y-3">
            {block.steps?.map((step, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">{step.step}</div>
                <div className="flex-1">
                  <Input value={step.instruction} onChange={(e) => {
                    const newSteps = [...(block.steps || [])];
                    newSteps[idx] = { ...newSteps[idx], instruction: e.target.value };
                    updateContentBlock(block.id, { steps: newSteps });
                  }} placeholder={`Step ${step.step} instruction...`} />
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  const newSteps = (block.steps || []).filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }));
                  updateContentBlock(block.id, { steps: newSteps });
                }} className="text-red-500"><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => updateContentBlock(block.id, { steps: [...(block.steps || []), { step: (block.steps?.length || 0) + 1, instruction: '' }] })}>
              <Plus className="h-4 w-4 mr-1" />Add Step
            </Button>
          </div>
        )}

        {block.type === 'image' && (
          <div className="space-y-2">
            {block.image_url ? (
              <div className="relative">
                <img src={block.image_url} alt="Preview" className="max-h-48 rounded-lg" />
                <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => updateContentBlock(block.id, { image_url: undefined })}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input type="file" accept="image/*" className="hidden" id={`img-${block.id}`} onChange={(e) => e.target.files?.[0] && handleImageUpload(block.id, e.target.files[0])} />
                <label htmlFor={`img-${block.id}`} className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">Click to upload image</p>
                </label>
              </div>
            )}
            <Input value={block.image_caption || ''} onChange={(e) => updateContentBlock(block.id, { image_caption: e.target.value })} placeholder="Image caption (optional)..." />
          </div>
        )}

        {block.type === 'pdf' && (
          <div className="space-y-2">
            {block.pdf_url ? (
              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex items-center gap-2">
                  <File className="h-6 w-6 text-red-600" />
                  <span className="font-medium">{block.pdf_name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => updateContentBlock(block.id, { pdf_url: undefined, pdf_name: undefined })} className="text-red-500">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input type="file" accept=".pdf" className="hidden" id={`pdf-${block.id}`} onChange={(e) => e.target.files?.[0] && handlePdfUpload(block.id, e.target.files[0])} />
                <label htmlFor={`pdf-${block.id}`} className="cursor-pointer">
                  <File className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">Click to upload PDF</p>
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-teal-600" />
            Operating Procedures
          </h1>
          <p className="text-slate-600">Task instructions and standard operating procedures for production</p>
        </div>
        {canManage && (
          <Button onClick={() => openEditor()} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            New Procedure
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search procedures by title, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Procedure List */}
        <div className="lg:col-span-1 space-y-3">
          {(Object.keys(PROCEDURE_CATEGORY_INFO) as ProcedureCategory[]).map(category => {
            const catInfo = PROCEDURE_CATEGORY_INFO[category];
            const catProcedures = groupedProcedures[category] || [];
            const isExpanded = expandedCategories.includes(category);

            return (
              <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-3 cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${catInfo.bgColor}`} />
                          <span className="font-medium text-sm">{catInfo.label_en}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{catProcedures.length}</Badge>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-3">
                      {catProcedures.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">No procedures</p>
                      ) : (
                        <div className="space-y-2">
                          {catProcedures.map(proc => (
                            <button
                              key={proc.id}
                              type="button"
                              onClick={() => setSelectedProcedure(proc)}
                              className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                                selectedProcedure?.id === proc.id
                                  ? 'bg-teal-100 border-teal-300'
                                  : 'bg-slate-50 hover:bg-slate-100'
                              }`}
                            >
                              <p className="font-medium text-slate-900 truncate">{proc.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={proc.status === 'approved' ? 'default' : 'secondary'} className={`text-[10px] py-0 ${proc.status === 'approved' ? 'bg-green-500' : ''}`}>
                                  {proc.status}
                                </Badge>
                                <span className="text-[10px] text-slate-400">v{proc.version}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

        {/* Procedure Viewer */}
        <Card className="lg:col-span-2">
          {selectedProcedure ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${PROCEDURE_CATEGORY_INFO[selectedProcedure.category].bgColor} ${PROCEDURE_CATEGORY_INFO[selectedProcedure.category].color} border-0`}>
                        {PROCEDURE_CATEGORY_INFO[selectedProcedure.category].label_en}
                      </Badge>
                      <Badge variant={selectedProcedure.status === 'approved' ? 'default' : 'secondary'} className={selectedProcedure.status === 'approved' ? 'bg-green-500' : ''}>
                        {selectedProcedure.status}
                      </Badge>
                      <span className="text-xs text-slate-400">v{selectedProcedure.version}</span>
                    </div>
                    <CardTitle className="text-xl">{selectedProcedure.title}</CardTitle>
                    {selectedProcedure.description && (
                      <CardDescription className="mt-1">{selectedProcedure.description}</CardDescription>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditor(selectedProcedure)}>
                        <Edit className="h-4 w-4 mr-1" />Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteConfirm({ id: selectedProcedure.id, title: selectedProcedure.title })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Ship className="h-3 w-3" />
                    {selectedProcedure.applicable_models.join(', ')}
                  </span>
                  <span>Updated: {formatEuroDate(selectedProcedure.updated_at)}</span>
                  <span>By: {selectedProcedure.created_by_name}</span>
                </div>

                {/* Tags */}
                {selectedProcedure.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedProcedure.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-[10px] py-0">
                        <Tag className="h-2 w-2 mr-1" />{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <ScrollArea className="h-[500px] pr-4">
                  {selectedProcedure.content_blocks
                    .sort((a, b) => a.order - b.order)
                    .map(block => (
                      <div key={block.id}>{renderContentBlock(block)}</div>
                    ))}
                </ScrollArea>
              </CardContent>
            </>
          ) : (
            <CardContent className="h-[600px] flex items-center justify-center">
              <div className="text-center text-slate-500">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-1">Select a Procedure</p>
                <p className="text-sm">Choose a procedure from the list to view its contents</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingProcedure ? 'Edit Procedure' : 'Create New Procedure'}</DialogTitle>
            <DialogDescription>Add text, images, PDFs, and step-by-step instructions</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Title *</Label>
                  <Input value={editorForm.title || ''} onChange={(e) => setEditorForm(p => ({ ...p, title: e.target.value }))} placeholder="Procedure title..." className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea value={editorForm.description || ''} onChange={(e) => setEditorForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." className="mt-1" rows={2} />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select value={editorForm.category || 'hull_structural'} onValueChange={(v) => setEditorForm(p => ({ ...p, category: v as ProcedureCategory }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PROCEDURE_CATEGORY_INFO) as ProcedureCategory[]).map(cat => (
                        <SelectItem key={cat} value={cat}>{PROCEDURE_CATEGORY_INFO[cat].label_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editorForm.status || 'draft'} onValueChange={(v) => setEditorForm(p => ({ ...p, status: v as OperatingProcedure['status'] }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Applicable Models */}
              <div>
                <Label>Applicable Models</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {BOAT_MODELS.map(model => (
                    <label key={model} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={editorForm.applicable_models?.includes(model)} onCheckedChange={() => toggleModel(model)} />
                      <span className="text-sm">{model}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag..." onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                  <Button type="button" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                </div>
                {editorForm.tags && editorForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editorForm.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Content Blocks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base">Content Blocks</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Add Block</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(Object.keys(BLOCK_TYPE_INFO) as ContentBlockType[]).map(type => {
                        const info = BLOCK_TYPE_INFO[type];
                        return (
                          <DropdownMenuItem key={type} onClick={() => addContentBlock(type)}>
                            <info.icon className="h-4 w-4 mr-2" />{info.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {editorForm.content_blocks && editorForm.content_blocks.length > 0 ? (
                  <div className="space-y-2">
                    {editorForm.content_blocks.sort((a, b) => a.order - b.order).map(block => renderEditableBlock(block))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-slate-400">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No content blocks yet. Click "Add Block" to start.</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancel</Button>
            <Button onClick={saveProcedure} className="bg-teal-600 hover:bg-teal-700" disabled={!editorForm.title}>
              <Save className="h-4 w-4 mr-2" />{editingProcedure ? 'Save Changes' : 'Create Procedure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />Delete Procedure
            </DialogTitle>
            <DialogDescription>Delete "{deleteConfirm?.title}"? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OperatingProcedures;
