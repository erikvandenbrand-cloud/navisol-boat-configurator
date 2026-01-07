'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type Project,
  type BoatModel,
  type Client,
  type ProjectDocument,
  type EquipmentItem,
  type ProductionStage,
  type ProjectTask,
  type TimeEntry,
  type ChecklistItem,
  type ProjectStatus,
  type DocumentType,
  DEFAULT_BOAT_MODELS,
  getDefaultProductionStages,
  getDefaultDeliveryChecklist,
  deriveSpecificationFromEquipment,
} from './types-v3';

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  PROJECTS: 'navisol_v3_projects',
  CLIENTS: 'navisol_v3_clients',
  MODELS: 'navisol_v3_models',
  SETTINGS: 'navisol_v3_settings',
  NUMBERING: 'navisol_v3_numbering',
} as const;

// ============================================
// HELPERS
// ============================================

function generateId(prefix = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to localStorage: ${key}`, e);
  }
}

// ============================================
// NUMBERING
// ============================================

interface NumberingState {
  projectNext: number;
  quoteNext: number;
}

const DEFAULT_NUMBERING: NumberingState = {
  projectNext: 1001,
  quoteNext: 2001,
};

// ============================================
// CONTEXT TYPE
// ============================================

interface StoreV3State {
  // Data
  projects: Project[];
  clients: Client[];
  models: BoatModel[];
  numbering: NumberingState;
  isLoaded: boolean;
}

interface StoreV3Actions {
  // Projects
  createProject: (data: {
    title: string;
    projectType: Project['projectType'];
    clientId: string;
    modelId?: string;
    propulsionType?: string;
  }) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;

  // Project Status
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;

  // Equipment
  addEquipmentItem: (projectId: string, item: Omit<EquipmentItem, 'id'>) => void;
  updateEquipmentItem: (projectId: string, itemId: string, updates: Partial<EquipmentItem>) => void;
  removeEquipmentItem: (projectId: string, itemId: string) => void;
  freezeEquipment: (projectId: string) => void;

  // Documents (Full History)
  addDocument: (projectId: string, doc: Omit<ProjectDocument, 'id' | 'createdAt'>) => ProjectDocument;
  updateDocument: (projectId: string, docId: string, updates: Partial<ProjectDocument>) => void;
  getDocumentsByType: (projectId: string, type: DocumentType) => ProjectDocument[];
  getLatestDocument: (projectId: string, type: DocumentType) => ProjectDocument | undefined;

  // Production
  updateProductionStage: (projectId: string, stageId: string, updates: Partial<ProductionStage>) => void;

  // Tasks
  addTask: (projectId: string, task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>) => ProjectTask;
  updateTask: (projectId: string, taskId: string, updates: Partial<ProjectTask>) => void;
  deleteTask: (projectId: string, taskId: string) => void;

  // Time Entries
  addTimeEntry: (projectId: string, entry: Omit<TimeEntry, 'id' | 'createdAt'>) => TimeEntry;

  // Checklist
  updateChecklistItem: (projectId: string, itemId: string, updates: Partial<ChecklistItem>) => void;

  // Clients
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClient: (id: string) => Client | undefined;

  // Models
  getModel: (id: string) => BoatModel | undefined;

  // Numbering
  getNextProjectNumber: () => string;
  getNextQuoteNumber: () => string;

  // Utilities
  recalculateSpecification: (projectId: string) => void;
  recalculateEquipmentTotals: (projectId: string) => void;
}

type StoreV3ContextType = StoreV3State & StoreV3Actions;

// ============================================
// CONTEXT
// ============================================

const StoreV3Context = createContext<StoreV3ContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

export function StoreV3Provider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [models, setModels] = useState<BoatModel[]>([]);
  const [numbering, setNumbering] = useState<NumberingState>(DEFAULT_NUMBERING);
  const [isLoaded, setIsLoaded] = useState(false);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    const storedProjects = loadFromStorage<Project[]>(STORAGE_KEYS.PROJECTS, []);
    const storedClients = loadFromStorage<Client[]>(STORAGE_KEYS.CLIENTS, []);
    const storedModels = loadFromStorage<BoatModel[]>(STORAGE_KEYS.MODELS, []);
    const storedNumbering = loadFromStorage<NumberingState>(STORAGE_KEYS.NUMBERING, DEFAULT_NUMBERING);

    setProjects(storedProjects);
    setClients(storedClients);
    setNumbering(storedNumbering);

    // Initialize models if empty
    if (storedModels.length === 0) {
      const initialModels: BoatModel[] = DEFAULT_BOAT_MODELS.map((m, i) => ({
        ...m,
        id: `model-${i + 1}`,
        createdAt: now(),
        updatedAt: now(),
      }));
      setModels(initialModels);
      saveToStorage(STORAGE_KEYS.MODELS, initialModels);
    } else {
      setModels(storedModels);
    }

    setIsLoaded(true);
  }, []);

  // ============================================
  // PERSISTENCE
  // ============================================

  useEffect(() => {
    if (!isLoaded) return;
    saveToStorage(STORAGE_KEYS.PROJECTS, projects);
  }, [projects, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    saveToStorage(STORAGE_KEYS.CLIENTS, clients);
  }, [clients, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    saveToStorage(STORAGE_KEYS.NUMBERING, numbering);
  }, [numbering, isLoaded]);

  // ============================================
  // NUMBERING
  // ============================================

  const getNextProjectNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    const num = numbering.projectNext;
    setNumbering(prev => ({ ...prev, projectNext: prev.projectNext + 1 }));
    return `PRJ-${year}-${String(num).padStart(4, '0')}`;
  }, [numbering.projectNext]);

  const getNextQuoteNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    const num = numbering.quoteNext;
    setNumbering(prev => ({ ...prev, quoteNext: prev.quoteNext + 1 }));
    return `OFF-${year}-${String(num).padStart(4, '0')}`;
  }, [numbering.quoteNext]);

  // ============================================
  // PROJECTS
  // ============================================

  const createProject = useCallback((data: {
    title: string;
    projectType: Project['projectType'];
    clientId: string;
    modelId?: string;
    propulsionType?: string;
  }): Project => {
    const projectNumber = getNextProjectNumber();
    const model = data.modelId ? models.find(m => m.id === data.modelId) : undefined;
    const propulsion = (data.propulsionType || model?.defaultPropulsion || 'Electric') as Project['specification']['propulsionType'];

    // Create default production stages
    const defaultStages = getDefaultProductionStages().map((s, i) => ({
      ...s,
      id: generateId('stage-'),
    }));

    // Create default checklist
    const defaultChecklist = getDefaultDeliveryChecklist().map((c, i) => ({
      ...c,
      id: generateId('check-'),
    }));

    const newProject: Project = {
      id: generateId('proj-'),
      projectNumber,
      title: data.title,
      projectType: data.projectType,
      status: 'DRAFT',
      clientId: data.clientId,
      modelId: data.modelId,
      boatIdentity: {},
      specification: {
        lengthM: model?.lengthM || 0,
        beamM: model?.beamM || 0,
        draftM: model?.draftM || 0,
        weightKg: model?.weightKg || 0,
        maxPersons: model?.maxPersons || 0,
        designCategory: model?.designCategory || 'C',
        propulsionType: propulsion,
        propulsion: { motorCount: 0, totalPowerKw: 0 },
        electrical: { acSystem: false, shorepower: false, inverterCharger: false },
        safety: {
          fireExtinguishers: 0,
          lifeJackets: 0,
          lifebuoy: false,
          vhfRadio: false,
          epirb: false,
          flares: false,
          firstAidKit: false,
          bilgePump: false,
          navigationLights: false,
        },
        ceMarking: {
          manufacturer: 'NAVISOL B.V.',
          standardsApplied: ['ISO 12217', 'ISO 14946', 'ISO 10133'],
        },
        lastDerivedAt: now(),
      },
      equipment: {
        version: 1,
        status: 'DRAFT',
        items: [],
        subtotalExclVat: 0,
        totalExclVat: 0,
        vatRate: 21,
        vatAmount: 0,
        totalInclVat: 0,
        lastModifiedAt: now(),
        lastModifiedById: 'system',
      },
      documents: [],
      production: data.projectType === 'NEW_BUILD' ? {
        stages: defaultStages,
        tasks: [],
        timeEntries: [],
        totalHoursWorked: 0,
        totalHoursBillable: 0,
      } : undefined,
      delivery: {
        checklist: defaultChecklist,
        checklistComplete: false,
      },
      createdById: 'system',
      createdAt: now(),
      updatedAt: now(),
    };

    setProjects(prev => [newProject, ...prev]);
    return newProject;
  }, [getNextProjectNumber, models]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, ...updates, updatedAt: now() } : p
    ));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const getProject = useCallback((id: string) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  const updateProjectStatus = useCallback((projectId: string, status: ProjectStatus) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, status, updatedAt: now() } : p
    ));
  }, []);

  // ============================================
  // EQUIPMENT
  // ============================================

  const addEquipmentItem = useCallback((projectId: string, item: Omit<EquipmentItem, 'id'>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const newItem: EquipmentItem = {
        ...item,
        id: generateId('equip-'),
      };
      return {
        ...p,
        equipment: {
          ...p.equipment,
          items: [...p.equipment.items, newItem],
          lastModifiedAt: now(),
        },
        updatedAt: now(),
      };
    }));
  }, []);

  const updateEquipmentItem = useCallback((projectId: string, itemId: string, updates: Partial<EquipmentItem>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        equipment: {
          ...p.equipment,
          items: p.equipment.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
          lastModifiedAt: now(),
        },
        updatedAt: now(),
      };
    }));
  }, []);

  const removeEquipmentItem = useCallback((projectId: string, itemId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        equipment: {
          ...p.equipment,
          items: p.equipment.items.filter(item => item.id !== itemId),
          lastModifiedAt: now(),
        },
        updatedAt: now(),
      };
    }));
  }, []);

  const freezeEquipment = useCallback((projectId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        equipment: {
          ...p.equipment,
          status: 'FROZEN',
          frozenAt: now(),
          frozenById: 'system',
        },
        updatedAt: now(),
      };
    }));
  }, []);

  const recalculateEquipmentTotals = useCallback((projectId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;

      const includedItems = p.equipment.items.filter(i => i.isIncluded);
      const subtotal = includedItems.reduce((sum, i) => sum + i.lineTotalExclVat, 0);
      const discountAmount = p.equipment.discountPercent
        ? subtotal * (p.equipment.discountPercent / 100)
        : 0;
      const totalExclVat = subtotal - discountAmount;
      const vatAmount = totalExclVat * (p.equipment.vatRate / 100);
      const totalInclVat = totalExclVat + vatAmount;

      return {
        ...p,
        equipment: {
          ...p.equipment,
          subtotalExclVat: subtotal,
          discountAmount,
          totalExclVat,
          vatAmount,
          totalInclVat,
          lastModifiedAt: now(),
        },
        updatedAt: now(),
      };
    }));
  }, []);

  // ============================================
  // DOCUMENTS
  // ============================================

  const addDocument = useCallback((projectId: string, doc: Omit<ProjectDocument, 'id' | 'createdAt'>): ProjectDocument => {
    const newDoc: ProjectDocument = {
      ...doc,
      id: generateId('doc-'),
      createdAt: now(),
    };

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        documents: [newDoc, ...p.documents],
        updatedAt: now(),
      };
    }));

    return newDoc;
  }, []);

  const updateDocument = useCallback((projectId: string, docId: string, updates: Partial<ProjectDocument>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        documents: p.documents.map(d =>
          d.id === docId ? { ...d, ...updates } : d
        ),
        updatedAt: now(),
      };
    }));
  }, []);

  const getDocumentsByType = useCallback((projectId: string, type: DocumentType): ProjectDocument[] => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return [];
    return project.documents
      .filter(d => d.type === type)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [projects]);

  const getLatestDocument = useCallback((projectId: string, type: DocumentType): ProjectDocument | undefined => {
    const docs = getDocumentsByType(projectId, type);
    return docs.length > 0 ? docs[0] : undefined;
  }, [getDocumentsByType]);

  // ============================================
  // PRODUCTION
  // ============================================

  const updateProductionStage = useCallback((projectId: string, stageId: string, updates: Partial<ProductionStage>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId || !p.production) return p;
      return {
        ...p,
        production: {
          ...p.production,
          stages: p.production.stages.map(s =>
            s.id === stageId ? { ...s, ...updates } : s
          ),
        },
        updatedAt: now(),
      };
    }));
  }, []);

  // ============================================
  // TASKS
  // ============================================

  const addTask = useCallback((projectId: string, task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>): ProjectTask => {
    const newTask: ProjectTask = {
      ...task,
      id: generateId('task-'),
      createdAt: now(),
      updatedAt: now(),
    };

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId || !p.production) return p;
      return {
        ...p,
        production: {
          ...p.production,
          tasks: [...p.production.tasks, newTask],
        },
        updatedAt: now(),
      };
    }));

    return newTask;
  }, []);

  const updateTask = useCallback((projectId: string, taskId: string, updates: Partial<ProjectTask>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId || !p.production) return p;
      return {
        ...p,
        production: {
          ...p.production,
          tasks: p.production.tasks.map(t =>
            t.id === taskId ? { ...t, ...updates, updatedAt: now() } : t
          ),
        },
        updatedAt: now(),
      };
    }));
  }, []);

  const deleteTask = useCallback((projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId || !p.production) return p;
      return {
        ...p,
        production: {
          ...p.production,
          tasks: p.production.tasks.filter(t => t.id !== taskId),
        },
        updatedAt: now(),
      };
    }));
  }, []);

  // ============================================
  // TIME ENTRIES
  // ============================================

  const addTimeEntry = useCallback((projectId: string, entry: Omit<TimeEntry, 'id' | 'createdAt'>): TimeEntry => {
    const newEntry: TimeEntry = {
      ...entry,
      id: generateId('time-'),
      createdAt: now(),
    };

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId || !p.production) return p;

      const entries = [...p.production.timeEntries, newEntry];
      const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
      const billableMinutes = entries.filter(e => e.isBillable).reduce((sum, e) => sum + e.durationMinutes, 0);

      return {
        ...p,
        production: {
          ...p.production,
          timeEntries: entries,
          totalHoursWorked: totalMinutes / 60,
          totalHoursBillable: billableMinutes / 60,
        },
        updatedAt: now(),
      };
    }));

    return newEntry;
  }, []);

  // ============================================
  // CHECKLIST
  // ============================================

  const updateChecklistItem = useCallback((projectId: string, itemId: string, updates: Partial<ChecklistItem>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId || !p.delivery) return p;

      const checklist = p.delivery.checklist.map(c =>
        c.id === itemId ? { ...c, ...updates } : c
      );

      // Check if all required items are complete
      const requiredItems = checklist.filter(c => c.isRequired);
      const checklistComplete = requiredItems.every(c => c.isCompleted || c.isWaived);

      return {
        ...p,
        delivery: {
          ...p.delivery,
          checklist,
          checklistComplete,
        },
        updatedAt: now(),
      };
    }));
  }, []);

  // ============================================
  // CLIENTS
  // ============================================

  const addClient = useCallback((client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Client => {
    const newClient: Client = {
      ...client,
      id: generateId('client-'),
      createdAt: now(),
      updatedAt: now(),
    };
    setClients(prev => [newClient, ...prev]);
    return newClient;
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: now() } : c
    ));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  }, []);

  const getClient = useCallback((id: string) => {
    return clients.find(c => c.id === id);
  }, [clients]);

  // ============================================
  // MODELS
  // ============================================

  const getModel = useCallback((id: string) => {
    return models.find(m => m.id === id);
  }, [models]);

  // ============================================
  // SPECIFICATION
  // ============================================

  const recalculateSpecification = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.modelId) return;

    const model = models.find(m => m.id === project.modelId);
    if (!model) return;

    const newSpec = deriveSpecificationFromEquipment(
      model,
      project.equipment,
      project.specification.propulsionType
    );

    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, specification: newSpec, updatedAt: now() } : p
    ));
  }, [projects, models]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: StoreV3ContextType = {
    // State
    projects,
    clients,
    models,
    numbering,
    isLoaded,

    // Projects
    createProject,
    updateProject,
    deleteProject,
    getProject,
    updateProjectStatus,

    // Equipment
    addEquipmentItem,
    updateEquipmentItem,
    removeEquipmentItem,
    freezeEquipment,
    recalculateEquipmentTotals,

    // Documents
    addDocument,
    updateDocument,
    getDocumentsByType,
    getLatestDocument,

    // Production
    updateProductionStage,

    // Tasks
    addTask,
    updateTask,
    deleteTask,

    // Time Entries
    addTimeEntry,

    // Checklist
    updateChecklistItem,

    // Clients
    addClient,
    updateClient,
    deleteClient,
    getClient,

    // Models
    getModel,

    // Numbering
    getNextProjectNumber,
    getNextQuoteNumber,

    // Utilities
    recalculateSpecification,
  };

  return (
    <StoreV3Context.Provider value={value}>
      {children}
    </StoreV3Context.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useStoreV3() {
  const context = useContext(StoreV3Context);
  if (!context) {
    throw new Error('useStoreV3 must be used within a StoreV3Provider');
  }
  return context;
}

// ============================================
// HELPER HOOKS
// ============================================

export function useProject(projectId: string) {
  const { getProject, getClient, getModel } = useStoreV3();
  const project = getProject(projectId);
  const client = project ? getClient(project.clientId) : undefined;
  const model = project?.modelId ? getModel(project.modelId) : undefined;
  return { project, client, model };
}

export function useProjectDocuments(projectId: string, type?: DocumentType) {
  const { getProject, getDocumentsByType } = useStoreV3();
  const project = getProject(projectId);

  if (!project) return [];
  if (type) return getDocumentsByType(projectId, type);
  return project.documents;
}
