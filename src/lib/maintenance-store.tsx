'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { generateId } from './formatting';
import type {
  MaintenanceRecord,
  MaintenanceSchedule,
  MaintenanceAlert,
  MaintenanceType,
  RecurrenceRule,
  ProjectCategory,
} from './types';
import { calculateNextDueDate } from './types';

const MAINTENANCE_RECORDS_KEY = 'navisol_maintenance_records';
const MAINTENANCE_SCHEDULES_KEY = 'navisol_maintenance_schedules';

interface MaintenanceState {
  records: MaintenanceRecord[];
  schedules: MaintenanceSchedule[];
  isLoading: boolean;

  // Record actions
  addRecord: (record: Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>) => MaintenanceRecord;
  updateRecord: (id: string, updates: Partial<MaintenanceRecord>) => void;
  deleteRecord: (id: string) => void;
  getRecordsForVessel: (vesselId: string) => MaintenanceRecord[];
  getRecordsByType: (type: MaintenanceType) => MaintenanceRecord[];
  getRecordsByCategory: (vesselIds: string[]) => MaintenanceRecord[];

  // Schedule actions
  addSchedule: (schedule: Omit<MaintenanceSchedule, 'id' | 'created_at' | 'updated_at'>) => MaintenanceSchedule;
  updateSchedule: (id: string, updates: Partial<MaintenanceSchedule>) => void;
  deleteSchedule: (id: string) => void;
  getSchedulesForVessel: (vesselId: string) => MaintenanceSchedule[];
  markScheduleCompleted: (scheduleId: string, completedDate: string) => void;
  toggleScheduleActive: (scheduleId: string) => void;

  // Alerts
  getUpcomingAlerts: (days: number) => MaintenanceAlert[];
  getOverdueAlerts: () => MaintenanceAlert[];

  // Reports
  getMaintenanceCostsByVessel: (vesselId: string) => { labor: number; parts: number; total: number };
  getMaintenanceCostsByCategory: (vesselIdsByCategory: Record<ProjectCategory, string[]>) => Record<ProjectCategory, { labor: number; parts: number; total: number; count: number }>;
  getTotalMaintenanceHours: (vesselId?: string) => number;
}

const MaintenanceContext = createContext<MaintenanceState | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const savedRecords = localStorage.getItem(MAINTENANCE_RECORDS_KEY);
      const savedSchedules = localStorage.getItem(MAINTENANCE_SCHEDULES_KEY);

      if (savedRecords) {
        setRecords(JSON.parse(savedRecords));
      }
      if (savedSchedules) {
        setSchedules(JSON.parse(savedSchedules));
      }
    } catch (error) {
      console.error('Failed to load maintenance data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save records to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading) {
      localStorage.setItem(MAINTENANCE_RECORDS_KEY, JSON.stringify(records));
    }
  }, [records, isLoading]);

  // Save schedules to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading) {
      localStorage.setItem(MAINTENANCE_SCHEDULES_KEY, JSON.stringify(schedules));
    }
  }, [schedules, isLoading]);

  // Record actions
  const addRecord = (record: Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>): MaintenanceRecord => {
    const newRecord: MaintenanceRecord = {
      ...record,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRecords(prev => [...prev, newRecord]);
    return newRecord;
  };

  const updateRecord = (id: string, updates: Partial<MaintenanceRecord>) => {
    setRecords(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, ...updates, updated_at: new Date().toISOString() }
          : r
      )
    );
  };

  const deleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const getRecordsForVessel = (vesselId: string): MaintenanceRecord[] => {
    return records
      .filter(r => r.vessel_id === vesselId)
      .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
  };

  const getRecordsByType = (type: MaintenanceType): MaintenanceRecord[] => {
    return records.filter(r => r.maintenance_type === type);
  };

  const getRecordsByCategory = (vesselIds: string[]): MaintenanceRecord[] => {
    return records.filter(r => vesselIds.includes(r.vessel_id));
  };

  // Schedule actions
  const addSchedule = (schedule: Omit<MaintenanceSchedule, 'id' | 'created_at' | 'updated_at'>): MaintenanceSchedule => {
    const newSchedule: MaintenanceSchedule = {
      ...schedule,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSchedules(prev => [...prev, newSchedule]);
    return newSchedule;
  };

  const updateSchedule = (id: string, updates: Partial<MaintenanceSchedule>) => {
    setSchedules(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, ...updates, updated_at: new Date().toISOString() }
          : s
      )
    );
  };

  const deleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const getSchedulesForVessel = (vesselId: string): MaintenanceSchedule[] => {
    return schedules
      .filter(s => s.vessel_id === vesselId)
      .sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());
  };

  const markScheduleCompleted = (scheduleId: string, completedDate: string) => {
    setSchedules(prev =>
      prev.map(s => {
        if (s.id !== scheduleId) return s;

        const nextDue = s.recurrence.type !== 'none'
          ? calculateNextDueDate(completedDate, s.recurrence)
          : s.next_due_date;

        return {
          ...s,
          last_completed_date: completedDate,
          next_due_date: nextDue,
          updated_at: new Date().toISOString(),
        };
      })
    );
  };

  const toggleScheduleActive = (scheduleId: string) => {
    setSchedules(prev =>
      prev.map(s =>
        s.id === scheduleId
          ? { ...s, is_active: !s.is_active, updated_at: new Date().toISOString() }
          : s
      )
    );
  };

  // Alerts
  const getUpcomingAlerts = (days: number): MaintenanceAlert[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return schedules
      .filter(s => s.is_active)
      .map(s => {
        const dueDate = new Date(s.next_due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysUntilDue < 0;

        return {
          id: `alert-${s.id}`,
          schedule_id: s.id,
          vessel_id: s.vessel_id,
          vessel_name: '', // Will be filled by component
          title: s.title,
          due_date: s.next_due_date,
          days_until_due: daysUntilDue,
          is_overdue: isOverdue,
          maintenance_type: s.maintenance_type,
          estimated_hours: s.estimated_hours,
        };
      })
      .filter(a => a.days_until_due <= days)
      .sort((a, b) => a.days_until_due - b.days_until_due);
  };

  const getOverdueAlerts = (): MaintenanceAlert[] => {
    return getUpcomingAlerts(365).filter(a => a.is_overdue);
  };

  // Reports
  const getMaintenanceCostsByVessel = (vesselId: string): { labor: number; parts: number; total: number } => {
    const vesselRecords = records.filter(r => r.vessel_id === vesselId && r.status === 'completed');
    return {
      labor: vesselRecords.reduce((sum, r) => sum + r.labor_cost, 0),
      parts: vesselRecords.reduce((sum, r) => sum + r.parts_cost, 0),
      total: vesselRecords.reduce((sum, r) => sum + r.total_cost, 0),
    };
  };

  const getMaintenanceCostsByCategory = (
    vesselIdsByCategory: Record<ProjectCategory, string[]>
  ): Record<ProjectCategory, { labor: number; parts: number; total: number; count: number }> => {
    const result: Record<ProjectCategory, { labor: number; parts: number; total: number; count: number }> = {
      new_build: { labor: 0, parts: 0, total: 0, count: 0 },
      maintenance: { labor: 0, parts: 0, total: 0, count: 0 },
      refit: { labor: 0, parts: 0, total: 0, count: 0 },
    };

    for (const [category, vesselIds] of Object.entries(vesselIdsByCategory) as [ProjectCategory, string[]][]) {
      const categoryRecords = records.filter(
        r => vesselIds.includes(r.vessel_id) && r.status === 'completed'
      );
      result[category] = {
        labor: categoryRecords.reduce((sum, r) => sum + r.labor_cost, 0),
        parts: categoryRecords.reduce((sum, r) => sum + r.parts_cost, 0),
        total: categoryRecords.reduce((sum, r) => sum + r.total_cost, 0),
        count: categoryRecords.length,
      };
    }

    return result;
  };

  const getTotalMaintenanceHours = (vesselId?: string): number => {
    const filtered = vesselId
      ? records.filter(r => r.vessel_id === vesselId)
      : records;
    return filtered.reduce((sum, r) => sum + r.labor_hours, 0);
  };

  const value: MaintenanceState = {
    records,
    schedules,
    isLoading,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsForVessel,
    getRecordsByType,
    getRecordsByCategory,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    getSchedulesForVessel,
    markScheduleCompleted,
    toggleScheduleActive,
    getUpcomingAlerts,
    getOverdueAlerts,
    getMaintenanceCostsByVessel,
    getMaintenanceCostsByCategory,
    getTotalMaintenanceHours,
  };

  return (
    <MaintenanceContext.Provider value={value}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenance must be used within MaintenanceProvider');
  }
  return context;
}
