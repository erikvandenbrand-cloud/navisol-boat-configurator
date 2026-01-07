'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type Client,
  type Contact,
  type Model,
  type Part,
  type PartStock,
  type Project,
  type Vessel,
  type Quotation,
  type Task,
  type TimeEntry,
  type Checklist,
  type ChecklistItem,
  type User,
  type GlobalSettings,
  type Category,
  type EquipmentTemplate,
  type EquipmentTemplateItem,
  type EquipmentList,
  type EquipmentItem,
  type ChangeOrder,
  type BoatBrand,
  DEFAULT_SETTINGS,
  DEFAULT_MODELS,
  DEFAULT_CATEGORIES,
  DEFAULT_USERS,
  DEFAULT_BRANDS,
  ROLE_PERMISSIONS,
  type PermissionKey,
  type UserRole,
} from './types-v2';

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  CLIENTS: 'navisol_v2_clients',
  CONTACTS: 'navisol_v2_contacts',
  BRANDS: 'navisol_v2_brands',
  MODELS: 'navisol_v2_models',
  PARTS: 'navisol_v2_parts',
  PART_STOCK: 'navisol_v2_part_stock',
  CATEGORIES: 'navisol_v2_categories',
  PROJECTS: 'navisol_v2_projects',
  VESSELS: 'navisol_v2_vessels',
  QUOTATIONS: 'navisol_v2_quotations',
  TASKS: 'navisol_v2_tasks',
  TIME_ENTRIES: 'navisol_v2_time_entries',
  CHECKLISTS: 'navisol_v2_checklists',
  CHECKLIST_ITEMS: 'navisol_v2_checklist_items',
  EQUIPMENT_TEMPLATES: 'navisol_v2_equipment_templates',
  EQUIPMENT_TEMPLATE_ITEMS: 'navisol_v2_equipment_template_items',
  EQUIPMENT_LISTS: 'navisol_v2_equipment_lists',
  EQUIPMENT_ITEMS: 'navisol_v2_equipment_items',
  CHANGE_ORDERS: 'navisol_v2_change_orders',
  USERS: 'navisol_v2_users',
  SETTINGS: 'navisol_v2_settings',
  CURRENT_USER: 'navisol_v2_current_user',
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(prefix: string = ''): string {
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
// STORE STATE TYPE
// ============================================

interface StoreState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;

  // CRM
  clients: Client[];
  contacts: Contact[];

  // Catalog
  brands: BoatBrand[];
  models: Model[];
  parts: Part[];
  partStock: PartStock[];
  categories: Category[];
  equipmentTemplates: EquipmentTemplate[];
  equipmentTemplateItems: EquipmentTemplateItem[];

  // Projects
  projects: Project[];
  vessels: Vessel[];
  equipmentLists: EquipmentList[];
  equipmentItems: EquipmentItem[];
  changeOrders: ChangeOrder[];

  // Commercial
  quotations: Quotation[];

  // Planning
  tasks: Task[];
  timeEntries: TimeEntry[];

  // Documentation
  checklists: Checklist[];
  checklistItems: ChecklistItem[];

  // Admin
  users: User[];
  settings: GlobalSettings;
}

interface StoreActions {
  // Auth
  login: (username: string, password: string) => boolean;
  logout: () => void;
  hasPermission: (permission: PermissionKey) => boolean;

  // CRM
  addClient: (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addContact: (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>) => Contact;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  // Catalog - Brands
  addBrand: (brand: Omit<BoatBrand, 'id' | 'created_at' | 'updated_at'>) => BoatBrand;
  updateBrand: (id: string, updates: Partial<BoatBrand>) => void;
  deleteBrand: (id: string) => void;

  // Catalog - Models
  addModel: (model: Omit<Model, 'id' | 'created_at' | 'updated_at'>) => Model;
  updateModel: (id: string, updates: Partial<Model>) => void;
  deleteModel: (id: string) => void;

  // Catalog - Parts
  addPart: (part: Omit<Part, 'id' | 'created_at' | 'updated_at'>) => Part;
  updatePart: (id: string, updates: Partial<Part>) => void;
  deletePart: (id: string) => void;

  // Projects
  addProject: (project: Omit<Project, 'id' | 'project_number' | 'created_at' | 'updated_at'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Vessels
  addVessel: (vessel: Omit<Vessel, 'id' | 'created_at' | 'updated_at'>) => Vessel;
  updateVessel: (id: string, updates: Partial<Vessel>) => void;
  deleteVessel: (id: string) => void;

  // Tasks
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // Settings
  updateSettings: (updates: Partial<GlobalSettings>) => void;

  // Users
  addUser: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>) => User;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Utilities
  getNextProjectNumber: () => string;
  getNextQuotationNumber: () => string;
}

type StoreContextType = StoreState & StoreActions;

// ============================================
// CONTEXT
// ============================================

const StoreContext = createContext<StoreContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

export function StoreProviderV2({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // CRM State
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Catalog State
  const [brands, setBrands] = useState<BoatBrand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [partStock, setPartStock] = useState<PartStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [equipmentTemplates, setEquipmentTemplates] = useState<EquipmentTemplate[]>([]);
  const [equipmentTemplateItems, setEquipmentTemplateItems] = useState<EquipmentTemplateItem[]>([]);

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [equipmentLists, setEquipmentLists] = useState<EquipmentList[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);

  // Commercial State
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  // Planning State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  // Documentation State
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  // Admin State
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    // Load from localStorage
    const storedClients = loadFromStorage<Client[]>(STORAGE_KEYS.CLIENTS, []);
    const storedContacts = loadFromStorage<Contact[]>(STORAGE_KEYS.CONTACTS, []);
    const storedModels = loadFromStorage<Model[]>(STORAGE_KEYS.MODELS, []);
    const storedParts = loadFromStorage<Part[]>(STORAGE_KEYS.PARTS, []);
    const storedPartStock = loadFromStorage<PartStock[]>(STORAGE_KEYS.PART_STOCK, []);
    const storedCategories = loadFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    const storedProjects = loadFromStorage<Project[]>(STORAGE_KEYS.PROJECTS, []);
    const storedVessels = loadFromStorage<Vessel[]>(STORAGE_KEYS.VESSELS, []);
    const storedQuotations = loadFromStorage<Quotation[]>(STORAGE_KEYS.QUOTATIONS, []);
    const storedTasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, []);
    const storedTimeEntries = loadFromStorage<TimeEntry[]>(STORAGE_KEYS.TIME_ENTRIES, []);
    const storedChecklists = loadFromStorage<Checklist[]>(STORAGE_KEYS.CHECKLISTS, []);
    const storedChecklistItems = loadFromStorage<ChecklistItem[]>(STORAGE_KEYS.CHECKLIST_ITEMS, []);
    const storedEquipmentTemplates = loadFromStorage<EquipmentTemplate[]>(STORAGE_KEYS.EQUIPMENT_TEMPLATES, []);
    const storedEquipmentTemplateItems = loadFromStorage<EquipmentTemplateItem[]>(STORAGE_KEYS.EQUIPMENT_TEMPLATE_ITEMS, []);
    const storedEquipmentLists = loadFromStorage<EquipmentList[]>(STORAGE_KEYS.EQUIPMENT_LISTS, []);
    const storedEquipmentItems = loadFromStorage<EquipmentItem[]>(STORAGE_KEYS.EQUIPMENT_ITEMS, []);
    const storedChangeOrders = loadFromStorage<ChangeOrder[]>(STORAGE_KEYS.CHANGE_ORDERS, []);
    const storedUsers = loadFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    const storedSettings = loadFromStorage<GlobalSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const storedCurrentUser = loadFromStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);

    // Initialize with defaults if empty
    if (storedModels.length === 0) {
      const initialModels: Model[] = DEFAULT_MODELS.map((m, i) => ({
        ...m,
        id: `model-${i + 1}`,
        created_at: now(),
        updated_at: now(),
      }));
      setModels(initialModels);
      saveToStorage(STORAGE_KEYS.MODELS, initialModels);
    } else {
      setModels(storedModels);
    }

    if (storedCategories.length === 0) {
      setCategories(DEFAULT_CATEGORIES);
      saveToStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    } else {
      setCategories(storedCategories);
    }

    if (storedUsers.length === 0) {
      const initialUsers: User[] = DEFAULT_USERS.map((u, i) => ({
        ...u,
        id: `user-${i + 1}`,
        created_at: now(),
        updated_at: now(),
      }));
      setUsers(initialUsers);
      saveToStorage(STORAGE_KEYS.USERS, initialUsers);
    } else {
      setUsers(storedUsers);
    }

    setClients(storedClients);
    setContacts(storedContacts);
    setParts(storedParts);
    setPartStock(storedPartStock);
    setProjects(storedProjects);
    setVessels(storedVessels);
    setQuotations(storedQuotations);
    setTasks(storedTasks);
    setTimeEntries(storedTimeEntries);
    setChecklists(storedChecklists);
    setChecklistItems(storedChecklistItems);
    setEquipmentTemplates(storedEquipmentTemplates);
    setEquipmentTemplateItems(storedEquipmentTemplateItems);
    setEquipmentLists(storedEquipmentLists);
    setEquipmentItems(storedEquipmentItems);
    setChangeOrders(storedChangeOrders);
    setSettings(storedSettings);
    setCurrentUser(storedCurrentUser);

    setIsInitialized(true);
  }, []);

  // ============================================
  // PERSISTENCE
  // ============================================

  useEffect(() => {
    if (!isInitialized) return;
    saveToStorage(STORAGE_KEYS.CLIENTS, clients);
  }, [clients, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
  }, [contacts, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    saveToStorage(STORAGE_KEYS.MODELS, models);
  }, [models, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    saveToStorage(STORAGE_KEYS.PARTS, parts);
  }, [parts, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    saveToStorage(STORAGE_KEYS.PROJECTS, projects);
  }, [projects, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    saveToStorage(STORAGE_KEYS.VESSELS, vessels);
  }, [vessels, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    saveToStorage(STORAGE_KEYS.TASKS, tasks);
  }, [tasks, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    saveToStorage(STORAGE_KEYS.USERS, users);
  }, [users, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  }, [settings, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    saveToStorage(STORAGE_KEYS.CURRENT_USER, currentUser);
  }, [currentUser, isInitialized]);

  // ============================================
  // AUTH ACTIONS
  // ============================================

  const login = useCallback((username: string, password: string): boolean => {
    const user = users.find(u => u.username === username && u.password_hash === password && u.is_active);
    if (user) {
      setCurrentUser({ ...user, last_login_at: now() });
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const hasPermission = useCallback((permission: PermissionKey): boolean => {
    if (!currentUser) return false;
    const permissions = ROLE_PERMISSIONS[currentUser.role as UserRole] || [];
    return permissions.includes(permission);
  }, [currentUser]);

  // ============================================
  // CRM ACTIONS
  // ============================================

  const addClient = useCallback((client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Client => {
    const newClient: Client = {
      ...client,
      id: generateId('client-'),
      created_at: now(),
      updated_at: now(),
    };
    setClients(prev => [...prev, newClient]);
    return newClient;
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates, updated_at: now() } : c
    ));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  }, []);

  const addContact = useCallback((contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Contact => {
    const newContact: Contact = {
      ...contact,
      id: generateId('contact-'),
      created_at: now(),
      updated_at: now(),
    };
    setContacts(prev => [...prev, newContact]);
    return newContact;
  }, []);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates, updated_at: now() } : c
    ));
  }, []);

  const deleteContact = useCallback((id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  }, []);

  // ============================================
  // CATALOG ACTIONS
  // ============================================

  // Brand Actions
  const addBrand = useCallback((brand: Omit<BoatBrand, 'id' | 'created_at' | 'updated_at'>): BoatBrand => {
    const newBrand: BoatBrand = {
      ...brand,
      id: generateId('brand-'),
      created_at: now(),
      updated_at: now(),
    };
    setBrands(prev => [...prev, newBrand]);
    return newBrand;
  }, []);

  const updateBrand = useCallback((id: string, updates: Partial<BoatBrand>) => {
    setBrands(prev => prev.map(b =>
      b.id === id ? { ...b, ...updates, updated_at: now() } : b
    ));
  }, []);

  const deleteBrand = useCallback((id: string) => {
    setBrands(prev => prev.filter(b => b.id !== id));
  }, []);

  // Model Actions
  const addModel = useCallback((model: Omit<Model, 'id' | 'created_at' | 'updated_at'>): Model => {
    const newModel: Model = {
      ...model,
      id: generateId('model-'),
      created_at: now(),
      updated_at: now(),
    };
    setModels(prev => [...prev, newModel]);
    return newModel;
  }, []);

  const updateModel = useCallback((id: string, updates: Partial<Model>) => {
    setModels(prev => prev.map(m =>
      m.id === id ? { ...m, ...updates, updated_at: now() } : m
    ));
  }, []);

  const deleteModel = useCallback((id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
  }, []);

  const addPart = useCallback((part: Omit<Part, 'id' | 'created_at' | 'updated_at'>): Part => {
    const newPart: Part = {
      ...part,
      id: generateId('part-'),
      created_at: now(),
      updated_at: now(),
    };
    setParts(prev => [...prev, newPart]);
    return newPart;
  }, []);

  const updatePart = useCallback((id: string, updates: Partial<Part>) => {
    setParts(prev => prev.map(p =>
      p.id === id ? { ...p, ...updates, updated_at: now() } : p
    ));
  }, []);

  const deletePart = useCallback((id: string) => {
    setParts(prev => prev.filter(p => p.id !== id));
  }, []);

  // ============================================
  // PROJECT ACTIONS
  // ============================================

  const getNextProjectNumber = useCallback((): string => {
    const nextNum = settings.numbering.project_next;
    setSettings(prev => ({
      ...prev,
      numbering: { ...prev.numbering, project_next: nextNum + 1 }
    }));
    return `${settings.numbering.project_prefix}${nextNum}`;
  }, [settings.numbering]);

  const getNextQuotationNumber = useCallback((): string => {
    const nextNum = settings.numbering.quotation_next;
    setSettings(prev => ({
      ...prev,
      numbering: { ...prev.numbering, quotation_next: nextNum + 1 }
    }));
    return `${settings.numbering.quotation_prefix}${nextNum}`;
  }, [settings.numbering]);

  const addProject = useCallback((project: Omit<Project, 'id' | 'project_number' | 'created_at' | 'updated_at'>): Project => {
    const projectNumber = getNextProjectNumber();
    const newProject: Project = {
      ...project,
      id: generateId('project-'),
      project_number: projectNumber,
      created_at: now(),
      updated_at: now(),
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, [getNextProjectNumber]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, ...updates, updated_at: now() } : p
    ));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  // ============================================
  // VESSEL ACTIONS
  // ============================================

  const addVessel = useCallback((vessel: Omit<Vessel, 'id' | 'created_at' | 'updated_at'>): Vessel => {
    const newVessel: Vessel = {
      ...vessel,
      id: generateId('vessel-'),
      created_at: now(),
      updated_at: now(),
    };
    setVessels(prev => [...prev, newVessel]);
    return newVessel;
  }, []);

  const updateVessel = useCallback((id: string, updates: Partial<Vessel>) => {
    setVessels(prev => prev.map(v =>
      v.id === id ? { ...v, ...updates, updated_at: now() } : v
    ));
  }, []);

  const deleteVessel = useCallback((id: string) => {
    setVessels(prev => prev.filter(v => v.id !== id));
  }, []);

  // ============================================
  // TASK ACTIONS
  // ============================================

  const addTask = useCallback((task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Task => {
    const newTask: Task = {
      ...task,
      id: generateId('task-'),
      created_at: now(),
      updated_at: now(),
    };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates, updated_at: now() } : t
    ));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  // ============================================
  // SETTINGS ACTIONS
  // ============================================

  const updateSettings = useCallback((updates: Partial<GlobalSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // ============================================
  // USER ACTIONS
  // ============================================

  const addUser = useCallback((user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User => {
    const newUser: User = {
      ...user,
      id: generateId('user-'),
      created_at: now(),
      updated_at: now(),
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, ...updates, updated_at: now() } : u
    ));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: StoreContextType = {
    // Auth
    currentUser,
    isAuthenticated: !!currentUser,
    login,
    logout,
    hasPermission,

    // CRM
    clients,
    contacts,
    addClient,
    updateClient,
    deleteClient,
    addContact,
    updateContact,
    deleteContact,

    // Catalog
    brands,
    models,
    parts,
    partStock,
    categories,
    equipmentTemplates,
    equipmentTemplateItems,
    addBrand,
    updateBrand,
    deleteBrand,
    addModel,
    updateModel,
    deleteModel,
    addPart,
    updatePart,
    deletePart,

    // Projects
    projects,
    vessels,
    equipmentLists,
    equipmentItems,
    changeOrders,
    addProject,
    updateProject,
    deleteProject,
    addVessel,
    updateVessel,
    deleteVessel,

    // Commercial
    quotations,

    // Planning
    tasks,
    timeEntries,
    addTask,
    updateTask,
    deleteTask,

    // Documentation
    checklists,
    checklistItems,

    // Admin
    users,
    settings,
    updateSettings,
    addUser,
    updateUser,
    deleteUser,

    // Utilities
    getNextProjectNumber,
    getNextQuotationNumber,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useStoreV2() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStoreV2 must be used within a StoreProviderV2');
  }
  return context;
}

// ============================================
// HELPER HOOKS
// ============================================

export function useModels() {
  const { models } = useStoreV2();
  return models.filter(m => m.is_active);
}

export function useModelsByRange(range: string) {
  const { models } = useStoreV2();
  return models.filter(m => m.range === range && m.is_active);
}

export function useClients() {
  const { clients } = useStoreV2();
  return clients;
}

export function useProjects() {
  const { projects } = useStoreV2();
  return projects;
}

export function useProjectsByType(type: string) {
  const { projects } = useStoreV2();
  return projects.filter(p => p.project_type === type);
}
