'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Building2,
  Percent,
  CreditCard,
  Truck,
  Save,
  Plus,
  Trash2,
  Star,
  Edit2,
  Check,
  X,
  Calculator,
  AlertTriangle,
  Download,
  Upload,
  FileArchive,
  FolderOpen,
  Users,
  Database,
  FileText,
  History,
  Loader2,
  CheckCircle,
  XCircle,
  Lock,
} from 'lucide-react';
import {
  SettingsService,
  type AppSettings,
  type CompanyInfo,
  type VATSettings,
  type CostEstimationSettings,
  type PaymentTerms,
  type DeliveryTerms,
} from '@/domain/services/SettingsService';
import {
  ExportImportService,
  type ExportOptions,
  type ImportOptions,
  type ExportData,
  type ImportPreview,
  type ImportResult,
} from '@/domain/services/ExportImportService';
import { AuthService } from '@/domain/services/AuthService';
import { useAuth } from '@/v4/state/useAuth';
import type { User, UserRole } from '@/domain/models';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/domain/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

export function SettingsScreen() {
  const { can } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');

  // Edit states
  const [editingCompany, setEditingCompany] = useState<CompanyInfo | null>(null);
  const [editingVat, setEditingVat] = useState<VATSettings | null>(null);

  // Term dialogs
  const [showPaymentTermDialog, setShowPaymentTermDialog] = useState(false);
  const [showDeliveryTermDialog, setShowDeliveryTermDialog] = useState(false);
  const [editingPaymentTerm, setEditingPaymentTerm] = useState<PaymentTerms | null>(null);
  const [editingDeliveryTerm, setEditingDeliveryTerm] = useState<DeliveryTerms | null>(null);

  // New term form
  const [newPaymentTerm, setNewPaymentTerm] = useState({ name: '', description: '', isDefault: false });
  const [newDeliveryTerm, setNewDeliveryTerm] = useState({ name: '', description: '', estimatedWeeks: undefined as number | undefined, isDefault: false });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    try {
      const data = await SettingsService.getSettings();
      setSettings(data);
      setEditingCompany(data.company);
      setEditingVat(data.vat);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveCompany() {
    if (!editingCompany) return;

    setIsSaving(true);
    try {
      const result = await SettingsService.updateCompany(editingCompany);
      if (result.ok) {
        setSettings(result.value);
      }
    } catch (error) {
      console.error('Failed to save company info:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveVat() {
    if (!editingVat) return;

    setIsSaving(true);
    try {
      const result = await SettingsService.updateVAT(editingVat);
      if (result.ok) {
        setSettings(result.value);
      }
    } catch (error) {
      console.error('Failed to save VAT settings:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddPaymentTerm() {
    if (!newPaymentTerm.name.trim()) return;

    setIsSaving(true);
    try {
      const result = await SettingsService.addPaymentTerm({
        name: newPaymentTerm.name,
        description: newPaymentTerm.description,
        isDefault: newPaymentTerm.isDefault,
      });

      if (result.ok) {
        await loadSettings();
        setNewPaymentTerm({ name: '', description: '', isDefault: false });
        setShowPaymentTermDialog(false);
      }
    } catch (error) {
      console.error('Failed to add payment term:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdatePaymentTerm() {
    if (!editingPaymentTerm) return;

    setIsSaving(true);
    try {
      const result = await SettingsService.updatePaymentTerm(editingPaymentTerm.id, {
        name: editingPaymentTerm.name,
        description: editingPaymentTerm.description,
        isDefault: editingPaymentTerm.isDefault,
      });

      if (result.ok) {
        await loadSettings();
        setEditingPaymentTerm(null);
      }
    } catch (error) {
      console.error('Failed to update payment term:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePaymentTerm(id: string) {
    if (!confirm('Are you sure you want to delete this payment term?')) return;

    setIsSaving(true);
    try {
      const result = await SettingsService.deletePaymentTerm(id);
      if (result.ok) {
        await loadSettings();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to delete payment term:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetDefaultPaymentTerm(id: string) {
    setIsSaving(true);
    try {
      const result = await SettingsService.updatePaymentTerm(id, { isDefault: true });
      if (result.ok) {
        await loadSettings();
      }
    } catch (error) {
      console.error('Failed to set default payment term:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddDeliveryTerm() {
    if (!newDeliveryTerm.name.trim()) return;

    setIsSaving(true);
    try {
      const result = await SettingsService.addDeliveryTerm({
        name: newDeliveryTerm.name,
        description: newDeliveryTerm.description,
        estimatedWeeks: newDeliveryTerm.estimatedWeeks,
        isDefault: newDeliveryTerm.isDefault,
      });

      if (result.ok) {
        await loadSettings();
        setNewDeliveryTerm({ name: '', description: '', estimatedWeeks: undefined, isDefault: false });
        setShowDeliveryTermDialog(false);
      }
    } catch (error) {
      console.error('Failed to add delivery term:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateDeliveryTerm() {
    if (!editingDeliveryTerm) return;

    setIsSaving(true);
    try {
      const result = await SettingsService.updateDeliveryTerm(editingDeliveryTerm.id, {
        name: editingDeliveryTerm.name,
        description: editingDeliveryTerm.description,
        estimatedWeeks: editingDeliveryTerm.estimatedWeeks,
        isDefault: editingDeliveryTerm.isDefault,
      });

      if (result.ok) {
        await loadSettings();
        setEditingDeliveryTerm(null);
      }
    } catch (error) {
      console.error('Failed to update delivery term:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDeliveryTerm(id: string) {
    if (!confirm('Are you sure you want to delete this delivery term?')) return;

    setIsSaving(true);
    try {
      const result = await SettingsService.deleteDeliveryTerm(id);
      if (result.ok) {
        await loadSettings();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to delete delivery term:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetDefaultDeliveryTerm(id: string) {
    setIsSaving(true);
    try {
      const result = await SettingsService.updateDeliveryTerm(id, { isDefault: true });
      if (result.ok) {
        await loadSettings();
      }
    } catch (error) {
      console.error('Failed to set default delivery term:', error);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500">Loading settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-red-500">Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-teal-600" />
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="vat" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            VAT
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Terms
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Delivery Terms
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Cost Estimation
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <FileArchive className="h-4 w-4" />
            Import/Export
          </TabsTrigger>
          {can('user:read') && (
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          )}
        </TabsList>

        {/* Company Info Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                This information appears on quotes, invoices, and other documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingCompany && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Company Name</Label>
                    <Input
                      value={editingCompany.name}
                      onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Legal Name</Label>
                    <Input
                      value={editingCompany.legalName || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, legalName: e.target.value })}
                      placeholder="e.g. Company Name B.V."
                    />
                  </div>
                  <div>
                    <Label>Street Address</Label>
                    <Input
                      value={editingCompany.street}
                      onChange={(e) => setEditingCompany({ ...editingCompany, street: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Postal Code</Label>
                      <Input
                        value={editingCompany.postalCode}
                        onChange={(e) => setEditingCompany({ ...editingCompany, postalCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        value={editingCompany.city}
                        onChange={(e) => setEditingCompany({ ...editingCompany, city: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input
                      value={editingCompany.country}
                      onChange={(e) => setEditingCompany({ ...editingCompany, country: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={editingCompany.phone}
                      onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editingCompany.email}
                      onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={editingCompany.website || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, website: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>VAT Number</Label>
                    <Input
                      value={editingCompany.vatNumber}
                      onChange={(e) => setEditingCompany({ ...editingCompany, vatNumber: e.target.value })}
                      placeholder="e.g. NL123456789B01"
                    />
                  </div>
                  <div>
                    <Label>Chamber of Commerce (KvK)</Label>
                    <Input
                      value={editingCompany.chamberOfCommerce}
                      onChange={(e) => setEditingCompany({ ...editingCompany, chamberOfCommerce: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>IBAN</Label>
                    <Input
                      value={editingCompany.iban || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, iban: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>BIC/SWIFT</Label>
                    <Input
                      value={editingCompany.bic || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, bic: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveCompany} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VAT Tab */}
        <TabsContent value="vat">
          <Card>
            <CardHeader>
              <CardTitle>VAT Settings</CardTitle>
              <CardDescription>
                Configure default VAT rates for quotes and invoices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingVat && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Default VAT Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editingVat.defaultRate}
                      onChange={(e) => setEditingVat({ ...editingVat, defaultRate: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Standard rate for most goods and services
                    </p>
                  </div>
                  <div>
                    <Label>Reduced VAT Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editingVat.reducedRate}
                      onChange={(e) => setEditingVat({ ...editingVat, reducedRate: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Lower rate for specific categories
                    </p>
                  </div>
                  <div>
                    <Label>Allow Zero Rate</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        checked={editingVat.zeroRate}
                        onCheckedChange={(checked) => setEditingVat({ ...editingVat, zeroRate: checked })}
                      />
                      <span className="text-sm text-slate-600">
                        {editingVat.zeroRate ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      For export and exempt transactions
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveVat} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Terms Tab */}
        <TabsContent value="payment">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Terms</CardTitle>
                <CardDescription>
                  Manage payment term options for quotes.
                </CardDescription>
              </div>
              <Button onClick={() => setShowPaymentTermDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Term
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {settings.paymentTerms.map((term) => (
                  <div
                    key={term.id}
                    className={`p-4 border rounded-lg ${
                      term.isDefault ? 'border-teal-500 bg-teal-50' : 'border-slate-200'
                    }`}
                  >
                    {editingPaymentTerm?.id === term.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={editingPaymentTerm.name}
                            onChange={(e) => setEditingPaymentTerm({ ...editingPaymentTerm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={editingPaymentTerm.description}
                            onChange={(e) => setEditingPaymentTerm({ ...editingPaymentTerm, description: e.target.value })}
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingPaymentTerm(null)}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleUpdatePaymentTerm} disabled={isSaving}>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{term.name}</p>
                            {term.isDefault && (
                              <Badge className="bg-teal-100 text-teal-700">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{term.description}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!term.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefaultPaymentTerm(term.id)}
                              title="Set as default"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPaymentTerm(term)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePaymentTerm(term.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Terms Tab */}
        <TabsContent value="delivery">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Delivery Terms</CardTitle>
                <CardDescription>
                  Manage delivery term options for quotes.
                </CardDescription>
              </div>
              <Button onClick={() => setShowDeliveryTermDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Term
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {settings.deliveryTerms.map((term) => (
                  <div
                    key={term.id}
                    className={`p-4 border rounded-lg ${
                      term.isDefault ? 'border-teal-500 bg-teal-50' : 'border-slate-200'
                    }`}
                  >
                    {editingDeliveryTerm?.id === term.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={editingDeliveryTerm.name}
                            onChange={(e) => setEditingDeliveryTerm({ ...editingDeliveryTerm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={editingDeliveryTerm.description}
                            onChange={(e) => setEditingDeliveryTerm({ ...editingDeliveryTerm, description: e.target.value })}
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Estimated Weeks (optional)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={editingDeliveryTerm.estimatedWeeks || ''}
                            onChange={(e) => setEditingDeliveryTerm({
                              ...editingDeliveryTerm,
                              estimatedWeeks: e.target.value ? parseInt(e.target.value) : undefined,
                            })}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingDeliveryTerm(null)}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleUpdateDeliveryTerm} disabled={isSaving}>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{term.name}</p>
                            {term.isDefault && (
                              <Badge className="bg-teal-100 text-teal-700">Default</Badge>
                            )}
                            {term.estimatedWeeks && (
                              <Badge variant="outline">{term.estimatedWeeks} weeks</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{term.description}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!term.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefaultDeliveryTerm(term.id)}
                              title="Set as default"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingDeliveryTerm(term)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDeliveryTerm(term.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Estimation Tab */}
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-teal-600" />
                Cost Estimation Settings
              </CardTitle>
              <CardDescription>
                Configure how costs are estimated when actual cost prices are not available.
                These settings affect BOM generation and margin calculations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default Ratio */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Default Estimation Ratio</Label>
                  <p className="text-sm text-slate-500 mt-1">
                    When an article or kit does not have a cost price defined, the cost will be estimated as this percentage of the sell price.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round((settings.costEstimation?.defaultRatio || 0.6) * 100)}
                    onChange={(e) => {
                      const ratio = Math.min(100, Math.max(0, parseInt(e.target.value) || 60)) / 100;
                      SettingsService.updateCostEstimation({ defaultRatio: ratio });
                      setSettings({
                        ...settings,
                        costEstimation: {
                          ...settings.costEstimation,
                          defaultRatio: ratio,
                          warnThreshold: settings.costEstimation?.warnThreshold || 0.3,
                        },
                      });
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-slate-600">% of sell price</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">
                    Example: An article priced at €1,000 with no cost price will have an estimated cost of{' '}
                    <strong>€{Math.round(1000 * (settings.costEstimation?.defaultRatio || 0.6)).toLocaleString()}</strong>
                  </p>
                </div>
              </div>

              {/* Warning Threshold */}
              <div className="border-t pt-6 space-y-4">
                <div>
                  <Label className="text-base font-medium">Estimation Warning Threshold</Label>
                  <p className="text-sm text-slate-500 mt-1">
                    Show a warning in BOM reports when estimated costs exceed this percentage of the total BOM value.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round((settings.costEstimation?.warnThreshold || 0.3) * 100)}
                    onChange={(e) => {
                      const threshold = Math.min(100, Math.max(0, parseInt(e.target.value) || 30)) / 100;
                      SettingsService.updateCostEstimation({ warnThreshold: threshold });
                      setSettings({
                        ...settings,
                        costEstimation: {
                          ...settings.costEstimation,
                          defaultRatio: settings.costEstimation?.defaultRatio || 0.6,
                          warnThreshold: threshold,
                        },
                      });
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-slate-600">% of total BOM</span>
                </div>
              </div>

              {/* Info Box */}
              <div className="border-t pt-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">About Estimated Costs</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Estimated costs are clearly marked in BOM reports and CSV exports. For accurate margin calculations,
                        ensure articles and kits have actual cost prices defined in the Library.
                      </p>
                      <ul className="text-sm text-amber-700 mt-2 list-disc list-inside space-y-1">
                        <li>Items with estimated costs show an "Estimated" badge in BOM</li>
                        <li>CSV exports include a "Cost Type" column (ACTUAL or ESTIMATED)</li>
                        <li>BOM summary shows the total estimated vs actual cost breakdown</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import/Export Tab */}
        <TabsContent value="data">
          <ImportExportTab />
        </TabsContent>

        {/* Users Tab */}
        {can('user:read') && (
          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>
        )}
      </Tabs>

      {/* Add Payment Term Dialog */}
      <Dialog open={showPaymentTermDialog} onOpenChange={setShowPaymentTermDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Term</DialogTitle>
            <DialogDescription>
              Create a new payment term option for quotes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newPaymentTerm.name}
                onChange={(e) => setNewPaymentTerm({ ...newPaymentTerm, name: e.target.value })}
                placeholder="e.g. 50% / 50%"
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={newPaymentTerm.description}
                onChange={(e) => setNewPaymentTerm({ ...newPaymentTerm, description: e.target.value })}
                placeholder="Describe the payment schedule..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newPaymentTerm.isDefault}
                onCheckedChange={(checked) => setNewPaymentTerm({ ...newPaymentTerm, isDefault: checked })}
              />
              <Label>Set as default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentTermDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPaymentTerm} disabled={!newPaymentTerm.name.trim() || isSaving}>
              Add Term
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Delivery Term Dialog */}
      <Dialog open={showDeliveryTermDialog} onOpenChange={setShowDeliveryTermDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Delivery Term</DialogTitle>
            <DialogDescription>
              Create a new delivery term option for quotes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newDeliveryTerm.name}
                onChange={(e) => setNewDeliveryTerm({ ...newDeliveryTerm, name: e.target.value })}
                placeholder="e.g. Ex Works Elburg"
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={newDeliveryTerm.description}
                onChange={(e) => setNewDeliveryTerm({ ...newDeliveryTerm, description: e.target.value })}
                placeholder="Describe the delivery arrangement..."
                rows={3}
              />
            </div>
            <div>
              <Label>Estimated Weeks (optional)</Label>
              <Input
                type="number"
                min="0"
                value={newDeliveryTerm.estimatedWeeks || ''}
                onChange={(e) => setNewDeliveryTerm({
                  ...newDeliveryTerm,
                  estimatedWeeks: e.target.value ? parseInt(e.target.value) : undefined,
                })}
                placeholder="e.g. 12"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newDeliveryTerm.isDefault}
                onCheckedChange={(checked) => setNewDeliveryTerm({ ...newDeliveryTerm, isDefault: checked })}
              />
              <Label>Set as default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryTermDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDeliveryTerm} disabled={!newDeliveryTerm.name.trim() || isSaving}>
              Add Term
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// IMPORT/EXPORT TAB COMPONENT
// ============================================

function ImportExportTab() {
  const { getAuditContext, can } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportOptions, setExportOptions] = useState<ExportOptions>(
    ExportImportService.getDefaultExportOptions()
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>(
    ExportImportService.getDefaultImportOptions()
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importStep, setImportStep] = useState<'select' | 'preview' | 'options' | 'result'>('select');

  async function handleExport() {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const context = getAuditContext();
      const result = await ExportImportService.exportData(exportOptions, context);

      if (result.ok) {
        const blob = await ExportImportService.createExportZip(result.value);

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `navisol-export-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      alert('Please select a ZIP file');
      return;
    }

    setImportFile(file);
    setImportStep('preview');
    setImportPreview(null);
    setImportResult(null);

    try {
      const parseResult = await ExportImportService.parseImportFile(file);
      if (!parseResult.ok) {
        alert(`Invalid file: ${parseResult.error}`);
        setImportStep('select');
        return;
      }

      const previewResult = await ExportImportService.previewImport(parseResult.value);
      if (!previewResult.ok) {
        alert(`Preview failed: ${previewResult.error}`);
        setImportStep('select');
        return;
      }

      setImportPreview(previewResult.value);
      setShowImportDialog(true);
    } catch (error) {
      console.error('Failed to parse import file:', error);
      alert('Failed to parse import file');
      setImportStep('select');
    }
  }

  async function handleImport() {
    if (!importFile || !importPreview) return;

    setIsImporting(true);
    setImportStep('result');

    try {
      const parseResult = await ExportImportService.parseImportFile(importFile);
      if (!parseResult.ok) {
        setImportResult({
          success: false,
          imported: { projects: 0, clients: 0, users: 0, libraryItems: 0, auditEntries: 0 },
          skipped: { conflicts: 0, pinnedItems: 0 },
          errors: [parseResult.error],
        });
        return;
      }

      const context = getAuditContext();
      const result = await ExportImportService.importData(parseResult.value, importOptions, context);

      if (result.ok) {
        setImportResult(result.value);
      } else {
        setImportResult({
          success: false,
          imported: { projects: 0, clients: 0, users: 0, libraryItems: 0, auditEntries: 0 },
          skipped: { conflicts: 0, pinnedItems: 0 },
          errors: [result.error],
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: false,
        imported: { projects: 0, clients: 0, users: 0, libraryItems: 0, auditEntries: 0 },
        skipped: { conflicts: 0, pinnedItems: 0 },
        errors: ['Import failed unexpectedly'],
      });
    } finally {
      setIsImporting(false);
    }
  }

  function resetImport() {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setImportStep('select');
    setShowImportDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const canManageData = can('settings:update');

  return (
    <div className="space-y-6">
      {/* Export Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-teal-600" />
            Export Data
          </CardTitle>
          <CardDescription>
            Export all data to a ZIP file for backup or transfer to another system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">Data to Include</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="export-projects"
                    checked={exportOptions.includeProjects}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeProjects: !!checked })
                    }
                  />
                  <Label htmlFor="export-projects" className="flex items-center gap-2 font-normal">
                    <FolderOpen className="h-4 w-4 text-slate-400" />
                    Projects
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="export-clients"
                    checked={exportOptions.includeClients}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeClients: !!checked })
                    }
                  />
                  <Label htmlFor="export-clients" className="flex items-center gap-2 font-normal">
                    <Users className="h-4 w-4 text-slate-400" />
                    Clients
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="export-library"
                    checked={exportOptions.includeLibrary}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeLibrary: !!checked })
                    }
                  />
                  <Label htmlFor="export-library" className="flex items-center gap-2 font-normal">
                    <Database className="h-4 w-4 text-slate-400" />
                    Library (Articles, Kits, Templates, etc.)
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Additional Data</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="export-users"
                    checked={exportOptions.includeUsers}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeUsers: !!checked })
                    }
                  />
                  <Label htmlFor="export-users" className="flex items-center gap-2 font-normal">
                    <Users className="h-4 w-4 text-slate-400" />
                    Users
                  </Label>
                </div>
                {exportOptions.includeUsers && (
                  <div className="ml-6 flex items-center gap-2">
                    <Checkbox
                      id="export-passwords"
                      checked={exportOptions.includeUserPasswords}
                      onCheckedChange={(checked) =>
                        setExportOptions({ ...exportOptions, includeUserPasswords: !!checked })
                      }
                    />
                    <Label htmlFor="export-passwords" className="flex items-center gap-2 font-normal text-sm">
                      <Lock className="h-3 w-3 text-amber-500" />
                      Include password hashes (for full restore)
                    </Label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="export-audit"
                    checked={exportOptions.includeAuditLog}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeAuditLog: !!checked })
                    }
                  />
                  <Label htmlFor="export-audit" className="flex items-center gap-2 font-normal">
                    <History className="h-4 w-4 text-slate-400" />
                    Audit Log
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleExport}
              disabled={isExporting || !canManageData}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : exportSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Exported!
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export to ZIP
                </>
              )}
            </Button>
            {!canManageData && (
              <span className="text-sm text-amber-600">
                You need settings:update permission to export data
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-teal-600" />
            Import Data
          </CardTitle>
          <CardDescription>
            Import data from a previously exported ZIP file. You can choose to merge or replace data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
              disabled={!canManageData}
            />
            <FileArchive className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">
              Select a Navisol export ZIP file to import
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canManageData}
            >
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </Button>
            {!canManageData && (
              <p className="text-sm text-amber-600 mt-2">
                You need settings:update permission to import data
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Important Notes</p>
                <ul className="text-sm text-amber-700 mt-1 list-disc list-inside space-y-1">
                  <li>Pinned/frozen projects will never be overwritten</li>
                  <li>You can preview changes before importing</li>
                  <li>Audit logs are always merged (never replaced)</li>
                  <li>Consider exporting your current data as a backup first</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => !open && resetImport()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-teal-600" />
              Import Preview
            </DialogTitle>
            <DialogDescription>
              Review the import before applying changes
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {importStep === 'preview' && importPreview && (
              <>
                {/* Manifest Info */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Exported:</span>{' '}
                      <span className="font-medium">
                        {new Date(importPreview.manifest.exportedAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">By:</span>{' '}
                      <span className="font-medium">{importPreview.manifest.exportedBy}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Version:</span>{' '}
                      <span className="font-medium">{importPreview.manifest.version}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">App Version:</span>{' '}
                      <span className="font-medium">{importPreview.manifest.appVersion}</span>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {importPreview.warnings.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-medium text-amber-800 mb-2">Warnings</p>
                    <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                      {importPreview.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Counts */}
                <div className="space-y-3">
                  <h4 className="font-medium">Import Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ImportCountCard
                      icon={FolderOpen}
                      label="Projects"
                      counts={importPreview.counts.projects}
                    />
                    <ImportCountCard
                      icon={Users}
                      label="Clients"
                      counts={importPreview.counts.clients}
                    />
                    <ImportCountCard
                      icon={Users}
                      label="Users"
                      counts={importPreview.counts.users}
                    />
                    <ImportCountCard
                      icon={Database}
                      label="Library Items"
                      counts={importPreview.counts.library}
                    />
                  </div>
                </div>

                {/* Conflicts */}
                {importPreview.conflicts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-amber-700">
                      Conflicts ({importPreview.conflicts.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {importPreview.conflicts.map((conflict, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg text-sm ${
                            conflict.isPinned
                              ? 'bg-red-50 border border-red-200'
                              : 'bg-amber-50 border border-amber-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {conflict.type}
                            </Badge>
                            <span className="font-medium">{conflict.name}</span>
                            {conflict.isPinned && (
                              <Badge className="bg-red-100 text-red-700 text-xs">
                                <Lock className="h-3 w-3 mr-1" />
                                Pinned
                              </Badge>
                            )}
                          </div>
                          <p className="text-slate-600 mt-1">{conflict.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {importStep === 'options' && (
              <div className="space-y-6">
                {/* Import Mode */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Import Mode</Label>
                  <RadioGroup
                    value={importOptions.mode}
                    onValueChange={(value) =>
                      setImportOptions({ ...importOptions, mode: value as 'merge' | 'replace' })
                    }
                  >
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <RadioGroupItem value="merge" id="mode-merge" className="mt-1" />
                      <div>
                        <Label htmlFor="mode-merge" className="font-medium">
                          Merge (Recommended)
                        </Label>
                        <p className="text-sm text-slate-500">
                          Add new items, skip existing ones. Safe for partial imports.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <RadioGroupItem value="replace" id="mode-replace" className="mt-1" />
                      <div>
                        <Label htmlFor="mode-replace" className="font-medium">
                          Replace
                        </Label>
                        <p className="text-sm text-slate-500">
                          Overwrite existing items with imported versions (if newer).
                          Pinned items are never replaced.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* What to Import */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Data to Import</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="import-projects"
                        checked={importOptions.importProjects}
                        onCheckedChange={(checked) =>
                          setImportOptions({ ...importOptions, importProjects: !!checked })
                        }
                      />
                      <Label htmlFor="import-projects" className="font-normal">
                        Projects ({importPreview?.counts.projects.new || 0} new)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="import-clients"
                        checked={importOptions.importClients}
                        onCheckedChange={(checked) =>
                          setImportOptions({ ...importOptions, importClients: !!checked })
                        }
                      />
                      <Label htmlFor="import-clients" className="font-normal">
                        Clients ({importPreview?.counts.clients.new || 0} new)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="import-users"
                        checked={importOptions.importUsers}
                        onCheckedChange={(checked) =>
                          setImportOptions({ ...importOptions, importUsers: !!checked })
                        }
                      />
                      <Label htmlFor="import-users" className="font-normal">
                        Users ({importPreview?.counts.users.new || 0} new)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="import-library"
                        checked={importOptions.importLibrary}
                        onCheckedChange={(checked) =>
                          setImportOptions({ ...importOptions, importLibrary: !!checked })
                        }
                      />
                      <Label htmlFor="import-library" className="font-normal">
                        Library ({importPreview?.counts.library.new || 0} new)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="import-audit"
                        checked={importOptions.importAuditLog}
                        onCheckedChange={(checked) =>
                          setImportOptions({ ...importOptions, importAuditLog: !!checked })
                        }
                      />
                      <Label htmlFor="import-audit" className="font-normal">
                        Audit Log ({importPreview?.counts.auditEntries.new || 0} new entries)
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {importStep === 'result' && (
              <div className="space-y-6">
                {isImporting ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-12 w-12 text-teal-600 mx-auto animate-spin mb-4" />
                    <p className="text-lg font-medium">Importing data...</p>
                    <p className="text-slate-500">This may take a moment</p>
                  </div>
                ) : importResult ? (
                  <>
                    <div
                      className={`p-4 rounded-lg ${
                        importResult.success
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {importResult.success ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-600" />
                        )}
                        <div>
                          <p
                            className={`font-medium ${
                              importResult.success ? 'text-green-800' : 'text-red-800'
                            }`}
                          >
                            {importResult.success ? 'Import Completed' : 'Import Completed with Errors'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Imported Counts */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Imported Items</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500">Projects:</span>{' '}
                          <span className="font-medium">{importResult.imported.projects}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500">Clients:</span>{' '}
                          <span className="font-medium">{importResult.imported.clients}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500">Users:</span>{' '}
                          <span className="font-medium">{importResult.imported.users}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500">Library:</span>{' '}
                          <span className="font-medium">{importResult.imported.libraryItems}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500">Audit Entries:</span>{' '}
                          <span className="font-medium">{importResult.imported.auditEntries}</span>
                        </div>
                      </div>
                    </div>

                    {/* Skipped */}
                    {(importResult.skipped.conflicts > 0 || importResult.skipped.pinnedItems > 0) && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-amber-700">Skipped Items</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 bg-amber-50 rounded">
                            <span className="text-amber-700">Conflicts:</span>{' '}
                            <span className="font-medium">{importResult.skipped.conflicts}</span>
                          </div>
                          <div className="p-2 bg-amber-50 rounded">
                            <span className="text-amber-700">Pinned Items:</span>{' '}
                            <span className="font-medium">{importResult.skipped.pinnedItems}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {importResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-red-700">Errors ({importResult.errors.length})</h4>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {importResult.errors.map((error, i) => (
                            <div key={i} className="p-2 bg-red-50 rounded text-sm text-red-700">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter>
            {importStep === 'preview' && (
              <>
                <Button variant="outline" onClick={resetImport}>
                  Cancel
                </Button>
                <Button onClick={() => setImportStep('options')}>
                  Configure Import
                </Button>
              </>
            )}
            {importStep === 'options' && (
              <>
                <Button variant="outline" onClick={() => setImportStep('preview')}>
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </Button>
              </>
            )}
            {importStep === 'result' && !isImporting && (
              <Button onClick={resetImport}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for import count cards
function ImportCountCard({
  icon: Icon,
  label,
  counts,
}: {
  icon: React.ElementType;
  label: string;
  counts: { new: number; existing: number; conflicts: number };
}) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <span className="text-green-600 font-medium">{counts.new}</span>
          <span className="text-slate-500 ml-1">new</span>
        </div>
        <div>
          <span className="text-slate-600 font-medium">{counts.existing}</span>
          <span className="text-slate-500 ml-1">existing</span>
        </div>
        <div>
          <span className={counts.conflicts > 0 ? 'text-amber-600 font-medium' : 'text-slate-600'}>
            {counts.conflicts}
          </span>
          <span className="text-slate-500 ml-1">conflicts</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// USER MANAGEMENT TAB COMPONENT
// ============================================

function UserManagementTab() {
  const { getAuditContext, can, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Create form
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'VIEWER' as UserRole,
    password: '',
    department: '',
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'VIEWER' as UserRole,
    department: '',
  });

  // Reset password form
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setIsLoading(true);
    try {
      const allUsers = await AuthService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredUsers = users.filter(user => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!user.name.toLowerCase().includes(query) &&
          !user.email.toLowerCase().includes(query)) {
        return false;
      }
    }
    // Role filter
    if (roleFilter !== 'all' && user.role !== roleFilter) {
      return false;
    }
    // Status filter
    if (statusFilter === 'active' && !user.isActive) {
      return false;
    }
    if (statusFilter === 'inactive' && user.isActive) {
      return false;
    }
    return true;
  });

  async function handleCreateUser() {
    if (!newUser.email || !newUser.name || !newUser.password) return;

    setIsSaving(true);
    try {
      const context = getAuditContext();
      const result = await AuthService.createUser({
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        password: newUser.password,
        department: newUser.department || undefined,
      }, context);

      if (result.ok) {
        await loadUsers();
        setShowCreateDialog(false);
        setNewUser({ email: '', name: '', role: 'VIEWER', password: '', department: '' });
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user');
    } finally {
      setIsSaving(false);
    }
  }

  function openEditDialog(user: User) {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      role: user.role,
      department: user.department || '',
    });
    setShowEditDialog(true);
  }

  async function handleUpdateUser() {
    if (!selectedUser || !editForm.name) return;

    setIsSaving(true);
    try {
      const context = getAuditContext();
      const result = await AuthService.updateUser(selectedUser.id, {
        name: editForm.name,
        role: editForm.role,
        department: editForm.department || undefined,
      }, context);

      if (result.ok) {
        await loadUsers();
        setShowEditDialog(false);
        setSelectedUser(null);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    } finally {
      setIsSaving(false);
    }
  }

  function openResetPasswordDialog(user: User) {
    setSelectedUser(user);
    setNewPassword('');
    setShowResetPasswordDialog(true);
  }

  async function handleResetPassword() {
    if (!selectedUser || !newPassword) return;

    setIsSaving(true);
    try {
      const context = getAuditContext();
      const result = await AuthService.changePassword(selectedUser.id, newPassword, context);

      if (result.ok) {
        setShowResetPasswordDialog(false);
        setSelectedUser(null);
        setNewPassword('');
        alert('Password has been reset successfully');
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('Failed to reset password');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(user: User) {
    setIsSaving(true);
    try {
      const context = getAuditContext();
      const result = user.isActive
        ? await AuthService.deactivateUser(user.id, context)
        : await AuthService.activateUser(user.id, context);

      if (result.ok) {
        await loadUsers();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      alert('Failed to update user status');
    } finally {
      setIsSaving(false);
    }
  }

  const canManageUsers = can('user:create');
  const roles: UserRole[] = ['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'VIEWER'];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 text-teal-600 mx-auto animate-spin mb-4" />
          <p className="text-slate-500">Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage user accounts, roles, and permissions
            </CardDescription>
          </div>
          {canManageUsers && (
            <Button onClick={() => setShowCreateDialog(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* User List */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No users found</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  className={`p-4 border rounded-lg flex items-center justify-between ${
                    !user.isActive ? 'bg-slate-50 opacity-75' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="text-teal-600 font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{user.name}</p>
                        {currentUser?.id === user.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{user.email}</p>
                      {user.department && (
                        <p className="text-xs text-slate-400">{user.department}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        user.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-200' :
                        user.role === 'MANAGER' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        user.role === 'SALES' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        user.role === 'PRODUCTION' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }
                    >
                      {ROLE_LABELS[user.role]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={user.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                      }
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {canManageUsers && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          title="Edit user"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openResetPasswordDialog(user)}
                          title="Reset password"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(user)}
                          disabled={isSaving || currentUser?.id === user.id}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                          className={user.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}
                        >
                          {user.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. They will receive a temporary password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@company.com"
              />
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Role *</Label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                {roles.map(role => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {ROLE_DESCRIPTIONS[newUser.role]}
              </p>
            </div>
            <div>
              <Label>Department</Label>
              <Input
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                placeholder="e.g. Sales, Production"
              />
            </div>
            <div>
              <Label>Temporary Password *</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Min. 6 characters"
              />
              <p className="text-xs text-slate-500 mt-1">
                The user should change this password after first login.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={!newUser.email || !newUser.name || !newUser.password || newUser.password.length < 6 || isSaving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <Label>Name *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Role *</Label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {ROLE_DESCRIPTIONS[editForm.role]}
                </p>
              </div>
              <div>
                <Label>Department</Label>
                <Input
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={!editForm.name || isSaving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Security Notice</p>
                  <p className="text-sm text-amber-700">
                    The user will need to use this new password to log in. Consider informing them securely.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <Label>New Password *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword.length < 6 || isSaving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
