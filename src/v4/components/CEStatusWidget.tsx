/**
 * CE Status Widget - v4
 * Read-only status widget for the Project Overview showing CE compliance status.
 * Clicking navigates to the Compliance tab.
 */

'use client';

import { useMemo } from 'react';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  BookOpen,
  FolderOpen,
  FileText,
  Ship,
} from 'lucide-react';
import type { Project } from '@/domain/models';
import { getTechnicalFileCounts, ensureTechnicalFile } from '@/domain/models/technical-file';
import { getDraftVersion, getApprovedVersion, isModularOwnerManual } from '@/domain/models/document-template';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// ============================================
// TYPES
// ============================================

interface CEStatusWidgetProps {
  project: Project;
  onNavigateToCompliance: () => void;
}

interface StatusItem {
  label: string;
  count: number;
  target?: number;
  icon: React.ReactNode;
  complete: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CEStatusWidget({ project, onNavigateToCompliance }: CEStatusWidgetProps) {
  // Only show for NEW_BUILD
  if (project.type !== 'NEW_BUILD') {
    return null;
  }

  // Compute compliance status
  const statusItems = useMemo((): StatusItem[] => {
    const items: StatusItem[] = [];

    // 1. Scope defined (vesselIdentity + declarations)
    const scopeComplete = !!(
      project.vesselIdentity?.modelName &&
      project.vesselIdentity?.win &&
      project.declarations?.docReferenceNumber
    );
    items.push({
      label: 'Scope Defined',
      count: scopeComplete ? 1 : 0,
      target: 1,
      icon: <Ship className="h-3.5 w-3.5" />,
      complete: scopeComplete,
    });

    // 2. Standards selected
    const standardsCount = project.appliedStandards?.length || 0;
    items.push({
      label: 'Standards',
      count: standardsCount,
      icon: <BookOpen className="h-3.5 w-3.5" />,
      complete: standardsCount > 0,
    });

    // 3. Evidence filed (technical file items)
    const technicalFile = ensureTechnicalFile(project.technicalFile);
    const dossierCounts = getTechnicalFileCounts(technicalFile);
    items.push({
      label: 'Dossier Items',
      count: dossierCounts.totalItems,
      icon: <FolderOpen className="h-3.5 w-3.5" />,
      complete: dossierCounts.totalItems > 0,
    });

    // 4. Deliverables (Owner's Manual ready)
    const ownerManualTemplate = project.documentTemplates?.find((t) => t.type === 'DOC_OWNERS_MANUAL');
    const currentVersion = ownerManualTemplate
      ? getDraftVersion(ownerManualTemplate) || getApprovedVersion(ownerManualTemplate)
      : undefined;
    const hasOwnerManual = currentVersion && isModularOwnerManual(currentVersion);
    const ownerManualComplete = hasOwnerManual
      ? (currentVersion?.ownerManualBlocks?.some((b: { included: boolean; content?: string }) =>
          b.included && b.content && b.content.trim().length > 0
        ) || false)
      : false;
    items.push({
      label: 'Owner Manual',
      count: ownerManualComplete ? 1 : 0,
      target: 1,
      icon: <FileText className="h-3.5 w-3.5" />,
      complete: ownerManualComplete,
    });

    return items;
  }, [project]);

  const completeCount = statusItems.filter((s) => s.complete).length;
  const totalCount = statusItems.length;
  const isFullyComplete = completeCount === totalCount;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onNavigateToCompliance}
      data-testid="ce-status-widget"
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isFullyComplete ? 'bg-green-100' : 'bg-amber-100'}`}>
              <Shield className={`h-4 w-4 ${isFullyComplete ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <h4 className="font-medium text-slate-900 text-sm">Compliance (CE)</h4>
              <p className="text-xs text-slate-500">
                {completeCount}/{totalCount} areas complete
              </p>
            </div>
          </div>
          <Badge
            className={`${
              isFullyComplete
                ? 'bg-green-100 text-green-700 border-0'
                : 'bg-amber-100 text-amber-700 border-0'
            }`}
          >
            {isFullyComplete ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Ready
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Incomplete
              </>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {statusItems.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 p-2 rounded-lg ${
                item.complete ? 'bg-green-50' : 'bg-slate-50'
              }`}
            >
              <div className={item.complete ? 'text-green-600' : 'text-slate-400'}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 truncate">{item.label}</p>
                <p className={`text-sm font-medium ${item.complete ? 'text-green-700' : 'text-slate-500'}`}>
                  {item.target !== undefined ? `${item.count}/${item.target}` : item.count}
                </p>
              </div>
              {item.complete && (
                <CheckCircle className="h-3 w-3 text-green-600" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-teal-600">
          <span>View Compliance Tab</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
