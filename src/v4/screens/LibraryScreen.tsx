'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  Ship,
  Package,
  FileText,
  Plus,
  Check,
  Clock,
  AlertTriangle,
  ChevronRight,
  Edit,
  Eye,
  RefreshCw,
  BookOpen,
  Trash2,
  Layers,
  Search,
  Paperclip,
  Scale,
  ClipboardList,
} from 'lucide-react';
import type { VersionStatus, LibraryDocumentTemplate, TemplateVersion, DocumentType, LibraryProcedure, ProcedureVersion, LibraryCategory, LibrarySubcategory, LibraryArticle, ArticleVersion, LibraryKit, KitVersion, CategoryTree } from '@/domain/models';
import { TemplateRepository, ProcedureRepository } from '@/data/repositories/LibraryRepository';
import { TemplateService } from '@/domain/services/TemplateService';
import { ProcedureService, PROCEDURE_CATEGORIES } from '@/domain/services/ProcedureService';
import { BoatModelService, type BoatModel, type BoatModelVersion, type CreateBoatModelInput, type CreateBoatModelVersionInput } from '@/domain/services/BoatModelService';
import { EquipmentCatalogService, type EquipmentCatalogItem, type CreateEquipmentItemInput, EQUIPMENT_CATEGORIES } from '@/domain/services/EquipmentCatalogService';
import { LibraryCategoryService, LibraryArticleService, LibraryKitService, LibrarySeedService } from '@/domain/services';
import { getDefaultAuditContext } from '@/v4/state/useAuth';
import { TemplateEditorDialog } from '@/v4/components/TemplateEditorDialog';
import { BoatModelDialog } from '@/v4/components/BoatModelDialog';
import { EquipmentDialog } from '@/v4/components/EquipmentDialog';
import { ArticleDialog } from '@/v4/components/ArticleDialog';
import { KitDialog } from '@/v4/components/KitDialog';
import { ProductionProceduresTab } from '@/v4/components/ProductionProceduresTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_BADGE: Record<VersionStatus, { bg: string; text: string; icon: React.ElementType }> = {
  DRAFT: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700', icon: Check },
  DEPRECATED: { bg: 'bg-slate-100', text: 'text-slate-500', icon: AlertTriangle },
};

const DOCUMENT_TYPES: { type: DocumentType; label: string; description: string }[] = [
  { type: 'CE_DECLARATION', label: 'CE Declaration', description: 'EC Declaration of Conformity' },
  { type: 'OWNERS_MANUAL', label: "Owner's Manual", description: 'Operation and maintenance guide' },
  { type: 'TECHNICAL_FILE', label: 'Technical File', description: 'Generated snapshot of Technical Dossier' },
  { type: 'DELIVERY_NOTE', label: 'Delivery Note', description: 'Handover documentation' },
  { type: 'INVOICE', label: 'Invoice', description: 'Commercial invoice template' },
  { type: 'QUOTE', label: 'Quote', description: 'Quotation template' },
];

export function LibraryScreen() {
  const [activeTab, setActiveTab] = useState('articles');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showLegacyCatalog, setShowLegacyCatalog] = useState(false); // Hidden by default

  // Template state
  const [templates, setTemplates] = useState<LibraryDocumentTemplate[]>([]);
  const [templateVersions, setTemplateVersions] = useState<Record<string, TemplateVersion[]>>({});
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LibraryDocumentTemplate | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [newTemplateType, setNewTemplateType] = useState<DocumentType>('CE_DECLARATION');
  const [newTemplateName, setNewTemplateName] = useState('');

  // Procedure state
  const [procedures, setProcedures] = useState<LibraryProcedure[]>([]);
  const [procedureVersions, setProcedureVersions] = useState<Record<string, ProcedureVersion[]>>({});
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(true);
  const [showCreateProcedureDialog, setShowCreateProcedureDialog] = useState(false);
  const [showProcedureViewDialog, setShowProcedureViewDialog] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<LibraryProcedure | null>(null);
  const [selectedProcedureVersion, setSelectedProcedureVersion] = useState<ProcedureVersion | null>(null);
  const [newProcedureCategory, setNewProcedureCategory] = useState('operation');
  const [newProcedureTitle, setNewProcedureTitle] = useState('');
  const [newProcedureContent, setNewProcedureContent] = useState('');

  // Boat model state
  const [boatModels, setBoatModels] = useState<BoatModel[]>([]);
  const [boatModelVersions, setBoatModelVersions] = useState<Record<string, BoatModelVersion[]>>({});
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [showBoatModelDialog, setShowBoatModelDialog] = useState(false);
  const [selectedBoatModel, setSelectedBoatModel] = useState<BoatModel | null>(null);
  const [selectedBoatModelVersion, setSelectedBoatModelVersion] = useState<BoatModelVersion | null>(null);
  const [boatModelDialogMode, setBoatModelDialogMode] = useState<'create' | 'edit' | 'new-version'>('create');

  // Equipment catalog state
  const [equipmentItems, setEquipmentItems] = useState<EquipmentCatalogItem[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(true);
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [selectedEquipmentItem, setSelectedEquipmentItem] = useState<EquipmentCatalogItem | null>(null);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState<string>('all');

  // Articles & Kits state (Library v4)
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [articles, setArticles] = useState<{ article: LibraryArticle; version: ArticleVersion | null }[]>([]);
  const [kits, setKits] = useState<{ kit: LibraryKit; version: KitVersion | null }[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [isLoadingKits, setIsLoadingKits] = useState(true);
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [kitSearchQuery, setKitSearchQuery] = useState('');
  const [showArticleDialog, setShowArticleDialog] = useState(false);
  const [showKitDialog, setShowKitDialog] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<LibraryArticle | null>(null);
  const [selectedArticleVersion, setSelectedArticleVersion] = useState<ArticleVersion | null>(null);
  const [selectedKit, setSelectedKit] = useState<LibraryKit | null>(null);
  const [selectedKitVersion, setSelectedKitVersion] = useState<KitVersion | null>(null);
  const [articleDialogMode, setArticleDialogMode] = useState<'create' | 'edit' | 'new-version'>('create');
  const [kitDialogMode, setKitDialogMode] = useState<'create' | 'edit' | 'new-version'>('create');

  useEffect(() => {
    loadTemplates();
    loadProcedures();
    loadBoatModels();
    loadEquipment();
    loadArticlesAndKits();
  }, []);

  async function loadTemplates() {
    setIsLoadingTemplates(true);
    try {
      // Initialize default templates if needed
      const context = getDefaultAuditContext();
      await TemplateService.initializeDefaultTemplates(context);

      // Load all templates
      const allTemplates = await TemplateRepository.getAll();
      setTemplates(allTemplates);

      // Load versions for each template
      const versions: Record<string, TemplateVersion[]> = {};
      for (const template of allTemplates) {
        versions[template.id] = await TemplateRepository.getVersions(template.id);
      }
      setTemplateVersions(versions);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  }

  async function handleCreateTemplate() {
    if (!newTemplateName) return;

    try {
      const context = getDefaultAuditContext();
      const result = await TemplateService.createTemplate(newTemplateType, newTemplateName, context);
      if (result.ok) {
        setShowCreateDialog(false);
        setNewTemplateName('');
        await loadTemplates();
      } else {
        alert(`Failed to create template: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  }

  function handleEditTemplate(template: LibraryDocumentTemplate) {
    const versions = templateVersions[template.id] || [];
    const currentVersion = versions.find(v => v.id === template.currentVersionId) || versions[0];
    setSelectedTemplate(template);
    setSelectedVersion(currentVersion || null);
    setShowEditorDialog(true);
  }

  function handleViewVersion(template: LibraryDocumentTemplate, version: TemplateVersion) {
    setSelectedTemplate(template);
    setSelectedVersion(version);
    setShowEditorDialog(true);
  }

  async function handleApproveVersion(versionId: string) {
    try {
      const context = getDefaultAuditContext();
      const result = await TemplateService.approveVersion(versionId, context);
      if (result.ok) {
        await loadTemplates();
      } else {
        alert(`Failed to approve: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to approve version:', error);
    }
  }

  // Procedure functions
  async function loadProcedures() {
    setIsLoadingProcedures(true);
    try {
      // Initialize default procedures if needed
      const context = getDefaultAuditContext();
      await ProcedureService.initializeDefaultProcedures(context);

      // Load all procedures
      const allProcedures = await ProcedureRepository.getAll();
      setProcedures(allProcedures);

      // Load versions for each procedure
      const versions: Record<string, ProcedureVersion[]> = {};
      for (const procedure of allProcedures) {
        versions[procedure.id] = await ProcedureRepository.getVersions(procedure.id);
      }
      setProcedureVersions(versions);
    } catch (error) {
      console.error('Failed to load procedures:', error);
    } finally {
      setIsLoadingProcedures(false);
    }
  }

  async function handleCreateProcedure() {
    if (!newProcedureTitle || !newProcedureContent) return;

    try {
      const context = getDefaultAuditContext();
      const result = await ProcedureService.createProcedure(
        newProcedureCategory,
        newProcedureTitle,
        newProcedureContent,
        context
      );
      if (result.ok) {
        setShowCreateProcedureDialog(false);
        setNewProcedureTitle('');
        setNewProcedureContent('');
        await loadProcedures();
      } else {
        alert(`Failed to create procedure: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create procedure:', error);
    }
  }

  function handleViewProcedure(procedure: LibraryProcedure) {
    const versions = procedureVersions[procedure.id] || [];
    const currentVersion = versions.find(v => v.id === procedure.currentVersionId) || versions[0];
    setSelectedProcedure(procedure);
    setSelectedProcedureVersion(currentVersion || null);
    setShowProcedureViewDialog(true);
  }

  async function handleApproveProcedureVersion(versionId: string) {
    try {
      const context = getDefaultAuditContext();
      const result = await ProcedureService.approveVersion(versionId, context);
      if (result.ok) {
        await loadProcedures();
      } else {
        alert(`Failed to approve: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to approve procedure:', error);
    }
  }

  async function handleDeleteProcedure(procedureId: string) {
    if (!confirm('Delete this procedure?')) return;

    try {
      const context = getDefaultAuditContext();
      const result = await ProcedureService.deleteProcedure(procedureId, context);
      if (result.ok) {
        await loadProcedures();
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to delete procedure:', error);
    }
  }

  // ============================================
  // BOAT MODEL FUNCTIONS
  // ============================================

  async function loadBoatModels() {
    setIsLoadingModels(true);
    try {
      const context = getDefaultAuditContext();
      await BoatModelService.initializeDefaults(context);

      const models = await BoatModelService.getAll();
      setBoatModels(models);

      const versions: Record<string, BoatModelVersion[]> = {};
      for (const model of models) {
        versions[model.id] = await BoatModelService.getVersions(model.id);
      }
      setBoatModelVersions(versions);
    } catch (error) {
      console.error('Failed to load boat models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  }

  function handleOpenCreateBoatModel() {
    setSelectedBoatModel(null);
    setSelectedBoatModelVersion(null);
    setBoatModelDialogMode('create');
    setShowBoatModelDialog(true);
  }

  function handleEditBoatModel(model: BoatModel) {
    const versions = boatModelVersions[model.id] || [];
    const currentVersion = versions.find(v => v.id === model.currentVersionId) || versions[0];
    setSelectedBoatModel(model);
    setSelectedBoatModelVersion(currentVersion || null);
    setBoatModelDialogMode('edit');
    setShowBoatModelDialog(true);
  }

  function handleNewBoatModelVersion(model: BoatModel) {
    const versions = boatModelVersions[model.id] || [];
    const currentVersion = versions.find(v => v.id === model.currentVersionId) || versions[0];
    setSelectedBoatModel(model);
    setSelectedBoatModelVersion(currentVersion || null);
    setBoatModelDialogMode('new-version');
    setShowBoatModelDialog(true);
  }

  async function handleCreateBoatModel(input: CreateBoatModelInput) {
    const context = getDefaultAuditContext();
    const result = await BoatModelService.create(input, context);
    if (result.ok) {
      await loadBoatModels();
    } else {
      alert(`Failed to create: ${result.error}`);
    }
  }

  async function handleUpdateBoatModel(updates: Partial<BoatModel>) {
    if (!selectedBoatModel) return;
    const context = getDefaultAuditContext();
    const result = await BoatModelService.update(selectedBoatModel.id, updates, context);
    if (result.ok) {
      await loadBoatModels();
    } else {
      alert(`Failed to update: ${result.error}`);
    }
  }

  async function handleCreateBoatModelVersion(input: CreateBoatModelVersionInput) {
    if (!selectedBoatModel) return;
    const context = getDefaultAuditContext();
    const result = await BoatModelService.createVersion(selectedBoatModel.id, input, context);
    if (result.ok) {
      await loadBoatModels();
    } else {
      alert(`Failed to create version: ${result.error}`);
    }
  }

  async function handleApproveBoatModelVersion(versionId: string) {
    const context = getDefaultAuditContext();
    const result = await BoatModelService.approveVersion(versionId, context);
    if (result.ok) {
      await loadBoatModels();
    } else {
      alert(`Failed to approve: ${result.error}`);
    }
  }

  async function handleArchiveBoatModel(modelId: string) {
    if (!confirm('Archive this boat model?')) return;
    const context = getDefaultAuditContext();
    const result = await BoatModelService.archive(modelId, context);
    if (result.ok) {
      await loadBoatModels();
    } else {
      alert(`Failed to archive: ${result.error}`);
    }
  }

  // ============================================
  // EQUIPMENT CATALOG FUNCTIONS
  // ============================================

  async function loadEquipment() {
    setIsLoadingEquipment(true);
    try {
      const context = getDefaultAuditContext();
      await EquipmentCatalogService.initializeDefaults(context);

      const items = await EquipmentCatalogService.getAll();
      setEquipmentItems(items);
    } catch (error) {
      console.error('Failed to load equipment:', error);
    } finally {
      setIsLoadingEquipment(false);
    }
  }

  function handleOpenCreateEquipment() {
    setSelectedEquipmentItem(null);
    setShowEquipmentDialog(true);
  }

  function handleEditEquipment(item: EquipmentCatalogItem) {
    setSelectedEquipmentItem(item);
    setShowEquipmentDialog(true);
  }

  async function handleCreateEquipment(input: CreateEquipmentItemInput) {
    const context = getDefaultAuditContext();
    const result = await EquipmentCatalogService.create(input, context);
    if (result.ok) {
      await loadEquipment();
    } else {
      alert(`Failed to create: ${result.error}`);
    }
  }

  async function handleUpdateEquipment(updates: Partial<EquipmentCatalogItem>) {
    if (!selectedEquipmentItem) return;
    const context = getDefaultAuditContext();
    const result = await EquipmentCatalogService.update(selectedEquipmentItem.id, updates, context);
    if (result.ok) {
      await loadEquipment();
    } else {
      alert(`Failed to update: ${result.error}`);
    }
  }

  async function handleArchiveEquipment(itemId: string) {
    if (!confirm('Archive this equipment item?')) return;
    const context = getDefaultAuditContext();
    const result = await EquipmentCatalogService.archive(itemId, context);
    if (result.ok) {
      await loadEquipment();
    } else {
      alert(`Failed to archive: ${result.error}`);
    }
  }

  // Filter equipment items
  const filteredEquipment = equipmentItems.filter(item => {
    const matchesSearch = !equipmentSearchQuery ||
      item.name.toLowerCase().includes(equipmentSearchQuery.toLowerCase()) ||
      item.articleNumber.toLowerCase().includes(equipmentSearchQuery.toLowerCase());
    const matchesCategory = equipmentCategoryFilter === 'all' || item.category === equipmentCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // ============================================
  // ARTICLES & KITS FUNCTIONS (Library v4)
  // ============================================

  async function loadArticlesAndKits() {
    setIsLoadingArticles(true);
    setIsLoadingKits(true);
    try {
      const context = getDefaultAuditContext();

      // Initialize taxonomy if needed
      await LibrarySeedService.initializeTaxonomy(context);
      await LibrarySeedService.seedSampleArticles(context);

      // Load category tree
      const tree = await LibraryCategoryService.getCategoryTree();
      setCategoryTree(tree);

      // Load all articles with their current versions
      const allArticles = await LibraryArticleService.getAll();
      const articlesWithVersions: { article: LibraryArticle; version: ArticleVersion | null }[] = [];
      for (const article of allArticles) {
        let version: ArticleVersion | null = null;
        if (article.currentVersionId) {
          version = await LibraryArticleService.getVersionById(article.currentVersionId);
        }
        articlesWithVersions.push({ article, version });
      }
      setArticles(articlesWithVersions);

      // Load all kits with their current versions
      const allKits = await LibraryKitService.getAll();
      const kitsWithVersions: { kit: LibraryKit; version: KitVersion | null }[] = [];
      for (const kit of allKits) {
        let version: KitVersion | null = null;
        if (kit.currentVersionId) {
          version = await LibraryKitService.getVersionById(kit.currentVersionId);
        }
        kitsWithVersions.push({ kit, version });
      }
      setKits(kitsWithVersions);
    } catch (error) {
      console.error('Failed to load articles/kits:', error);
    } finally {
      setIsLoadingArticles(false);
      setIsLoadingKits(false);
    }
  }

  function handleOpenCreateArticle() {
    setSelectedArticle(null);
    setSelectedArticleVersion(null);
    setArticleDialogMode('create');
    setShowArticleDialog(true);
  }

  function handleEditArticle(article: LibraryArticle, version: ArticleVersion | null) {
    setSelectedArticle(article);
    setSelectedArticleVersion(version);
    setArticleDialogMode('edit');
    setShowArticleDialog(true);
  }

  function handleNewArticleVersion(article: LibraryArticle, version: ArticleVersion | null) {
    setSelectedArticle(article);
    setSelectedArticleVersion(version);
    setArticleDialogMode('new-version');
    setShowArticleDialog(true);
  }

  function handleOpenCreateKit() {
    setSelectedKit(null);
    setSelectedKitVersion(null);
    setKitDialogMode('create');
    setShowKitDialog(true);
  }

  function handleEditKit(kit: LibraryKit, version: KitVersion | null) {
    setSelectedKit(kit);
    setSelectedKitVersion(version);
    setKitDialogMode('edit');
    setShowKitDialog(true);
  }

  function handleNewKitVersion(kit: LibraryKit, version: KitVersion | null) {
    setSelectedKit(kit);
    setSelectedKitVersion(version);
    setKitDialogMode('new-version');
    setShowKitDialog(true);
  }

  // Filter articles
  const filteredArticles = articles.filter(({ article }) => {
    const matchesSearch = !articleSearchQuery ||
      article.code.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
      article.name.toLowerCase().includes(articleSearchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter kits
  const filteredKits = kits.filter(({ kit }) => {
    const matchesSearch = !kitSearchQuery ||
      kit.code.toLowerCase().includes(kitSearchQuery.toLowerCase()) ||
      kit.name.toLowerCase().includes(kitSearchQuery.toLowerCase());
    return matchesSearch;
  });

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Database className="h-7 w-7 text-teal-600" />
            Library
          </h1>
          <p className="text-slate-600 mt-1">
            Versioned templates for boat models, equipment, and documents
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-teal-50 border-teal-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-teal-600 mt-0.5" />
            <div>
              <p className="font-medium text-teal-900">Library Layer</p>
              <p className="text-sm text-teal-700">
                Library items are versioned templates. When a project references a library item,
                it pins to a specific version. Library updates never affect historical projects.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="articles" className="gap-2">
            <Package className="h-4 w-4" />
            Articles
            <Badge variant="secondary" className="ml-1">{articles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="kits" className="gap-2">
            <Layers className="h-4 w-4" />
            Kits
            <Badge variant="secondary" className="ml-1">{kits.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="boat-models" className="gap-2">
            <Ship className="h-4 w-4" />
            Boat Models
            <Badge variant="secondary" className="ml-1">{boatModels.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
            <Badge variant="secondary" className="ml-1">{templates.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="procedures" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Procedures
            <Badge variant="secondary" className="ml-1">{procedures.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="production-procedures" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Task Templates
          </TabsTrigger>
          {showLegacyCatalog && (
            <TabsTrigger value="catalogs" className="gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Legacy Catalog
              <Badge variant="secondary" className="ml-1 bg-amber-100">{equipmentItems.length}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Toggle Legacy Catalog */}
        {!showLegacyCatalog && (
          <button
            type="button"
            onClick={() => setShowLegacyCatalog(true)}
            className="text-xs text-slate-400 hover:text-slate-600 underline mt-2"
          >
            Show deprecated Legacy Catalog
          </button>
        )}

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by code or name..."
                  value={articleSearchQuery}
                  onChange={(e) => setArticleSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadArticlesAndKits} disabled={isLoadingArticles}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingArticles ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleOpenCreateArticle}>
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </div>
          </div>

          {isLoadingArticles ? (
            <div className="text-center py-8 text-slate-500">Loading articles...</div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>{articleSearchQuery ? 'No articles match your search' : 'No articles yet'}</p>
              {!articleSearchQuery && (
                <Button variant="outline" className="mt-4" onClick={handleOpenCreateArticle}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Article
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Sell Price</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead className="text-center">Files</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArticles.map(({ article, version }) => {
                      const statusConfig = version
                        ? STATUS_BADGE[version.status]
                        : STATUS_BADGE.DRAFT;
                      const StatusIcon = statusConfig.icon;

                      return (
                        <TableRow key={article.id}>
                          <TableCell className="font-mono text-xs">{article.code}</TableCell>
                          <TableCell>
                            <p className="font-medium">{article.name}</p>
                          </TableCell>
                          <TableCell className="text-sm">{article.unit}</TableCell>
                          <TableCell className="text-right font-medium">
                            {version ? formatCurrency(version.sellPrice) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {version?.costPrice ? formatCurrency(version.costPrice) : (
                              <span className="text-amber-600 flex items-center gap-1 justify-end">
                                <AlertTriangle className="h-3 w-3" />
                                N/A
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm text-slate-600">
                            {version?.weightKg ? (
                              <span className="flex items-center gap-1 justify-end">
                                <Scale className="h-3 w-3" />
                                {version.weightKg} kg
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {(version?.attachments?.length || 0) > 0 ? (
                              <span className="flex items-center gap-1 justify-center text-teal-600">
                                <Paperclip className="h-3 w-3" />
                                {version?.attachments?.length}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {version && (
                              <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {version.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {article.tags?.map(tag => (
                                <Badge key={tag} variant="outline" className="text-[10px] py-0">
                                  {tag.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleNewArticleVersion(article, version)}
                                title="New Version"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEditArticle(article, version)}
                                title="View Details"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-slate-500 text-center">
            {filteredArticles.length} articles • Versioned with DRAFT → APPROVED → DEPRECATED lifecycle
          </p>
        </TabsContent>

        {/* Kits Tab */}
        <TabsContent value="kits" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by code or name..."
                  value={kitSearchQuery}
                  onChange={(e) => setKitSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadArticlesAndKits} disabled={isLoadingKits}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingKits ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleOpenCreateKit}>
                <Plus className="h-4 w-4 mr-2" />
                New Kit
              </Button>
            </div>
          </div>

          {isLoadingKits ? (
            <div className="text-center py-8 text-slate-500">Loading kits...</div>
          ) : filteredKits.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Layers className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>{kitSearchQuery ? 'No kits match your search' : 'No kits yet'}</p>
              <p className="text-sm mt-2">Kits are assemblies of articles that appear as a single line on quotes</p>
              {!kitSearchQuery && (
                <Button variant="outline" className="mt-4" onClick={handleOpenCreateKit}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Kit
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Components</TableHead>
                      <TableHead className="text-right">Sell Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKits.map(({ kit, version }) => {
                      const statusConfig = version
                        ? STATUS_BADGE[version.status]
                        : STATUS_BADGE.DRAFT;
                      const StatusIcon = statusConfig.icon;

                      return (
                        <TableRow key={kit.id}>
                          <TableCell className="font-mono text-xs">{kit.code}</TableCell>
                          <TableCell>
                            <p className="font-medium">{kit.name}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            {version ? version.components.length : 0}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {version ? formatCurrency(version.sellPrice) : '-'}
                          </TableCell>
                          <TableCell>
                            {version && (
                              <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {version.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {version?.explodeInBOM && (
                                <Badge variant="outline" className="text-[10px] py-0">BOM</Badge>
                              )}
                              {version?.salesOnly && (
                                <Badge variant="secondary" className="text-[10px] py-0">Sales Only</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleNewKitVersion(kit, version)}
                                title="New Version"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEditKit(kit, version)}
                                title="View Details"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-slate-500 text-center">
            {filteredKits.length} kits • Appear as single quote lines, explode in BOM
          </p>
        </TabsContent>

        {/* Document Templates Tab */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Document templates with placeholder system for quotes, manuals, and certificates
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadTemplates} disabled={isLoadingTemplates}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingTemplates ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </div>
          </div>

          {isLoadingTemplates ? (
            <div className="text-center py-16">
              <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No templates yet</h3>
                <p className="text-slate-600 mb-4">Create your first document template</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => {
                const versions = templateVersions[template.id] || [];
                const currentVersion = versions.find(v => v.id === template.currentVersionId);
                const statusConfig = currentVersion
                  ? STATUS_BADGE[currentVersion.status]
                  : STATUS_BADGE.DRAFT;
                const StatusIcon = statusConfig.icon;
                const typeInfo = DOCUMENT_TYPES.find(t => t.type === template.type);

                return (
                  <Card key={template.id} className="hover:border-teal-300 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-teal-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription>
                              {typeInfo?.description || template.type}
                              {currentVersion && ` • v${currentVersion.versionLabel}`}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentVersion && (
                            <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {currentVersion.status}
                            </Badge>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleEditTemplate(template)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {versions.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Version</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Approved</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {versions.slice(0, 3).map((version) => {
                              const verStatus = STATUS_BADGE[version.status];
                              const VerIcon = verStatus.icon;
                              return (
                                <TableRow key={version.id}>
                                  <TableCell className="font-mono">v{version.versionLabel}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={`${verStatus.bg} ${verStatus.text} border-0`}
                                    >
                                      <VerIcon className="h-3 w-3 mr-1" />
                                      {version.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{formatDate(version.createdAt)}</TableCell>
                                  <TableCell>
                                    {version.approvedAt ? formatDate(version.approvedAt) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleViewVersion(template, version)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      {version.status === 'DRAFT' && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-green-600"
                                          onClick={() => handleApproveVersion(version.id)}
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {versions.length > 3 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-slate-500 text-sm">
                                  +{versions.length - 3} more versions
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Procedures Tab */}
        <TabsContent value="procedures" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Operating procedures for boat operation, safety, and maintenance
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadProcedures} disabled={isLoadingProcedures}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingProcedures ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => setShowCreateProcedureDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Procedure
              </Button>
            </div>
          </div>

          {isLoadingProcedures ? (
            <div className="text-center py-16">
              <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Loading procedures...</p>
            </div>
          ) : procedures.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No procedures yet</h3>
                <p className="text-slate-600 mb-4">Create operating procedures for your boats</p>
                <Button onClick={() => setShowCreateProcedureDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Procedure
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {procedures.map((procedure) => {
                const versions = procedureVersions[procedure.id] || [];
                const currentVersion = versions.find(v => v.id === procedure.currentVersionId);
                const statusConfig = currentVersion
                  ? STATUS_BADGE[currentVersion.status]
                  : STATUS_BADGE.DRAFT;
                const StatusIcon = statusConfig.icon;
                const categoryInfo = PROCEDURE_CATEGORIES.find(c => c.id === procedure.category);

                return (
                  <Card key={procedure.id} className="hover:border-teal-300 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{procedure.title}</h3>
                            <p className="text-sm text-slate-500">
                              {categoryInfo?.label || procedure.category}
                              {currentVersion && ` • v${currentVersion.versionLabel}`}
                            </p>
                          </div>
                        </div>
                        {currentVersion && (
                          <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {currentVersion.status}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                        {procedure.description}
                      </p>

                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewProcedure(procedure)}>
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {currentVersion?.status === 'DRAFT' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => handleApproveProcedureVersion(currentVersion.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteProcedure(procedure.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Production Procedures Tab (Task Templates) */}
        <TabsContent value="production-procedures" className="space-y-4 mt-4">
          <ProductionProceduresTab />
        </TabsContent>

        {/* Boat Models Tab */}
        <TabsContent value="boat-models" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Boat model specifications with version history
            </p>
            <Button onClick={handleOpenCreateBoatModel}>
              <Plus className="h-4 w-4 mr-2" />
              New Model
            </Button>
          </div>

          {isLoadingModels ? (
            <div className="text-center py-8 text-slate-500">Loading boat models...</div>
          ) : boatModels.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Ship className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No boat models yet</p>
              <Button variant="outline" className="mt-4" onClick={handleOpenCreateBoatModel}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Model
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {boatModels.map((model) => {
                const versions = boatModelVersions[model.id] || [];
                const currentVer = versions.find((v) => v.id === model.currentVersionId) || versions[0];
                const statusConfig = STATUS_BADGE[currentVer?.status || 'DRAFT'];
                const StatusIcon = statusConfig.icon;

                return (
                  <Card
                    key={model.id}
                    className={`cursor-pointer transition-all ${
                      selectedModel === model.id ? 'ring-2 ring-teal-500' : 'hover:border-teal-300'
                    }`}
                    onClick={() => setSelectedModel(selectedModel === model.id ? null : model.id)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Ship className="h-6 w-6 text-teal-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{model.name}</h3>
                            <p className="text-sm text-slate-500">{model.range} Range</p>
                          </div>
                        </div>
                        {currentVer && (
                          <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            v{currentVer.versionLabel}
                          </Badge>
                        )}
                      </div>

                      {currentVer && (
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Length</p>
                            <p className="font-medium">{currentVer.lengthM}m</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Beam</p>
                            <p className="font-medium">{currentVer.beamM}m</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Base Price</p>
                            <p className="font-medium">{formatCurrency(currentVer.basePrice)}</p>
                          </div>
                        </div>
                      )}

                      {selectedModel === model.id && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs text-slate-500 mb-2">VERSION HISTORY</p>
                          <div className="space-y-2">
                            {versions.map((ver) => {
                              const verStatus = STATUS_BADGE[ver.status];
                              const VerIcon = verStatus.icon;
                              return (
                                <div
                                  key={ver.id}
                                  className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={`${verStatus.bg} ${verStatus.text} border-0 text-xs`}
                                    >
                                      <VerIcon className="h-3 w-3 mr-1" />
                                      {ver.status}
                                    </Badge>
                                    <span className="font-mono">v{ver.versionLabel}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">
                                      {formatCurrency(ver.basePrice)}
                                    </span>
                                    {ver.status === 'DRAFT' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-green-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApproveBoatModelVersion(ver.id);
                                        }}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditBoatModel(model);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNewBoatModelVersion(model);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              New Version
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveBoatModel(model.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Equipment Catalog Tab (DEPRECATED) */}
        <TabsContent value="catalogs" className="space-y-4 mt-4">
          {/* Deprecation Warning */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Legacy Equipment Catalog (Deprecated)</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This catalog is deprecated. Use <strong>Articles</strong> and <strong>Kits</strong> for new items.
                    Legacy items can still be used in existing projects but are not recommended for new configurations.
                  </p>
                  <p className="text-xs text-amber-600 mt-2">
                    Legacy items do not support versioning, cost tracking, or BOM explosion. Consider migrating to Articles.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Input
                placeholder="Search by name or article number..."
                value={equipmentSearchQuery}
                onChange={(e) => setEquipmentSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select value={equipmentCategoryFilter} onValueChange={setEquipmentCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EQUIPMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleOpenCreateEquipment}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {isLoadingEquipment ? (
            <div className="text-center py-8 text-slate-500">Loading equipment catalog...</div>
          ) : filteredEquipment.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>{equipmentSearchQuery || equipmentCategoryFilter !== 'all' ? 'No items match your search' : 'No equipment items yet'}</p>
              {!equipmentSearchQuery && equipmentCategoryFilter === 'all' && (
                <Button variant="outline" className="mt-4" onClick={handleOpenCreateEquipment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">List Price</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipment.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.articleNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-slate-500 truncate max-w-xs">{item.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{item.supplier || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.listPriceExclVat)}</TableCell>
                        <TableCell className="text-right text-slate-600">
                          {item.costPrice ? formatCurrency(item.costPrice) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {item.ceRelevant && (
                              <Badge variant="outline" className="text-xs">CE</Badge>
                            )}
                            {item.safetyCritical && (
                              <Badge variant="outline" className="text-xs border-red-300 text-red-600">Safety</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEditEquipment(item)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600"
                              onClick={() => handleArchiveEquipment(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-slate-500 text-center">
            {filteredEquipment.length} items {equipmentCategoryFilter !== 'all' && `in ${equipmentCategoryFilter}`}
          </p>
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a new document template with default content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Template Type</Label>
              <Select value={newTemplateType} onValueChange={(v) => setNewTemplateType(v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((dt) => (
                    <SelectItem key={dt.type} value={dt.type}>
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template Name</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g. CE Declaration for Sport Range"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={!newTemplateName}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      <TemplateEditorDialog
        open={showEditorDialog}
        onOpenChange={setShowEditorDialog}
        template={selectedTemplate}
        version={selectedVersion}
        onSave={loadTemplates}
      />

      {/* Create Procedure Dialog */}
      <Dialog open={showCreateProcedureDialog} onOpenChange={setShowCreateProcedureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Procedure</DialogTitle>
            <DialogDescription>
              Create an operating procedure for boat operation, safety, or maintenance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={newProcedureCategory} onValueChange={setNewProcedureCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCEDURE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={newProcedureTitle}
                  onChange={(e) => setNewProcedureTitle(e.target.value)}
                  placeholder="e.g. Pre-Departure Checklist"
                />
              </div>
            </div>
            <div>
              <Label>Content (Markdown)</Label>
              <textarea
                value={newProcedureContent}
                onChange={(e) => setNewProcedureContent(e.target.value)}
                placeholder="# Procedure Title&#10;&#10;## Section 1&#10;- [ ] Checklist item&#10;- [ ] Another item"
                className="w-full h-64 p-3 border rounded-lg font-mono text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateProcedureDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateProcedure}
              disabled={!newProcedureTitle || !newProcedureContent}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Create Procedure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Procedure Dialog */}
      <Dialog open={showProcedureViewDialog} onOpenChange={setShowProcedureViewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-600" />
              {selectedProcedure?.title}
            </DialogTitle>
            <DialogDescription>
              {PROCEDURE_CATEGORIES.find(c => c.id === selectedProcedure?.category)?.label}
              {selectedProcedureVersion && ` • v${selectedProcedureVersion.versionLabel}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedProcedureVersion && (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: ProcedureService.renderProcedureContent(selectedProcedureVersion.content),
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcedureViewDialog(false)}>
              Close
            </Button>
            {selectedProcedureVersion?.status === 'DRAFT' && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (selectedProcedureVersion) {
                    handleApproveProcedureVersion(selectedProcedureVersion.id);
                    setShowProcedureViewDialog(false);
                  }
                }}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve Version
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Boat Model Dialog */}
      <BoatModelDialog
        open={showBoatModelDialog}
        onOpenChange={setShowBoatModelDialog}
        model={selectedBoatModel}
        currentVersion={selectedBoatModelVersion}
        mode={boatModelDialogMode}
        onSave={handleCreateBoatModel}
        onUpdate={handleUpdateBoatModel}
        onCreateVersion={handleCreateBoatModelVersion}
      />

      {/* Equipment Dialog */}
      <EquipmentDialog
        open={showEquipmentDialog}
        onOpenChange={setShowEquipmentDialog}
        item={selectedEquipmentItem}
        onSave={handleCreateEquipment}
        onUpdate={handleUpdateEquipment}
      />

      {/* Article Dialog */}
      <ArticleDialog
        open={showArticleDialog}
        onOpenChange={setShowArticleDialog}
        mode={articleDialogMode}
        article={selectedArticle}
        version={selectedArticleVersion}
        onSaved={loadArticlesAndKits}
      />

      {/* Kit Dialog */}
      <KitDialog
        open={showKitDialog}
        onOpenChange={setShowKitDialog}
        mode={kitDialogMode}
        kit={selectedKit}
        version={selectedKitVersion}
        onSaved={loadArticlesAndKits}
      />
    </div>
  );
}
