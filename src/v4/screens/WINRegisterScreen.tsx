/**
 * WIN Register Screen - v4
 * Read-only list of all NEW_BUILD boats with WIN/CIN numbers
 * Now shows individual boats (serial production) rather than projects
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Ship,
  Search,
  FileText,
  ExternalLink,
  Hash,
  AlertCircle,
  Anchor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PROJECT_STATUS_STYLES } from '@/v4/components/StatusBadge';
import {
  WINRegisterService,
  type WINRegisterEntry,
} from '@/domain/services/WINRegisterService';
import { ClientRepository } from '@/data/repositories';
import type { Client, ProjectStatus } from '@/domain/models';

// ============================================
// PROPS
// ============================================

interface WINRegisterScreenProps {
  onNavigateToProject?: (projectId: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export function WINRegisterScreen({ onNavigateToProject }: WINRegisterScreenProps) {
  const [entries, setEntries] = useState<WINRegisterEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<WINRegisterEntry[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalNewBuildProjects: number;
    totalBoats: number;
    boatsWithWIN: number;
    boatsWithoutWIN: number;
  } | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter entries when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEntries(entries);
    } else {
      const filtered = WINRegisterService.filterWINRegisterEntries(entries, {
        search: searchQuery,
      });
      setFilteredEntries(filtered);
    }
  }, [searchQuery, entries]);

  async function loadData() {
    setIsLoading(true);
    try {
      // Load WIN register entries and statistics
      const [registerEntries, registerStats, clientList] = await Promise.all([
        WINRegisterService.getWINRegisterEntries(),
        WINRegisterService.getWINStatistics(),
        ClientRepository.getAll(),
      ]);

      setEntries(registerEntries);
      setFilteredEntries(registerEntries);
      setStats(registerStats);

      // Build client lookup map
      const clientMap: Record<string, Client> = {};
      for (const client of clientList) {
        clientMap[client.id] = client;
      }
      setClients(clientMap);
    } catch (error) {
      console.error('Failed to load WIN register:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleViewProject(projectId: string) {
    if (onNavigateToProject) {
      onNavigateToProject(projectId);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Ship className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading WIN Register...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Hash className="h-7 w-7 text-teal-600" />
            WIN Register
          </h1>
          <p className="text-slate-600 mt-1">
            Watercraft Identification Numbers for all New Build boats
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-slate-50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Ship className="h-4 w-4 text-slate-500" />
                <p className="text-xs text-slate-500">Projects</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalNewBuildProjects}</p>
            </CardContent>
          </Card>
          <Card className="bg-teal-50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Anchor className="h-4 w-4 text-teal-600" />
                <p className="text-xs text-teal-600">Total Boats</p>
              </div>
              <p className="text-2xl font-bold text-teal-700">{stats.totalBoats}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-green-600" />
                <p className="text-xs text-green-600">With WIN</p>
              </div>
              <p className="text-2xl font-bold text-green-700">{stats.boatsWithWIN}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-xs text-amber-600">Without WIN</p>
              </div>
              <p className="text-2xl font-bold text-amber-700">{stats.boatsWithoutWIN}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by WIN, boat label, project number, title, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline" className="text-slate-600">
          {filteredEntries.length} of {entries.length} boats
        </Badge>
      </div>

      {/* WIN Register Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New Build Boats</CardTitle>
          <CardDescription>
            Click on a row to view project details. Each boat is listed separately with its own WIN.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <Anchor className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {entries.length === 0
                  ? 'No New Build boats found'
                  : 'No boats match your search'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">WIN / CIN</TableHead>
                  <TableHead className="w-[120px]">Boat</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Boat Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const client = clients[entry.clientId];
                  const statusStyle = PROJECT_STATUS_STYLES[entry.status as ProjectStatus] || {
                    label: entry.status.replace(/_/g, ' '),
                    className: 'bg-slate-100 text-slate-700',
                  };

                  return (
                    <TableRow
                      key={`${entry.projectId}-${entry.boatId}`}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleViewProject(entry.projectId)}
                    >
                      <TableCell>
                        {entry.win ? (
                          <span className="font-mono text-sm font-medium text-slate-900">
                            {entry.win}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {entry.boatLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{entry.projectTitle}</p>
                          <p className="text-xs text-slate-500">{entry.projectNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.boatModel ? (
                          <span className="text-sm text-slate-700">{entry.boatModel}</span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusStyle.className} border-0`}>
                          {statusStyle.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {client ? (
                          <span className="text-sm text-slate-700">{client.name}</span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProject(entry.projectId);
                          }}
                          title="View project"
                        >
                          <ExternalLink className="h-4 w-4 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">About WIN / CIN</p>
              <p className="text-sm text-blue-700 mt-1">
                The Watercraft Identification Number (WIN), also known as Craft Identification Number (CIN)
                or Hull Identification Number (HIN), is required for CE marking per RCD 2013/53/EU.
                Each boat in a serial production run has its own unique WIN that must be permanently affixed to the hull.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
