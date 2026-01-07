'use client';

import { useMemo } from 'react';
import {
  LayoutDashboard, Ship, Database, FileText, Package,
  TrendingUp, TrendingDown, AlertTriangle, Euro,
  Zap, Fuel, Battery, ArrowRight, Users, Wrench, RefreshCw
} from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { formatEuroCurrency, calculateLineTotal, calculateTotalInclVAT } from '@/lib/formatting';
import { CATEGORIES } from '@/lib/categories';
import { PROJECT_CATEGORY_INFO, type ProjectCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { articles, configurations, ceDocuments, quotations, clients, clientBoats, settings } = useNavisol();

  // Calculate statistics
  const stats = useMemo(() => {
    // Article stats
    const totalArticles = articles.length;
    const standardParts = articles.filter(a => a.standard_or_optional === 'Standard').length;
    const optionalParts = articles.filter(a => a.standard_or_optional === 'Optional').length;
    const lowStock = articles.filter(a => a.stock_qty <= a.min_stock_level).length;

    // Total inventory value
    const inventoryValue = articles.reduce((sum, a) => sum + (a.purchase_price_excl_vat * a.stock_qty), 0);
    const potentialSalesValue = articles.reduce((sum, a) => sum + (a.sales_price_excl_vat * a.stock_qty), 0);

    // Configuration stats
    const totalConfigs = configurations.length;
    const electricConfigs = configurations.filter(c => c.propulsion_type === 'Electric').length;
    const dieselConfigs = configurations.filter(c => c.propulsion_type === 'Diesel').length;
    const hybridConfigs = configurations.filter(c => c.propulsion_type === 'Hybrid').length;

    // Average configuration value
    const avgConfigValue = configurations.length > 0
      ? configurations.reduce((sum, config) => {
          const subtotal = config.items.filter(i => i.included).reduce(
            (s, item) => s + calculateLineTotal(item.article.sales_price_excl_vat, item.quantity),
            0
          );
          return sum + calculateTotalInclVAT(subtotal, settings.vat_rate);
        }, 0) / configurations.length
      : 0;

    // Category distribution
    const categoryDistribution = CATEGORIES.map(cat => ({
      name: cat.name.split(' ').slice(1).join(' '),
      count: articles.filter(a => a.category === cat.name).length,
    })).filter(c => c.count > 0);

    // Boat model distribution
    const modelDistribution = [
      { name: 'Eagle 25TS', count: articles.filter(a => a.boat_model_compat.includes('Eagle 25TS')).length },
      { name: 'Eagle 28TS', count: articles.filter(a => a.boat_model_compat.includes('Eagle 28TS')).length },
      { name: 'Eagle 32TS', count: articles.filter(a => a.boat_model_compat.includes('Eagle 32TS')).length },
      { name: 'Eagle C720', count: articles.filter(a => a.boat_model_compat.includes('Eagle C720')).length },
    ];

    return {
      totalArticles,
      standardParts,
      optionalParts,
      lowStock,
      inventoryValue,
      potentialSalesValue,
      totalConfigs,
      electricConfigs,
      dieselConfigs,
      hybridConfigs,
      avgConfigValue,
      categoryDistribution,
      modelDistribution,
      ceDocuments: ceDocuments.length,
      quotations: quotations.length,
      totalClients: clients.length,
      activeClients: clients.filter(c => c.status === 'active').length,
      totalBoats: clientBoats.length,
      // Project category breakdown
      projectCategories: {
        new_build: {
          total: clientBoats.filter(b => (b.project_category || 'new_build') === 'new_build').length,
          inProduction: clientBoats.filter(b => (b.project_category || 'new_build') === 'new_build' && b.status === 'in_production').length,
        },
        maintenance: {
          total: clientBoats.filter(b => b.project_category === 'maintenance').length,
          inProduction: clientBoats.filter(b => b.project_category === 'maintenance' && b.status === 'in_production').length,
        },
        refit: {
          total: clientBoats.filter(b => b.project_category === 'refit').length,
          inProduction: clientBoats.filter(b => b.project_category === 'refit' && b.status === 'in_production').length,
        },
      },
      boatsInProduction: clientBoats.filter(b => b.status === 'in_production').length,
    };
  }, [articles, configurations, ceDocuments, quotations, clients, clientBoats, settings.vat_rate]);

  // Recent configurations
  const recentConfigs = useMemo(() => {
    return [...configurations]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [configurations]);

  // Low stock alerts
  const lowStockItems = useMemo(() => {
    return articles
      .filter(a => a.stock_qty <= a.min_stock_level)
      .slice(0, 5);
  }, [articles]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <LayoutDashboard className="h-7 w-7 text-emerald-600" />
          Dashboard
        </h1>
        <p className="text-slate-600">Overview of your Navisol boat manufacturing system</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Total Parts</p>
                <p className="text-3xl font-bold text-emerald-700">{stats.totalArticles}</p>
              </div>
              <Database className="h-10 w-10 text-emerald-500 opacity-80" />
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                {stats.standardParts} Standard
              </Badge>
              <Badge variant="outline" className="text-emerald-600">
                {stats.optionalParts} Optional
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Configurations</p>
                <p className="text-3xl font-bold text-blue-700">{stats.totalConfigs}</p>
              </div>
              <Ship className="h-10 w-10 text-blue-500 opacity-80" />
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                <Zap className="h-3 w-3 mr-1" />{stats.electricConfigs}
              </Badge>
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                <Fuel className="h-3 w-3 mr-1" />{stats.dieselConfigs}
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <Battery className="h-3 w-3 mr-1" />{stats.hybridConfigs}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Inventory Value</p>
                <p className="text-2xl font-bold text-purple-700">
                  {formatEuroCurrency(stats.inventoryValue)}
                </p>
              </div>
              <Euro className="h-10 w-10 text-purple-500 opacity-80" />
            </div>
            <div className="mt-2 text-xs text-purple-600">
              Sales potential: {formatEuroCurrency(stats.potentialSalesValue)}
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${stats.lowStock > 0 ? 'from-red-50 to-white border-red-200' : 'from-green-50 to-white border-green-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${stats.lowStock > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Stock Alerts
                </p>
                <p className={`text-3xl font-bold ${stats.lowStock > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {stats.lowStock}
                </p>
              </div>
              <AlertTriangle className={`h-10 w-10 opacity-80 ${stats.lowStock > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
            <div className="mt-2 text-xs text-slate-600">
              {stats.lowStock > 0 ? 'Items need reordering' : 'All stock levels OK'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Categories - High-level distinction */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('production-calendar')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">New Builds</p>
                <p className="text-3xl font-bold text-blue-700">{stats.projectCategories.new_build.total}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.projectCategories.new_build.inProduction} in production
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Ship className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
              <span>Own vessel production</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('production-calendar')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Maintenance</p>
                <p className="text-3xl font-bold text-orange-700">{stats.projectCategories.maintenance.total}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.projectCategories.maintenance.inProduction} in progress
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Wrench className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
              <span>Service & maintenance work</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('production-calendar')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Refits</p>
                <p className="text-3xl font-bold text-purple-700">{stats.projectCategories.refit.total}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.projectCategories.refit.inProduction} in progress
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <RefreshCw className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
              <span>Major refurbishments</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parts by Category</CardTitle>
            <CardDescription>Distribution of articles across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.categoryDistribution.slice(0, 6).map((cat, idx) => {
                const percentage = (cat.count / stats.totalArticles) * 100;
                const colors = [
                  'bg-emerald-500',
                  'bg-blue-500',
                  'bg-purple-500',
                  'bg-orange-500',
                  'bg-pink-500',
                  'bg-teal-500',
                ];
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 truncate max-w-[200px]">{cat.name}</span>
                      <span className="font-medium">{cat.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[idx % colors.length]} rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Model Compatibility */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model Compatibility</CardTitle>
            <CardDescription>Parts compatible with each boat model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {stats.modelDistribution.map((model) => {
                const percentage = (model.count / stats.totalArticles) * 100;
                return (
                  <div key={model.name} className="p-4 rounded-xl bg-slate-50 border">
                    <div className="flex items-center gap-3 mb-2">
                      <Ship className="h-5 w-5 text-emerald-600" />
                      <span className="font-semibold">{model.name}</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{model.count}</div>
                    <div className="text-xs text-slate-500">{percentage.toFixed(0)}% of parts</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => onNavigate('configurator')}
            >
              <span className="flex items-center gap-2">
                <Ship className="h-4 w-4" />
                New Configuration
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => onNavigate('articles')}
            >
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Add New Part
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => onNavigate('clients')}
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Manage Clients
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => onNavigate('quotation')}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Create Quotation
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => onNavigate('ce-documents')}
            >
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Generate CE Docs
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Configurations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            {recentConfigs.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {recentConfigs.map((config) => (
                    <div
                      key={config.id}
                      className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => onNavigate('configurations')}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{config.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {config.propulsion_type}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {config.boat_model} • {config.items.length} items
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Ship className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No configurations yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {stats.lowStock > 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-red-50 border border-red-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-red-900">{item.part_name}</span>
                        <Badge variant="destructive" className="text-xs">
                          {item.stock_qty} left
                        </Badge>
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        Min level: {item.min_stock_level} • {item.brand || 'No brand'}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-green-600">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-70" />
                  <p className="text-sm font-medium">All stock levels OK</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-2xl font-bold text-slate-900">{stats.totalArticles}</p>
              <p className="text-sm text-slate-500">Total Parts</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-2xl font-bold text-emerald-600">{stats.totalClients}</p>
              <p className="text-sm text-slate-500">Clients</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-2xl font-bold text-slate-900">{stats.totalConfigs}</p>
              <p className="text-sm text-slate-500">Configurations</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-2xl font-bold text-slate-900">{stats.ceDocuments}</p>
              <p className="text-sm text-slate-500">CE Documents</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-2xl font-bold text-slate-900">{stats.quotations}</p>
              <p className="text-sm text-slate-500">Quotations</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-xl font-bold text-emerald-600">{formatEuroCurrency(stats.avgConfigValue)}</p>
              <p className="text-sm text-slate-500">Avg Config Value</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
