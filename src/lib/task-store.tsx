'use client';

import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type {
  Task,
  TimeEntry,
  ActiveTimer,
  TaskWithTime,
  TaskStatus,
  ProjectType,
  TimeReportFilters,
  TimeReportSummary,
  TimeReportGroupBy,
} from './types';
import { generateId } from './formatting';

interface TaskState {
  // State
  tasks: Task[];
  timeEntries: TimeEntry[];
  activeTimer: ActiveTimer | null;
  isLoading: boolean;

  // Task CRUD
  getTasks: (vesselId?: string) => Task[];
  getTaskById: (id: string) => Task | undefined;
  getTaskWithTime: (id: string) => TaskWithTime | undefined;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => boolean;
  deleteTask: (id: string) => boolean;

  // Time Entry CRUD
  getTimeEntries: (taskId: string) => TimeEntry[];
  addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'created_at'>) => TimeEntry;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => boolean;
  deleteTimeEntry: (id: string) => boolean;

  // Timer controls
  startTimer: (taskId: string, userId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: (billable?: boolean, notes?: string) => TimeEntry | null;
  getTimerElapsed: () => number; // Returns elapsed minutes

  // Reports
  getTasksWithTime: (vesselId?: string) => TaskWithTime[];
  generateReport: (groupBy: TimeReportGroupBy, filters?: TimeReportFilters) => TimeReportSummary[];
  exportReportCSV: (groupBy: TimeReportGroupBy, filters?: TimeReportFilters) => string;
}

const TaskContext = createContext<TaskState | undefined>(undefined);

const STORAGE_KEYS = {
  tasks: 'navisol_tasks',
  timeEntries: 'navisol_time_entries',
  activeTimer: 'navisol_active_timer',
};

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timerTick, setTimerTick] = useState(0);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    loadStoredData();
  }, []);

  // Save tasks when they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
      } catch (e) {
        console.error('Failed to save tasks:', e);
      }
    }
  }, [tasks, isLoading]);

  // Save time entries when they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEYS.timeEntries, JSON.stringify(timeEntries));
      } catch (e) {
        console.error('Failed to save time entries:', e);
      }
    }
  }, [timeEntries, isLoading]);

  // Save active timer when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading) {
      try {
        if (activeTimer) {
          localStorage.setItem(STORAGE_KEYS.activeTimer, JSON.stringify(activeTimer));
        } else {
          localStorage.removeItem(STORAGE_KEYS.activeTimer);
        }
      } catch (e) {
        console.error('Failed to save active timer:', e);
      }
    }
  }, [activeTimer, isLoading]);

  // Timer tick for UI updates
  useEffect(() => {
    if (activeTimer && !activeTimer.is_paused) {
      timerInterval.current = setInterval(() => {
        setTimerTick(t => t + 1);
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [activeTimer?.is_paused, activeTimer?.task_id]);

  const loadStoredData = () => {
    // SSR safety check
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const storedTasks = localStorage.getItem(STORAGE_KEYS.tasks);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }

      const storedEntries = localStorage.getItem(STORAGE_KEYS.timeEntries);
      if (storedEntries) {
        setTimeEntries(JSON.parse(storedEntries));
      }

      const storedTimer = localStorage.getItem(STORAGE_KEYS.activeTimer);
      if (storedTimer) {
        setActiveTimer(JSON.parse(storedTimer));
      }
    } catch (e) {
      console.error('Failed to load task data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Task CRUD
  const getTasks = (vesselId?: string): Task[] => {
    if (vesselId) {
      return tasks.filter(t => t.vessel_instance_id === vesselId);
    }
    return tasks;
  };

  const getTaskById = (id: string): Task | undefined => {
    return tasks.find(t => t.id === id);
  };

  const getTaskWithTime = (id: string): TaskWithTime | undefined => {
    const task = tasks.find(t => t.id === id);
    if (!task) return undefined;

    const entries = timeEntries.filter(e => e.task_id === id);
    const totalTime = entries.reduce((sum, e) => sum + e.duration_min, 0);

    return {
      ...task,
      total_time_min: totalTime,
      time_entries: entries,
    };
  };

  const createTask = (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Task => {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskData,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };

    setTasks(prev => [...prev, newTask]);
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>): boolean => {
    const existing = tasks.find(t => t.id === id);
    if (!existing) return false;

    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        ...updates,
        updated_at: new Date().toISOString(),
      };
    }));

    return true;
  };

  const deleteTask = (id: string): boolean => {
    const existing = tasks.find(t => t.id === id);
    if (!existing) return false;

    // Delete associated time entries
    setTimeEntries(prev => prev.filter(e => e.task_id !== id));
    setTasks(prev => prev.filter(t => t.id !== id));

    // Stop timer if running for this task
    if (activeTimer?.task_id === id) {
      setActiveTimer(null);
    }

    return true;
  };

  // Time Entry CRUD
  const getTimeEntries = (taskId: string): TimeEntry[] => {
    return timeEntries
      .filter(e => e.task_id === taskId)
      .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
  };

  const addTimeEntry = (entryData: Omit<TimeEntry, 'id' | 'created_at'>): TimeEntry => {
    const newEntry: TimeEntry = {
      ...entryData,
      id: generateId(),
      created_at: new Date().toISOString(),
    };

    setTimeEntries(prev => [...prev, newEntry]);
    return newEntry;
  };

  const updateTimeEntry = (id: string, updates: Partial<TimeEntry>): boolean => {
    const existing = timeEntries.find(e => e.id === id);
    if (!existing) return false;

    setTimeEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      return { ...e, ...updates };
    }));

    return true;
  };

  const deleteTimeEntry = (id: string): boolean => {
    const existing = timeEntries.find(e => e.id === id);
    if (!existing) return false;

    setTimeEntries(prev => prev.filter(e => e.id !== id));
    return true;
  };

  // Timer controls
  const startTimer = (taskId: string, userId: string) => {
    // Stop any existing timer first
    if (activeTimer) {
      stopTimer();
    }

    setActiveTimer({
      task_id: taskId,
      user_id: userId,
      start_at: new Date().toISOString(),
      accumulated_min: 0,
      is_paused: false,
    });
  };

  const pauseTimer = () => {
    if (!activeTimer || activeTimer.is_paused) return;

    const elapsed = calculateElapsedMinutes(activeTimer);

    setActiveTimer({
      ...activeTimer,
      paused_at: new Date().toISOString(),
      accumulated_min: elapsed,
      is_paused: true,
    });
  };

  const resumeTimer = () => {
    if (!activeTimer || !activeTimer.is_paused) return;

    setActiveTimer({
      ...activeTimer,
      start_at: new Date().toISOString(),
      paused_at: undefined,
      is_paused: false,
    });
  };

  const stopTimer = (billable = true, notes?: string): TimeEntry | null => {
    if (!activeTimer) return null;

    const elapsed = calculateElapsedMinutes(activeTimer);
    const task = getTaskById(activeTimer.task_id);

    if (elapsed < 1) {
      // Don't save entries less than 1 minute
      setActiveTimer(null);
      return null;
    }

    const entry = addTimeEntry({
      task_id: activeTimer.task_id,
      user_id: activeTimer.user_id,
      start_at: activeTimer.start_at,
      end_at: new Date().toISOString(),
      duration_min: Math.round(elapsed),
      billable: billable && (task?.billable ?? true),
      notes,
    });

    setActiveTimer(null);
    return entry;
  };

  const getTimerElapsed = (): number => {
    if (!activeTimer) return 0;
    return calculateElapsedMinutes(activeTimer);
  };

  const calculateElapsedMinutes = (timer: ActiveTimer): number => {
    if (timer.is_paused) {
      return timer.accumulated_min;
    }

    const startTime = new Date(timer.start_at).getTime();
    const now = Date.now();
    const currentSessionMin = (now - startTime) / 1000 / 60;

    return timer.accumulated_min + currentSessionMin;
  };

  // Reports
  const getTasksWithTime = (vesselId?: string): TaskWithTime[] => {
    const filteredTasks = vesselId
      ? tasks.filter(t => t.vessel_instance_id === vesselId)
      : tasks;

    return filteredTasks.map(task => {
      const entries = timeEntries.filter(e => e.task_id === task.id);
      const totalTime = entries.reduce((sum, e) => sum + e.duration_min, 0);

      return {
        ...task,
        total_time_min: totalTime,
        time_entries: entries,
      };
    });
  };

  const generateReport = (
    groupBy: TimeReportGroupBy,
    filters?: TimeReportFilters
  ): TimeReportSummary[] => {
    // Filter time entries
    let filteredEntries = [...timeEntries];

    if (filters?.date_from) {
      const from = new Date(filters.date_from);
      filteredEntries = filteredEntries.filter(e => new Date(e.start_at) >= from);
    }

    if (filters?.date_to) {
      const to = new Date(filters.date_to);
      to.setHours(23, 59, 59, 999);
      filteredEntries = filteredEntries.filter(e => new Date(e.start_at) <= to);
    }

    if (filters?.billable !== undefined) {
      filteredEntries = filteredEntries.filter(e => e.billable === filters.billable);
    }

    if (filters?.vessel_id) {
      const vesselTaskIds = tasks
        .filter(t => t.vessel_instance_id === filters.vessel_id)
        .map(t => t.id);
      filteredEntries = filteredEntries.filter(e => vesselTaskIds.includes(e.task_id));
    }

    if (filters?.project_type) {
      const typeTasks = tasks.filter(t => t.project_type === filters.project_type);
      const taskIds = typeTasks.map(t => t.id);
      filteredEntries = filteredEntries.filter(e => taskIds.includes(e.task_id));
    }

    if (filters?.user_id) {
      filteredEntries = filteredEntries.filter(e => e.user_id === filters.user_id);
    }

    // Group entries
    const groups = new Map<string, { entries: TimeEntry[]; name: string }>();

    for (const entry of filteredEntries) {
      let key = '';
      let name = '';

      const task = tasks.find(t => t.id === entry.task_id);

      switch (groupBy) {
        case 'vessel':
          key = task?.vessel_instance_id || 'unknown';
          name = key; // Will be resolved with vessel name in UI
          break;
        case 'task':
          key = entry.task_id;
          name = task?.title || 'Unknown Task';
          break;
        case 'user':
          key = entry.user_id;
          name = key; // Will be resolved with user name in UI
          break;
      }

      if (!groups.has(key)) {
        groups.set(key, { entries: [], name });
      }
      groups.get(key)!.entries.push(entry);
    }

    // Calculate summaries
    const summaries: TimeReportSummary[] = [];

    for (const [key, { entries, name }] of groups) {
      const totalMin = entries.reduce((sum, e) => sum + e.duration_min, 0);
      const billableMin = entries
        .filter(e => e.billable)
        .reduce((sum, e) => sum + e.duration_min, 0);

      summaries.push({
        group_key: key,
        group_name: name,
        total_hours: Math.round(totalMin / 60 * 100) / 100,
        total_entries: entries.length,
        billable_hours: Math.round(billableMin / 60 * 100) / 100,
        non_billable_hours: Math.round((totalMin - billableMin) / 60 * 100) / 100,
      });
    }

    // Sort by total hours descending
    return summaries.sort((a, b) => b.total_hours - a.total_hours);
  };

  const exportReportCSV = (
    groupBy: TimeReportGroupBy,
    filters?: TimeReportFilters
  ): string => {
    const summaries = generateReport(groupBy, filters);

    const headers = ['Group', 'Total Hours', 'Entries', 'Billable Hours', 'Non-Billable Hours'];
    const rows = summaries.map(s => [
      s.group_name,
      s.total_hours.toString(),
      s.total_entries.toString(),
      s.billable_hours.toString(),
      s.non_billable_hours.toString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    return csv;
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      timeEntries,
      activeTimer,
      isLoading,
      getTasks,
      getTaskById,
      getTaskWithTime,
      createTask,
      updateTask,
      deleteTask,
      getTimeEntries,
      addTimeEntry,
      updateTimeEntry,
      deleteTimeEntry,
      startTimer,
      pauseTimer,
      resumeTimer,
      stopTimer,
      getTimerElapsed,
      getTasksWithTime,
      generateReport,
      exportReportCSV,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
