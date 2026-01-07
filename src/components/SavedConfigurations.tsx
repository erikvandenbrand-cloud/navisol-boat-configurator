'use client';

import { useState } from 'react';
import { Package, Ship, Zap, Fuel, Battery, Eye, Trash2, Copy, Edit, Download, AlertTriangle } from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { formatEuroCurrency, formatEuroDate, calculateLineTotal, calculateTotalInclVAT } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BoatConfiguration } from '@/lib/types';

interface SavedConfigurationsProps {
  onNavigate?: (tab: string) => void;
}

export function SavedConfigurations({ onNavigate }: SavedConfigurationsProps) {
  const { configurations, loadConfiguration, deleteConfiguration, settings } = useNavisol();
  const [viewingConfig, setViewingConfig] = useState<BoatConfiguration | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<BoatConfiguration | null>(null);

  const calculateConfigTotal = (config: BoatConfiguration) => {
    let subtotal = 0;
    for (const item of config.items.filter(i => i.included)) {
      subtotal += calculateLineTotal(item.article.sales_price_excl_vat, item.quantity, item.article.discount_percent);
    }
    return calculateTotalInclVAT(subtotal, settings.vat_rate);
  };

  const getPropulsionIcon = (type: string) => {
    switch (type) {
      case 'Electric': return Zap;
      case 'Diesel': return Fuel;
      case 'Hybrid': return Battery;
      default: return Ship;
    }
  };

  if (configurations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Package className="h-7 w-7 text-emerald-600" />
            Saved Configurations
          </h1>
          <p className="text-slate-600">View and manage your saved boat configurations</p>
        </div>

        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Package className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Saved Configurations</h3>
            <p className="text-slate-500 max-w-md">
              Create a new configuration using the Boat Configurator and save it to see it here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Package className="h-7 w-7 text-emerald-600" />
          Saved Configurations
        </h1>
        <p className="text-slate-600">View and manage your saved boat configurations</p>
      </div>

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configurations.map((config) => {
          const PropulsionIcon = getPropulsionIcon(config.propulsion_type);
          const total = calculateConfigTotal(config);

          return (
            <Card key={config.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Ship className="h-4 w-4" />
                      {config.boat_model}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <PropulsionIcon className="h-3 w-3" />
                    {config.propulsion_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Steering</p>
                    <p className="font-medium">{config.steering_type}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Components</p>
                    <p className="font-medium">{config.items.filter(i => i.included).length}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Created</p>
                    <p className="font-medium">{formatEuroDate(config.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total</p>
                    <p className="font-medium font-mono text-emerald-600">{formatEuroCurrency(total)}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setViewingConfig(config)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      loadConfiguration(config.id);
                      onNavigate?.('configurator');
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setDeletingConfig(config)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View Configuration Dialog */}
      {viewingConfig && (
        <Dialog open={!!viewingConfig} onOpenChange={() => setViewingConfig(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{viewingConfig.name}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-slate-500">Boat Model</p>
                      <p className="font-semibold">{viewingConfig.boat_model}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-slate-500">Propulsion</p>
                      <p className="font-semibold">{viewingConfig.propulsion_type}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-slate-500">Steering</p>
                      <p className="font-semibold">{viewingConfig.steering_type}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-slate-500">Total</p>
                      <p className="font-semibold text-emerald-600">
                        {formatEuroCurrency(calculateConfigTotal(viewingConfig))}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Items Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Components</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Part Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingConfig.items.filter(i => i.included).map((item) => (
                          <TableRow key={item.article.id}>
                            <TableCell>
                              <div className="font-medium">{item.article.part_name}</div>
                              {item.article.brand && (
                                <div className="text-xs text-slate-500">{item.article.brand}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {item.article.subcategory}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatEuroCurrency(item.article.sales_price_excl_vat)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatEuroCurrency(
                                calculateLineTotal(item.article.sales_price_excl_vat, item.quantity)
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingConfig && (
        <Dialog open={!!deletingConfig} onOpenChange={() => setDeletingConfig(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete Configuration
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingConfig.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingConfig(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteConfiguration(deletingConfig.id);
                  setDeletingConfig(null);
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
