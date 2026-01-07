'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Article, ArticleGroup, ArticleGroupItem, BoatConfiguration, ConfigurationItem, CEDocument, PropulsionType, BoatModel, SteeringType, GlobalSettings, Quotation, Client, ClientBoat } from './types';
import { SAMPLE_ARTICLES } from './sample-data';
import { generateId, formatEuroDate, getDatePlusDays, calculateLineTotal, calculateVAT } from './formatting';
import { DEFAULT_SETTINGS } from './types';
import {
  saveArticles,
  loadArticles,
  saveConfigurations,
  loadConfigurations,
  saveCEDocuments,
  loadCEDocuments,
  saveSettings,
  loadSettings,
  getNextQuotationNumber,
} from './persistence';

// Real Eagle Boats model groups
const EAGLE_ALL_MODELS = ['Eagle 525T', 'Eagle 25TS', 'Eagle 28TS', 'Eagle 32TS', 'Eagle C550', 'Eagle C570', 'Eagle C720', 'Eagle C999', 'Eagle 28SG', 'Eagle Hybruut 28'];
const EAGLE_MEDIUM_UP = ['Eagle 25TS', 'Eagle 28TS', 'Eagle 32TS', 'Eagle C720', 'Eagle C999', 'Eagle 28SG', 'Eagle Hybruut 28'];
const EAGLE_LARGE_UP = ['Eagle 28TS', 'Eagle 32TS', 'Eagle C999', 'Eagle Hybruut 28'];
const EAGLE_SMALL_MEDIUM = ['Eagle 525T', 'Eagle 25TS', 'Eagle C550', 'Eagle C570', 'Eagle C720', 'Eagle 28SG'];

// Helper function to create sample article groups
function createSampleArticleGroups(articles: Article[]): ArticleGroup[] {
  const findArticle = (namePattern: string) =>
    articles.find(a => a.part_name.toLowerCase().includes(namePattern.toLowerCase()));

  const groups: ArticleGroup[] = [];
  const now = new Date().toISOString();

  // 1. Shaft Seal Kit 40mm
  const shaftSeals = articles.filter(a =>
    a.subcategory?.includes('Propeller Shaft') ||
    a.part_name.toLowerCase().includes('shaft') ||
    a.part_name.toLowerCase().includes('seal')
  ).slice(0, 3);

  if (shaftSeals.length > 0) {
    groups.push({
      id: generateId(),
      name: 'Shaft Seal Kit 40mm',
      description: 'Complete shaft seal assembly kit for 40mm propeller shafts. Includes seals, bearings, and mounting hardware.',
      category: '2. Propulsion & Drivetrain',
      subcategory: '2.2 Propeller Shaft System',
      items: shaftSeals.map(a => ({ article_id: a.id, quantity: 1 })),
      use_custom_price: true,
      custom_price_excl_vat: 850,
      boat_model_compat: EAGLE_MEDIUM_UP,
      standard_or_optional: 'Standard',
      is_active: true,
      internal_sku: 'KIT-SEAL-40',
      notes: 'Compatible with Vetus and PSS shaft systems',
      created_at: now,
      updated_at: now,
    });
  }

  // 2. Electric Propulsion Package 15kW
  const electricMotor = findArticle('Electric Inboard Motor 15kW');
  const battery = findArticle('Battery Pack');
  const charger = findArticle('Shore Power Charger') || findArticle('Charger');

  const electricItems: ArticleGroupItem[] = [];
  if (electricMotor) electricItems.push({ article_id: electricMotor.id, quantity: 1 });
  if (battery) electricItems.push({ article_id: battery.id, quantity: 2 });
  if (charger) electricItems.push({ article_id: charger.id, quantity: 1 });

  if (electricItems.length >= 2) {
    groups.push({
      id: generateId(),
      name: 'Electric Propulsion Package 15kW',
      description: 'Complete electric propulsion system including motor, batteries, and charging solution. Ideal for TS Series and Classic models.',
      category: '2. Propulsion & Drivetrain',
      subcategory: '2.1 Motorisation (Electric/Diesel/Hybrid)',
      items: electricItems,
      use_custom_price: true,
      custom_price_excl_vat: 38500,
      boat_model_compat: EAGLE_SMALL_MEDIUM,
      standard_or_optional: 'Standard',
      is_active: true,
      internal_sku: 'PKG-ELEC-15',
      notes: 'Torqeedo motor with Victron battery system',
      created_at: now,
      updated_at: now,
    });
  }

  // 3. Navigation Electronics Kit
  const navLights = findArticle('Navigation Light');
  const vhf = findArticle('VHF Radio');
  const bowThruster = findArticle('Bow Thruster');

  const navItems: ArticleGroupItem[] = [];
  if (navLights) navItems.push({ article_id: navLights.id, quantity: 1 });
  if (vhf) navItems.push({ article_id: vhf.id, quantity: 1 });
  if (bowThruster) navItems.push({ article_id: bowThruster.id, quantity: 1 });

  if (navItems.length >= 2) {
    groups.push({
      id: generateId(),
      name: 'Navigation Electronics Kit',
      description: 'Essential navigation and communication electronics package for safe boating.',
      category: '4. Electrical System & Navigation',
      subcategory: '4.2 Navigation & Communication',
      items: navItems,
      use_custom_price: false,
      boat_model_compat: EAGLE_ALL_MODELS,
      standard_or_optional: 'Optional',
      is_active: true,
      internal_sku: 'KIT-NAV-01',
      notes: 'VHF with DSC capability included',
      created_at: now,
      updated_at: now,
    });
  }

  // 4. Mooring & Anchoring Kit
  const anchor = findArticle('Anchor');
  const fender = findArticle('Fender');
  const cleat = findArticle('Cleat');

  const mooringItems: ArticleGroupItem[] = [];
  if (anchor) mooringItems.push({ article_id: anchor.id, quantity: 1 });
  if (fender) mooringItems.push({ article_id: fender.id, quantity: 4 });
  if (cleat) mooringItems.push({ article_id: cleat.id, quantity: 4 });

  if (mooringItems.length >= 1) {
    groups.push({
      id: generateId(),
      name: 'Mooring & Anchoring Kit',
      description: 'Complete mooring set with anchor, fenders, and cleats for safe docking and anchoring.',
      category: '5. Deck Equipment & Comfort',
      subcategory: '5.1 Mooring & Anchoring',
      items: mooringItems,
      use_custom_price: false,
      boat_model_compat: EAGLE_ALL_MODELS,
      standard_or_optional: 'Standard',
      is_active: true,
      internal_sku: 'KIT-MOOR-01',
      created_at: now,
      updated_at: now,
    });
  }

  // 5. Hydraulic Steering System
  const helmPump = findArticle('Hydraulic Helm');
  const steeringWheel = findArticle('Steering Wheel');

  const steeringItems: ArticleGroupItem[] = [];
  if (helmPump) steeringItems.push({ article_id: helmPump.id, quantity: 1 });
  if (steeringWheel) steeringItems.push({ article_id: steeringWheel.id, quantity: 1 });

  if (steeringItems.length >= 2) {
    groups.push({
      id: generateId(),
      name: 'Hydraulic Steering System Complete',
      description: 'Complete hydraulic steering system with helm pump and premium steering wheel.',
      category: '3. Steering System',
      subcategory: '3.1 Hydraulic Steering',
      items: steeringItems,
      use_custom_price: true,
      custom_price_excl_vat: 1595,
      boat_model_compat: EAGLE_ALL_MODELS,
      standard_or_optional: 'Standard',
      is_active: true,
      internal_sku: 'KIT-STEER-HYD',
      notes: 'Vetus hydraulic system with Ultraflex wheel',
      created_at: now,
      updated_at: now,
    });
  }

  // 6. Comfort Package (Bimini, Cushions, etc.)
  const bimini = findArticle('Bimini');
  const cushions = findArticle('Cushion');
  const swimPlatform = findArticle('Swim Platform');

  const comfortItems: ArticleGroupItem[] = [];
  if (bimini) comfortItems.push({ article_id: bimini.id, quantity: 1 });
  if (cushions) comfortItems.push({ article_id: cushions.id, quantity: 1 });
  if (swimPlatform) comfortItems.push({ article_id: swimPlatform.id, quantity: 1 });

  if (comfortItems.length >= 1) {
    groups.push({
      id: generateId(),
      name: 'Comfort & Sun Protection Package',
      description: 'Premium comfort package including sun protection and deck amenities.',
      category: '5. Deck Equipment & Comfort',
      subcategory: '5.2 Sun Protection',
      items: comfortItems,
      use_custom_price: false,
      boat_model_compat: EAGLE_MEDIUM_UP,
      standard_or_optional: 'Optional',
      is_active: true,
      internal_sku: 'PKG-COMFORT-01',
      created_at: now,
      updated_at: now,
    });
  }

  return groups;
}

interface NavisolState {
  // Database
  articles: Article[];
  articleGroups: ArticleGroup[];
  configurations: BoatConfiguration[];
  ceDocuments: CEDocument[];
  quotations: Quotation[];
  clients: Client[];
  clientBoats: ClientBoat[];
  settings: GlobalSettings;

  // Current configuration wizard
  currentStep: number;
  currentConfig: Partial<BoatConfiguration>;
  selectedItems: ConfigurationItem[];

  // UI State
  isLoading: boolean;

  // Actions
  addArticle: (article: Omit<Article, 'id'>) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
  searchArticles: (query: string) => Article[];
  importArticles: (articles: Partial<Article>[]) => number;

  // Article Group actions
  addArticleGroup: (group: Omit<ArticleGroup, 'id' | 'created_at' | 'updated_at'>) => ArticleGroup;
  updateArticleGroup: (id: string, updates: Partial<ArticleGroup>) => void;
  deleteArticleGroup: (id: string) => void;
  getArticleGroupById: (id: string) => ArticleGroup | undefined;
  getArticleGroupsBySubcategory: (subcategory: string) => ArticleGroup[];
  calculateGroupPrice: (group: ArticleGroup) => number;

  // Configuration actions
  setCurrentStep: (step: number) => void;
  updateCurrentConfig: (updates: Partial<BoatConfiguration>) => void;
  addItemToConfig: (article: Article, quantity?: number) => void;
  removeItemFromConfig: (articleId: string) => void;
  updateItemQuantity: (articleId: string, quantity: number) => void;
  toggleItemInclusion: (articleId: string) => void;
  saveConfiguration: (clientId?: string, clientBoatId?: string) => BoatConfiguration | null;
  loadConfiguration: (id: string) => void;
  deleteConfiguration: (id: string) => void;
  resetConfiguration: () => void;

  // Quotation actions
  saveQuotation: (quotation: Quotation) => void;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;

  // Client actions
  addClient: (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClientById: (id: string) => Client | undefined;

  // Client Boat actions
  addClientBoat: (boat: Omit<ClientBoat, 'id' | 'created_at' | 'updated_at'>) => ClientBoat;
  updateClientBoat: (id: string, updates: Partial<ClientBoat>) => void;
  deleteClientBoat: (id: string) => void;
  getClientBoats: (clientId: string) => ClientBoat[];

  // CE Document actions
  addCEDocument: (doc: Omit<CEDocument, 'id'>) => void;
  updateCEDocument: (id: string, updates: Partial<CEDocument>) => void;
  deleteCEDocument: (id: string) => void;

  // Settings
  updateSettings: (updates: Partial<GlobalSettings>) => void;

  // Persistence
  exportAllData: () => string;
  importAllData: (data: string) => boolean;
}

const NavisolContext = createContext<NavisolState | undefined>(undefined);

export function NavisolProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [articleGroups, setArticleGroups] = useState<ArticleGroup[]>([]);
  const [configurations, setConfigurations] = useState<BoatConfiguration[]>([]);
  const [ceDocuments, setCEDocuments] = useState<CEDocument[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientBoats, setClientBoats] = useState<ClientBoat[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);

  const [currentStep, setCurrentStep] = useState(1);
  const [currentConfig, setCurrentConfig] = useState<Partial<BoatConfiguration>>({});
  const [selectedItems, setSelectedItems] = useState<ConfigurationItem[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const loadedArticles = loadArticles();
    const loadedConfigs = loadConfigurations();
    const loadedCEDocs = loadCEDocuments();
    const loadedSettings = loadSettings();

    setArticles(loadedArticles && loadedArticles.length > 0 ? loadedArticles : SAMPLE_ARTICLES);
    setConfigurations(loadedConfigs || []);
    setCEDocuments(loadedCEDocs || []);
    if (loadedSettings) {
      setSettings(loadedSettings);
    }

    // Load clients, boats, and article groups from localStorage
    try {
      const storedClients = localStorage.getItem('navisol_clients');
      const storedBoats = localStorage.getItem('navisol_client_boats');
      const storedQuotations = localStorage.getItem('navisol_quotations');
      const storedArticleGroups = localStorage.getItem('navisol_article_groups');
      if (storedClients) setClients(JSON.parse(storedClients));
      if (storedBoats) setClientBoats(JSON.parse(storedBoats));
      if (storedQuotations) setQuotations(JSON.parse(storedQuotations));

      // Load article groups or create sample ones
      if (storedArticleGroups) {
        setArticleGroups(JSON.parse(storedArticleGroups));
      } else {
        // Create sample article groups based on loaded articles
        const articlesData = loadedArticles && loadedArticles.length > 0 ? loadedArticles : SAMPLE_ARTICLES;
        const sampleGroups = createSampleArticleGroups(articlesData);
        setArticleGroups(sampleGroups);
      }
    } catch (e) {
      console.error('Failed to load clients/boats/groups:', e);
    }

    setIsLoading(false);
  }, []);

  // Save articles when they change
  useEffect(() => {
    if (!isLoading && articles.length > 0) {
      saveArticles(articles);
    }
  }, [articles, isLoading]);

  // Save configurations when they change
  useEffect(() => {
    if (!isLoading) {
      saveConfigurations(configurations);
    }
  }, [configurations, isLoading]);

  // Save CE documents when they change
  useEffect(() => {
    if (!isLoading) {
      saveCEDocuments(ceDocuments);
    }
  }, [ceDocuments, isLoading]);

  // Save settings when they change
  useEffect(() => {
    if (!isLoading) {
      saveSettings(settings);
    }
  }, [settings, isLoading]);

  // Save clients when they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading) {
      localStorage.setItem('navisol_clients', JSON.stringify(clients));
    }
  }, [clients, isLoading]);

  // Save client boats when they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading) {
      localStorage.setItem('navisol_client_boats', JSON.stringify(clientBoats));
    }
  }, [clientBoats, isLoading]);

  // Save quotations when they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading) {
      localStorage.setItem('navisol_quotations', JSON.stringify(quotations));
    }
  }, [quotations, isLoading]);

  // Save article groups when they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading) {
      localStorage.setItem('navisol_article_groups', JSON.stringify(articleGroups));
    }
  }, [articleGroups, isLoading]);

  // Article actions
  const addArticle = (article: Omit<Article, 'id'>) => {
    const newArticle = { ...article, id: generateId() } as Article;
    setArticles(prev => [...prev, newArticle]);
  };

  const updateArticle = (id: string, updates: Partial<Article>) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteArticle = (id: string) => {
    setArticles(prev => prev.filter(a => a.id !== id));
  };

  const searchArticles = (query: string): Article[] => {
    const lowerQuery = query.toLowerCase();
    return articles.filter(a =>
      a.part_name.toLowerCase().includes(lowerQuery) ||
      a.category.toLowerCase().includes(lowerQuery) ||
      a.subcategory.toLowerCase().includes(lowerQuery) ||
      a.brand?.toLowerCase().includes(lowerQuery) ||
      a.manufacturer_article_no?.toLowerCase().includes(lowerQuery)
    );
  };

  const importArticles = (newArticles: Partial<Article>[]): number => {
    let importedCount = 0;
    const articlesToAdd: Article[] = [];

    for (const article of newArticles) {
      if (article.part_name && article.category && article.subcategory) {
        articlesToAdd.push({
          ...article,
          id: generateId(),
          purchase_price_excl_vat: article.purchase_price_excl_vat || 0,
          sales_price_excl_vat: article.sales_price_excl_vat || 0,
          currency: article.currency || 'EUR',
          quantity_unit: article.quantity_unit || 'pcs',
          electric_compatible: article.electric_compatible ?? true,
          diesel_compatible: article.diesel_compatible ?? true,
          hybrid_compatible: article.hybrid_compatible ?? true,
          stock_qty: article.stock_qty || 0,
          min_stock_level: article.min_stock_level || 0,
          parts_list_category: article.parts_list_category || article.category || '',
          parts_list_subcategory: article.parts_list_subcategory || article.subcategory || '',
          boat_model_compat: article.boat_model_compat || ['Eagle 25TS', 'Eagle 28TS', 'Eagle 32TS', 'Eagle C720', 'Eagle C999'],
          standard_or_optional: article.standard_or_optional || 'Standard',
        } as Article);
        importedCount++;
      }
    }

    if (articlesToAdd.length > 0) {
      setArticles(prev => [...prev, ...articlesToAdd]);
    }

    return importedCount;
  };

  // Article Group actions
  const addArticleGroup = (group: Omit<ArticleGroup, 'id' | 'created_at' | 'updated_at'>): ArticleGroup => {
    const newGroup: ArticleGroup = {
      ...group,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setArticleGroups(prev => [...prev, newGroup]);
    return newGroup;
  };

  const updateArticleGroup = (id: string, updates: Partial<ArticleGroup>) => {
    setArticleGroups(prev => prev.map(g =>
      g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g
    ));
  };

  const deleteArticleGroup = (id: string) => {
    setArticleGroups(prev => prev.filter(g => g.id !== id));
  };

  const getArticleGroupById = (id: string): ArticleGroup | undefined => {
    return articleGroups.find(g => g.id === id);
  };

  const getArticleGroupsBySubcategory = (subcategory: string): ArticleGroup[] => {
    return articleGroups.filter(g => g.subcategory === subcategory && g.is_active);
  };

  const calculateGroupPrice = (group: ArticleGroup): number => {
    if (group.use_custom_price && group.custom_price_excl_vat !== undefined) {
      return group.custom_price_excl_vat;
    }
    // Calculate from component articles
    return group.items.reduce((total, item) => {
      const article = articles.find(a => a.id === item.article_id);
      if (article) {
        return total + (article.sales_price_excl_vat * item.quantity);
      }
      return total;
    }, 0);
  };

  // Configuration actions
  const updateCurrentConfig = (updates: Partial<BoatConfiguration>) => {
    setCurrentConfig(prev => ({ ...prev, ...updates }));
  };

  const addItemToConfig = (article: Article, quantity = 1) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.article.id === article.id);
      if (existing) {
        return prev.map(i =>
          i.article.id === article.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { article, quantity, included: true }];
    });
  };

  const removeItemFromConfig = (articleId: string) => {
    setSelectedItems(prev => prev.filter(i => i.article.id !== articleId));
  };

  const updateItemQuantity = (articleId: string, quantity: number) => {
    setSelectedItems(prev => prev.map(i =>
      i.article.id === articleId ? { ...i, quantity } : i
    ));
  };

  const toggleItemInclusion = (articleId: string) => {
    setSelectedItems(prev => prev.map(i =>
      i.article.id === articleId ? { ...i, included: !i.included } : i
    ));
  };

  const saveConfiguration = (clientId?: string, clientBoatId?: string): BoatConfiguration | null => {
    if (!currentConfig.boat_model) return null;

    const config: BoatConfiguration = {
      id: generateId(),
      name: currentConfig.name || `${currentConfig.boat_model} ${currentConfig.propulsion_type || 'Electric'}`,
      client_id: clientId,
      client_boat_id: clientBoatId,
      boat_model: currentConfig.boat_model as BoatModel,
      propulsion_type: (currentConfig.propulsion_type || 'Electric') as PropulsionType,
      steering_type: (currentConfig.steering_type || 'Hydraulic') as SteeringType,
      items: selectedItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setConfigurations(prev => [...prev, config]);
    return config;
  };

  const loadConfiguration = (id: string) => {
    const config = configurations.find(c => c.id === id);
    if (config) {
      setCurrentConfig(config);
      setSelectedItems(config.items);
      setCurrentStep(1);
    }
  };

  const deleteConfiguration = (id: string) => {
    setConfigurations(prev => prev.filter(c => c.id !== id));
  };

  const resetConfiguration = () => {
    setCurrentStep(1);
    setCurrentConfig({});
    setSelectedItems([]);
  };

  // Quotation actions
  const saveQuotation = (quotation: Quotation) => {
    setQuotations(prev => [...prev, quotation]);
  };

  const updateQuotation = (id: string, updates: Partial<Quotation>) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuotation = (id: string) => {
    setQuotations(prev => prev.filter(q => q.id !== id));
  };

  // Client actions
  const addClient = (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Client => {
    const newClient: Client = {
      ...client,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setClients(prev => [...prev, newClient]);
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
    ));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    // Also delete associated boats
    setClientBoats(prev => prev.filter(b => b.client_id !== id));
  };

  const getClientById = (id: string): Client | undefined => {
    return clients.find(c => c.id === id);
  };

  // Client Boat actions
  const addClientBoat = (boat: Omit<ClientBoat, 'id' | 'created_at' | 'updated_at'>): ClientBoat => {
    const newBoat: ClientBoat = {
      ...boat,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setClientBoats(prev => [...prev, newBoat]);
    return newBoat;
  };

  const updateClientBoat = (id: string, updates: Partial<ClientBoat>) => {
    setClientBoats(prev => prev.map(b =>
      b.id === id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b
    ));
  };

  const deleteClientBoat = (id: string) => {
    setClientBoats(prev => prev.filter(b => b.id !== id));
  };

  const getClientBoats = (clientId: string): ClientBoat[] => {
    return clientBoats.filter(b => b.client_id === clientId);
  };

  // CE Document actions
  const addCEDocument = (doc: Omit<CEDocument, 'id'>) => {
    const newDoc = { ...doc, id: generateId() } as CEDocument;
    setCEDocuments(prev => [...prev, newDoc]);
  };

  const updateCEDocument = (id: string, updates: Partial<CEDocument>) => {
    setCEDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const deleteCEDocument = (id: string) => {
    setCEDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Settings
  const updateSettings = (updates: Partial<GlobalSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Export all data
  const exportAllData = (): string => {
    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      articles,
      configurations,
      ceDocuments,
      quotations,
      clients,
      clientBoats,
      articleGroups,
      settings,
    }, null, 2);
  };

  // Import all data
  const importAllData = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);

      if (data.articles) setArticles(data.articles);
      if (data.articleGroups) setArticleGroups(data.articleGroups);
      if (data.configurations) setConfigurations(data.configurations);
      if (data.ceDocuments) setCEDocuments(data.ceDocuments);
      if (data.quotations) setQuotations(data.quotations);
      if (data.clients) setClients(data.clients);
      if (data.clientBoats) setClientBoats(data.clientBoats);
      if (data.settings) setSettings(data.settings);

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  };

  return (
    <NavisolContext.Provider value={{
      articles,
      articleGroups,
      configurations,
      ceDocuments,
      quotations,
      clients,
      clientBoats,
      settings,
      currentStep,
      currentConfig,
      selectedItems,
      isLoading,
      addArticle,
      updateArticle,
      deleteArticle,
      searchArticles,
      importArticles,
      addArticleGroup,
      updateArticleGroup,
      deleteArticleGroup,
      getArticleGroupById,
      getArticleGroupsBySubcategory,
      calculateGroupPrice,
      setCurrentStep,
      updateCurrentConfig,
      addItemToConfig,
      removeItemFromConfig,
      updateItemQuantity,
      toggleItemInclusion,
      saveConfiguration,
      loadConfiguration,
      deleteConfiguration,
      resetConfiguration,
      saveQuotation,
      updateQuotation,
      deleteQuotation,
      addClient,
      updateClient,
      deleteClient,
      getClientById,
      addClientBoat,
      updateClientBoat,
      deleteClientBoat,
      getClientBoats,
      addCEDocument,
      updateCEDocument,
      deleteCEDocument,
      updateSettings,
      exportAllData,
      importAllData,
    }}>
      {children}
    </NavisolContext.Provider>
  );
}

export function useNavisol() {
  const context = useContext(NavisolContext);
  if (!context) {
    throw new Error('useNavisol must be used within a NavisolProvider');
  }
  return context;
}
