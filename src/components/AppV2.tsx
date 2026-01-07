'use client';

import React, { useState } from 'react';
import { StoreProviderV2, useStoreV2 } from '@/lib/store-v2';
import { StoreV3Provider } from '@/lib/store-v3';

// Import all v1.0 providers that components depend on
import { NavisolProvider } from '@/lib/store';
import { AuthProvider, useAuth } from '@/lib/auth-store';
import { MediaProvider } from '@/lib/media-store';
import { TaskProvider } from '@/lib/task-store';
import { MaintenanceProvider } from '@/lib/maintenance-store';
import { ProceduresProvider } from '@/lib/procedures-store';
import { BoatModelsProvider } from '@/lib/boat-models-store';

// Import new v2.0 components
import { SidebarV2 } from './SidebarV2';
import { DashboardV2 } from './DashboardV2';
import { BoatModelsCatalog } from './BoatModelsCatalog';
import { EquipmentTemplatesManager } from './EquipmentTemplatesManager';
import { BoatModelsManager } from './BoatModelsManager';
import { ArticleGroupsManager } from './ArticleGroupsManager';
import { QuotationGenerator } from './QuotationGenerator';

// Import v3.0 project-centric components
import { ProjectsList } from './ProjectsList';
import { ProjectDetail } from './ProjectDetail';
import { DataManagement } from './DataManagement';

// Import existing v1.0 components (preserving all functionality)
import { Login } from './Login';
import { Clients } from './Clients';
import { ArticlesDatabase } from './ArticlesDatabase';
import { ProductionOrders } from './ProductionOrders';
import { ProductionCalendar } from './ProductionCalendar';
import { TaskManagement } from './TaskManagement';
import { MaintenanceManagement } from './MaintenanceManagement';
import { CEDocuments } from './CEDocuments';
import { VesselPhotos } from './VesselPhotos';
import { OperatingProcedures } from './OperatingProcedures';
import { TemplateManagement } from './TemplateManagement';
import { UserManagement } from './UserManagement';
import { Settings } from './Settings';
import { DocumentGenerator } from './DocumentGenerator';
import { BoatConfigurator } from './BoatConfigurator';
import { SavedConfigurations } from './SavedConfigurations';

import { Button } from '@/components/ui/button';
import { LogOut, Menu, X, Bell, Anchor, Zap } from 'lucide-react';

function MainLayout() {
  // Use v1.0 auth system for compatibility with existing components
  const { isAuthenticated, isLoading, currentUser, logout, hasPermission } = useAuth();
  const { settings } = useStoreV2();
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Anchor className="w-9 h-9 text-white" />
          </div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated - use the existing Login component
  if (!isAuthenticated) {
    return <Login />;
  }

  const renderView = () => {
    switch (currentView) {
      // Dashboard
      case 'dashboard':
        return <DashboardV2 />;

      // CRM
      case 'clients':
        return <Clients />;
      case 'contacts':
        return <Clients />; // Contacts integrated in Clients

      // Catalog
      case 'models':
        return <BoatModelsManager />;
      case 'parts':
        return <ArticlesDatabase />;
      case 'article-groups':
        return <ArticleGroupsManager />;
      case 'equipment-templates':
        return <EquipmentTemplatesManager />;
      case 'procedures':
        return <OperatingProcedures />;

      // Projects (v3 architecture)
      case 'all-projects':
        return <ProjectsList />;
      case 'new-builds':
        return <ProjectsList filterType="NEW_BUILD" />;
      case 'refits':
        return <ProjectsList filterType="REFIT" />;
      case 'maintenance':
        return <ProjectsList filterType="MAINTENANCE" />;

      // Planning
      case 'calendar':
        return <ProductionCalendar />;
      case 'tasks':
        return <TaskManagement />;
      case 'time-tracking':
        return <TaskManagement />;

      // Commercial
      case 'quotations':
        return <QuotationGenerator />;
      case 'quotation-generator':
        return <QuotationGenerator />;
      case 'cost-analysis':
        return <DocumentGenerator type="comparison" />;

      // Documentation
      case 'documents':
        return <CEDocuments type="technical-file" />;
      case 'technical-files':
        return <CEDocuments type="ce-documents" />;
      case 'vessel-photos':
        return <VesselPhotos />;
      case 'checklists':
        return <TemplateManagement />;

      // Admin
      case 'data-management':
        return <DataManagement />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <Settings />;

      // Legacy routes (for backward compatibility)
      case 'configurator':
        return <BoatConfigurator />;
      case 'configurations':
        return <SavedConfigurations onNavigate={setCurrentView} />;
      case 'parts-list':
        return <DocumentGenerator type="parts-list" />;
      case 'equipment-list':
        return <DocumentGenerator type="equipment-list" />;

      default:
        return <DashboardV2 />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block`}>
        <SidebarV2 currentView={currentView} onNavigate={setCurrentView} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>

              <div className="h-6 w-px bg-slate-200" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">
                    {currentUser?.firstName} {currentUser?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">{currentUser?.role}</p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

// Wrap with all required providers
function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavisolProvider>
        <MediaProvider>
          <TaskProvider>
            <MaintenanceProvider>
              <ProceduresProvider>
                <BoatModelsProvider>
                  {children}
                </BoatModelsProvider>
              </ProceduresProvider>
            </MaintenanceProvider>
          </TaskProvider>
        </MediaProvider>
      </NavisolProvider>
    </AuthProvider>
  );
}

export function AppV2() {
  return (
    <StoreProviderV2>
      <StoreV3Provider>
        <ProvidersWrapper>
          <MainLayout />
        </ProvidersWrapper>
      </StoreV3Provider>
    </StoreProviderV2>
  );
}

export default AppV2;
