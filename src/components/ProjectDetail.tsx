'use client';

import React, { useState } from 'react';
import {
  Ship, FileText, Package, Clock, CheckSquare, Settings, ChevronRight,
  Calendar, Euro, User, MapPin, Anchor, Battery, Zap, Shield, AlertTriangle,
  Download, Eye, Plus, Edit, Trash2, Play, Pause, Check, X, MoreHorizontal,
  History, FileCheck, Truck, ClipboardList, Timer, Camera, Receipt
} from 'lucide-react';
import { useStoreV3, useProject, useProjectDocuments } from '@/lib/store-v3';
import { ProjectQuotationGenerator } from './ProjectQuotationGenerator';
import { ProjectBOMGenerator } from './ProjectBOMGenerator';
import type {
  Project, ProjectDocument, EquipmentItem, ProductionStage,
  ProjectTask, ChecklistItem, DocumentType
} from '@/lib/types-v3';
import { PROJECT_STATUS_CONFIG } from '@/lib/types-v3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface ProjectDetailProps {
  projectId: string;
  onBack?: () => void;
}

// Helper to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

// Helper to format date
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Helper to format datetime
function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const { project, client, model } = useProject(projectId);
  const {
    updateProject, updateProjectStatus, updateChecklistItem,
    addDocument, updateProductionStage, addTask, updateTask
  } = useStoreV3();

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [isBOMOpen, setIsBOMOpen] = useState(false);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Project not found</h2>
          <p className="text-slate-600 mt-2">This project does not exist or has been deleted.</p>
          {onBack && (
            <Button onClick={onBack} className="mt-4">
              Back to overview
            </Button>
          )}
        </div>
      </div>
    );
  }

  const statusConfig = PROJECT_STATUS_CONFIG[project.status];

  // Calculate production progress
  const productionProgress = project.production
    ? Math.round((project.production.stages.filter(s => s.status === 'COMPLETED').length / project.production.stages.length) * 100)
    : 0;

  // Calculate checklist progress
  const checklistProgress = project.delivery
    ? Math.round((project.delivery.checklist.filter(c => c.isCompleted).length / project.delivery.checklist.length) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                {statusConfig.labelNL}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
              <span className="font-mono">{project.projectNumber}</span>
              <span>•</span>
              <span>{client?.name || 'No client'}</span>
              <span>•</span>
              <span>{model?.name || 'Custom'}</span>
              {project.boatIdentity.hullId && (
                <>
                  <span>•</span>
                  <span className="font-mono">HIN: {project.boatIdentity.hullId}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Generate Quotation Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQuotationOpen(true)}
            className="gap-2"
          >
            <Receipt className="w-4 h-4" />
            Quotation
          </Button>

          {/* BOM Generator Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBOMOpen(true)}
            className="gap-2"
          >
            <Package className="w-4 h-4" />
            BOM
          </Button>

          {/* Status actions based on current status */}
          {statusConfig.nextStatuses.length > 0 && (
            <div className="flex gap-2">
              {statusConfig.nextStatuses.slice(0, 2).map(nextStatus => (
                <Button
                  key={nextStatus}
                  variant="outline"
                  size="sm"
                  onClick={() => updateProjectStatus(projectId, nextStatus)}
                >
                  → {PROJECT_STATUS_CONFIG[nextStatus].labelNL}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Euro className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total incl. VAT</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(project.equipment.totalInclVat)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Equipment Items</p>
                <p className="text-lg font-bold text-slate-900">
                  {project.equipment.items.filter(i => i.isIncluded).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Documents</p>
                <p className="text-lg font-bold text-slate-900">
                  {project.documents.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Hours Worked</p>
                <p className="text-lg font-bold text-slate-900">
                  {project.production?.totalHoursWorked.toFixed(1) || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview" className="gap-2">
            <Ship className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2">
            <Package className="w-4 h-4" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="production" className="gap-2">
            <Settings className="w-4 h-4" />
            Production
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2">
            <CheckSquare className="w-4 h-4" />
            Checklist
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Boat Identity */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Anchor className="w-5 h-5 text-teal-600" />
                    Boat Identity
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingIdentity(true)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Hull ID (HIN)</p>
                    <p className="font-medium">{project.boatIdentity.hullId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Boat Name</p>
                    <p className="font-medium">{project.boatIdentity.boatName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Registration</p>
                    <p className="font-medium">{project.boatIdentity.registrationNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Home Port</p>
                    <p className="font-medium">{project.boatIdentity.homePort || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Year Built</p>
                    <p className="font-medium">{project.boatIdentity.yearBuilt || new Date().getFullYear()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Engine Hours</p>
                    <p className="font-medium">{project.boatIdentity.engineHours || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Specification (Auto-derived) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ship className="w-5 h-5 text-blue-600" />
                  Specification
                  <Badge variant="outline" className="ml-2 text-xs">Auto-calculated</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dimensions */}
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Dimensions</p>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="text-slate-500 text-xs">Length</p>
                      <p className="font-bold">{project.specification.lengthM}m</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="text-slate-500 text-xs">Beam</p>
                      <p className="font-bold">{project.specification.beamM}m</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="text-slate-500 text-xs">Draft</p>
                      <p className="font-bold">{project.specification.draftM}m</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="text-slate-500 text-xs">Weight</p>
                      <p className="font-bold">{project.specification.weightKg}kg</p>
                    </div>
                  </div>
                </div>

                {/* Propulsion */}
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Propulsion</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      <span>{project.specification.propulsionType}</span>
                    </div>
                    {project.specification.propulsion.batteryCapacityKwh && (
                      <div className="flex items-center gap-2">
                        <Battery className="w-4 h-4 text-blue-500" />
                        <span>{project.specification.propulsion.batteryCapacityKwh} kWh</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CE & Safety */}
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">CE & Safety</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Cat. {project.specification.designCategory}</Badge>
                    <Badge variant="outline">{project.specification.maxPersons} persons</Badge>
                    {project.specification.safety.navigationLights && (
                      <Badge variant="outline" className="bg-green-50">Nav. Lichten</Badge>
                    )}
                    {project.specification.safety.vhfRadio && (
                      <Badge variant="outline" className="bg-green-50">VHF</Badge>
                    )}
                    <Badge variant="outline" className="bg-green-50">
                      {project.specification.safety.fireExtinguishers}x Brandblusser
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-lg">{client.name}</p>
                    {client.email && <p className="text-slate-600">{client.email}</p>}
                    {client.phone && <p className="text-slate-600">{client.phone}</p>}
                    {client.street && (
                      <p className="text-slate-600">
                        {client.street}, {client.postalCode} {client.city}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500">No client linked</p>
                )}
              </CardContent>
            </Card>

            {/* Progress Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-orange-600" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Production</span>
                    <span className="font-medium">{productionProgress}%</span>
                  </div>
                  <Progress value={productionProgress} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Delivery Checklist</span>
                    <span className="font-medium">{checklistProgress}%</span>
                  </div>
                  <Progress value={checklistProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Documents */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-600" />
                  Recent Documents
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('documents')}>
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {project.documents.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No documents yet</p>
              ) : (
                <div className="space-y-2">
                  {project.documents.slice(0, 5).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-sm">{doc.title}</p>
                          <p className="text-xs text-slate-500">
                            {doc.type} • v{doc.version} • {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Equipment List</CardTitle>
                  <CardDescription>
                    Version {project.equipment.version} •
                    {project.equipment.status === 'FROZEN'
                      ? ` Frozen on ${formatDate(project.equipment.frozenAt)}`
                      : ' Draft'
                    }
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBOMOpen(true)}
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Export BOM
                  </Button>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                  {project.equipment.status === 'DRAFT' && (
                    <Button variant="outline" size="sm" className="text-orange-600">
                      <Lock className="w-4 h-4 mr-2" />
                      Freeze
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.equipment.items.filter(i => i.isIncluded).map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-slate-500">{item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{item.category}</TableCell>
                      <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.unitPriceExclVat)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(item.lineTotalExclVat)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.isStandard ? 'default' : 'outline'} className="text-xs">
                          {item.isStandard ? 'Std' : 'Opt'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="mt-6 border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal excl. VAT</span>
                      <span className="font-mono">{formatCurrency(project.equipment.subtotalExclVat)}</span>
                    </div>
                    {project.equipment.discountAmount && project.equipment.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({project.equipment.discountPercent}%)</span>
                        <span className="font-mono">-{formatCurrency(project.equipment.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>BTW ({project.equipment.vatRate}%)</span>
                      <span className="font-mono">{formatCurrency(project.equipment.vatAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total incl. VAT</span>
                      <span className="font-mono text-emerald-600">
                        {formatCurrency(project.equipment.totalInclVat)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          {/* Quick Actions for Documents */}
          <div className="flex gap-3">
            <Button
              onClick={() => setIsQuotationOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <Receipt className="w-4 h-4" />
              New Quotation
            </Button>
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Document
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Document Archive</CardTitle>
                <Badge variant="outline">
                  {project.documents.length} document{project.documents.length !== 1 ? 'en' : ''}
                </Badge>
              </div>
              <CardDescription>
                Complete history of all project documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.documents.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No documents yet</p>
                  <p className="text-sm">Maak een offerte of voeg documenten toe</p>
                  <Button
                    onClick={() => setIsQuotationOpen(true)}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Create First Quotation
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Group by type */}
                  {(['QUOTATION', 'BOM', 'OWNERS_MANUAL', 'CE_DECLARATION', 'OTHER'] as DocumentType[]).map(type => {
                    const docs = project.documents.filter(d => d.type === type);
                    if (docs.length === 0) return null;

                    const typeLabels: Record<DocumentType, string> = {
                      QUOTATION: 'Quotations',
                      BOM: 'Bill of Materials (BOM)',
                      OWNERS_MANUAL: "Owner's Manual",
                      CE_DECLARATION: 'CE Declaraties',
                      TECHNICAL_FILE: 'Technische Dossiers',
                      INVOICE: 'Facturen',
                      DELIVERY_NOTE: 'Afleveringsbonnen',
                      TEST_REPORT: 'Testrapporten',
                      PHOTO: "Foto's",
                      OTHER: 'Overig',
                    };

                    return (
                      <div key={type} className="border rounded-lg p-4">
                        <h3 className="font-medium text-slate-900 mb-3">{typeLabels[type]} ({docs.length})</h3>
                        <div className="space-y-2">
                          {docs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                              <div className="flex items-center gap-3">
                                <FileCheck className="w-5 h-5 text-slate-400" />
                                <div>
                                  <p className="font-medium text-sm">{doc.title}</p>
                                  <p className="text-xs text-slate-500">
                                    v{doc.version} • {doc.createdByName} • {formatDateTime(doc.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    doc.status === 'FINAL' ? 'bg-green-50 text-green-700' :
                                    doc.status === 'SUPERSEDED' ? 'bg-slate-100 text-slate-500' :
                                    ''
                                  }`}
                                >
                                  {doc.status}
                                </Badge>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Production Tab */}
        <TabsContent value="production" className="space-y-4">
          {project.production ? (
            <>
              {/* Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Production Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {project.production.stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            stage.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                            stage.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white' :
                            'bg-slate-200 text-slate-500'
                          }`}>
                            {stage.status === 'COMPLETED' ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <span className="text-sm font-medium">{stage.order}</span>
                            )}
                          </div>
                          {index < project.production!.stages.length - 1 && (
                            <div className={`w-0.5 h-12 ${
                              stage.status === 'COMPLETED' ? 'bg-green-500' : 'bg-slate-200'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{stage.nameNL}</p>
                              <p className="text-sm text-slate-500">{stage.name}</p>
                            </div>
                            <Badge variant="outline" className={
                              stage.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                              stage.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                              ''
                            }>
                              {stage.status === 'COMPLETED' ? 'Completed' :
                               stage.status === 'IN_PROGRESS' ? 'In Progress' :
                               stage.status === 'SKIPPED' ? 'Skipped' : 'Planned'}
                            </Badge>
                          </div>
                          {stage.actualStart && (
                            <p className="text-xs text-slate-500 mt-1">
                              {formatDate(stage.actualStart)} - {stage.actualEnd ? formatDate(stage.actualEnd) : 'heden'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tasks */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Tasks</CardTitle>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.production.tasks.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No tasks yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Deadline</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {project.production.tasks.map(task => (
                          <TableRow key={task.id}>
                            <TableCell>
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-slate-500">{task.description}</p>
                              )}
                            </TableCell>
                            <TableCell>{task.assignedToName || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                task.status === 'DONE' ? 'bg-green-50 text-green-700' :
                                task.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                                task.status === 'BLOCKED' ? 'bg-red-50 text-red-700' :
                                ''
                              }>
                                {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(task.dueDate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Time Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Timer className="w-5 h-5 text-orange-600" />
                    Time Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-slate-900">
                        {project.production.totalHoursWorked.toFixed(1)}
                      </p>
                      <p className="text-sm text-slate-600">Total hours</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {project.production.totalHoursBillable.toFixed(1)}
                      </p>
                      <p className="text-sm text-slate-600">Billable</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-slate-900">
                        {project.production.timeEntries.length}
                      </p>
                      <p className="text-sm text-slate-600">Entries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">No production data for this project type</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4">
          {project.delivery ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Delivery Checklist</CardTitle>
                    <CardDescription>
                      {project.delivery.checklist.filter(c => c.isCompleted).length} of {project.delivery.checklist.length} items completed
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={checklistProgress} className="w-32 h-2" />
                    <span className="text-sm font-medium">{checklistProgress}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Group by category */}
                {['Safety', 'Documentation', 'Systems', 'Quality', 'Handover'].map(category => {
                  const items = project.delivery!.checklist.filter(c => c.category === category);
                  if (items.length === 0) return null;

                  const categoryLabels: Record<string, string> = {
                    Safety: 'Safety',
                    Documentation: 'Documentation',
                    Systems: 'Systems',
                    Quality: 'Quality',
                    Handover: 'Handover',
                  };

                  return (
                    <div key={category} className="mb-6 last:mb-0">
                      <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                        {category === 'Safety' && <Shield className="w-4 h-4 text-red-500" />}
                        {category === 'Documentation' && <FileText className="w-4 h-4 text-blue-500" />}
                        {category === 'Systems' && <Settings className="w-4 h-4 text-purple-500" />}
                        {category === 'Quality' && <CheckSquare className="w-4 h-4 text-yellow-500" />}
                        {category === 'Handover' && <Truck className="w-4 h-4 text-green-500" />}
                        {categoryLabels[category]}
                      </h3>
                      <div className="space-y-2">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              item.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                            }`}
                          >
                            <Checkbox
                              checked={item.isCompleted}
                              onCheckedChange={(checked) => {
                                updateChecklistItem(projectId, item.id, {
                                  isCompleted: !!checked,
                                  completedAt: checked ? new Date().toISOString() : undefined,
                                  completedById: checked ? 'current-user' : undefined,
                                  completedByName: checked ? 'Current User' : undefined,
                                });
                              }}
                            />
                            <div className="flex-1">
                              <p className={`text-sm ${item.isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {item.description}
                              </p>
                              {item.isCompleted && item.completedByName && (
                                <p className="text-xs text-slate-400">
                                  {item.completedByName} • {formatDateTime(item.completedAt)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {item.isRequired && (
                                <Badge variant="outline" className="text-xs">Required</Badge>
                              )}
                              {item.requiresPhoto && (
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Camera className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Sign-off section */}
                {checklistProgress === 100 && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900">Sign Off</h3>
                        <p className="text-sm text-slate-600">All required items are completed</p>
                      </div>
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4 mr-2" />
                        Sign Off Project
                        </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">No checklist data for this project</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Identity Dialog */}
      <Dialog open={isEditingIdentity} onOpenChange={setIsEditingIdentity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Boat Identity</DialogTitle>
          </DialogHeader>
          <EditIdentityForm
            project={project}
            onSave={(identity) => {
              updateProject(projectId, { boatIdentity: identity });
              setIsEditingIdentity(false);
            }}
            onCancel={() => setIsEditingIdentity(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Quotation Generator */}
      <ProjectQuotationGenerator
        projectId={projectId}
        isOpen={isQuotationOpen}
        onClose={() => setIsQuotationOpen(false)}
        onSaved={(docId) => {
          setIsQuotationOpen(false);
          // Switch to documents tab to show the new quotation
          setActiveTab('documents');
        }}
      />

      {/* BOM Generator */}
      <ProjectBOMGenerator
        projectId={projectId}
        isOpen={isBOMOpen}
        onClose={() => setIsBOMOpen(false)}
      />
    </div>
  );
}

// Edit Identity Form Component
function EditIdentityForm({
  project,
  onSave,
  onCancel
}: {
  project: Project;
  onSave: (identity: Project['boatIdentity']) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(project.boatIdentity);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Hull ID (HIN)</Label>
          <Input
            value={formData.hullId || ''}
            onChange={(e) => setFormData({ ...formData, hullId: e.target.value })}
            placeholder="NL-ABC12345D678"
          />
        </div>
        <div>
          <Label>Boot Naam</Label>
          <Input
            value={formData.boatName || ''}
            onChange={(e) => setFormData({ ...formData, boatName: e.target.value })}
            placeholder="Name of the boat"
          />
        </div>
        <div>
          <Label>Registratienummer</Label>
          <Input
            value={formData.registrationNumber || ''}
            onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
          />
        </div>
        <div>
          <Label>Thuishaven</Label>
          <Input
            value={formData.homePort || ''}
            onChange={(e) => setFormData({ ...formData, homePort: e.target.value })}
          />
        </div>
        <div>
          <Label>Bouwjaar</Label>
          <Input
            type="number"
            value={formData.yearBuilt || new Date().getFullYear()}
            onChange={(e) => setFormData({ ...formData, yearBuilt: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label>Motor Uren</Label>
          <Input
            type="number"
            value={formData.engineHours || 0}
            onChange={(e) => setFormData({ ...formData, engineHours: parseInt(e.target.value) })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(formData)}>Save</Button>
      </DialogFooter>
    </div>
  );
}

// Missing Lock icon
function Lock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default ProjectDetail;
