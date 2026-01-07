'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { generateId } from './formatting';
import type { BoatModelDefinition, PropulsionType } from './types';

const STORAGE_KEY = 'navisol_boat_models';

// Default boat models - Real Eagle Boats from eagleboats.nl
const DEFAULT_MODELS: Omit<BoatModelDefinition, 'id' | 'created_at' | 'updated_at'>[] = [
  // TS Series (Flagship Electric)
  {
    name: 'Eagle 525T',
    description: 'Compact electric tender, perfect for short trips',
    base_price_excl_vat: 45000,
    length_m: 5.25,
    beam_m: 2.1,
    draft_m: 0.35,
    weight_kg: 800,
    max_persons: 5,
    ce_category: 'C',
    available_propulsion: ['Electric'],
    default_propulsion: 'Electric',
    standard_part_ids: [],
    optional_part_ids: [],
    is_active: true,
    is_default: true,
  },
  {
    name: 'Eagle 25TS',
    description: 'Award-winning electric sloep (HISWA 2025), perfect for day cruising',
    base_price_excl_vat: 89000,
    length_m: 7.50,
    beam_m: 2.5,
    draft_m: 0.45,
    weight_kg: 1400,
    max_persons: 8,
    ce_category: 'C',
    available_propulsion: ['Electric'],
    default_propulsion: 'Electric',
    standard_part_ids: [],
    optional_part_ids: [],
    is_active: true,
    is_default: true,
  },
  {
    name: 'Eagle 28TS',
    description: 'Spacious electric cruiser for family adventures',
    base_price_excl_vat: 125000,
    length_m: 8.50,
    beam_m: 2.8,
    draft_m: 0.5,
    weight_kg: 2200,
    max_persons: 10,
    ce_category: 'C',
    available_propulsion: ['Electric'],
    default_propulsion: 'Electric',
    standard_part_ids: [],
    optional_part_ids: [],
    is_active: true,
    is_default: true,
  },
  {
    name: 'Eagle 32TS',
    description: 'Flagship electric yacht with premium features',
    base_price_excl_vat: 185000,
    length_m: 9.70,
    beam_m: 3.2,
    draft_m: 0.6,
    weight_kg: 3500,
    max_persons: 12,
    ce_category: 'B',
    available_propulsion: ['Electric'],
    default_propulsion: 'Electric',
    standard_part_ids: [],
    optional_part_ids: [],
    is_active: true,
    is_default: true,
  },
  // Classic Series (Dutch Sloep)
  {
    name: 'Eagle C550',
    description: 'Classic Dutch sloep, compact and elegant',
    base_price_excl_vat: 38000,
    length_m: 5.50,
    beam_m: 2.0,
    draft_m: 0.35,
    weight_kg: 750,
    max_persons: 6,
    ce_category: 'C',
    available_propulsion: ['Electric', 'Outboard'],
    default_propulsion: 'Electric',
    standard_part_ids: [],
    optional_part_ids: [],
    is_active: true,
    is_default: true,
  },
  {
    name: 'Eagle C570',
    description: 'Classic sloep with slightly more space',
    base_price_excl_vat: 42000,
    length_m: 5.70,
    beam_m: 2.1,
    draft_m: 0.38,
    weight_kg: 850,
    max_persons: 6,
    ce_category: 'C',
    available_propulsion: ['Electric', 'Outboard'],
    default_propulsion: 'Electric',
    standard_part_ids: [],
    optional_part_ids: [],
    is_active: true,
    is_default: true,
  },
  {
    name: 'Eagle C720',
    description: 'Mid-size classic sloep for versatile use',
    base_price_excl_vat: 68000,
    length_m: 7.20,
    beam_m: 2.4,
    draft_m: 0.45,
    weight_kg: 1200,
    max_persons: 8,
    ce_category: 'C',
    available_propulsion: ['Electric', 'Diesel', 'Outboard'],
    default_propulsion: 'Electric',
    standard_part_ids: [],
    optional_part_ids: [],
    is_active: true,
    is_default: true,
  },
  {
    name: 'Eagle C999',
    description: 'Large classic sloep with cabin and comfort',
    base_price_excl_vat: 145000,
    length_m: 9.99,
    beam_m: 3.0,
    draft_m: 0.55,
    weight_kg: 3000,
    max_persons: 12,
    ce_category: 'B',
    available_propulsion: ['Electric', 'Diesel', 'Hybrid'],
    default_propulsion: 'Electric',
    standard_part_ids: [],
    optional_part_ids: [],
    is_active: true,
    is_default: true,
  },
  // SG Series (Sport Grand)
  {
    name: 'Eagle 28SG',
    description: 'Sport Grand - performance cruiser with sporty lines',
    base_price_excl_vat: 115000,
    length_m: 8.50,
    beam_m: 2.7,
    draft_m: 0.5,
    weight_kg: 2000,
    max_persons: 10,
    ce_category: 'C',
    available_propulsion: ['Electric', 'Diesel'],
    default_propulsion: 'Electric',
    standard_part_ids: [],
    optional_part_ids: [],
    is_active: true,
    is_default: true,
  },
  // Hybruut Series (Hybrid)
  {
    name: 'Eagle Hybruut 28',
    description: 'Innovative hybrid boat with dual propulsion',
    base_price_excl_vat: 135000,
    length_m: 8.50,
    beam_m: 2.8,
    draft_m: 0.55,
    weight_kg: 2500,
    max_persons: 10,
    ce_category: 'C',
    available_propulsion: ['Hybrid'],
    default_propulsion: 'Hybrid',
    standard_part_ids: [],
    optional_part_ids: [],
    is_active: true,
    is_default: true,
  },
];

interface BoatModelsState {
  models: BoatModelDefinition[];
  isLoading: boolean;

  // Actions
  addModel: (model: Omit<BoatModelDefinition, 'id' | 'created_at' | 'updated_at'>) => BoatModelDefinition;
  updateModel: (id: string, updates: Partial<BoatModelDefinition>) => void;
  deleteModel: (id: string) => boolean;
  duplicateModel: (id: string, newName: string) => BoatModelDefinition | null;

  // Getters
  getModelById: (id: string) => BoatModelDefinition | undefined;
  getModelByName: (name: string) => BoatModelDefinition | undefined;
  getActiveModels: () => BoatModelDefinition[];
  getModelNames: () => string[];
  getModelPrice: (modelName: string) => number;
  getModelPropulsionTypes: (modelName: string) => PropulsionType[];
}

const BoatModelsContext = createContext<BoatModelsState | undefined>(undefined);

export function BoatModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<BoatModelDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setModels(JSON.parse(saved));
      } else {
        // Initialize with default models
        const initialModels = DEFAULT_MODELS.map(m => ({
          ...m,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setModels(initialModels);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialModels));
      }
    } catch (error) {
      console.error('Failed to load boat models:', error);
      // Initialize with defaults on error
      const initialModels = DEFAULT_MODELS.map(m => ({
        ...m,
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setModels(initialModels);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading && models.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
    }
  }, [models, isLoading]);

  const addModel = (modelData: Omit<BoatModelDefinition, 'id' | 'created_at' | 'updated_at'>): BoatModelDefinition => {
    const newModel: BoatModelDefinition = {
      ...modelData,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setModels(prev => [...prev, newModel]);
    return newModel;
  };

  const updateModel = (id: string, updates: Partial<BoatModelDefinition>) => {
    setModels(prev => prev.map(m =>
      m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
    ));
  };

  const deleteModel = (id: string): boolean => {
    const model = models.find(m => m.id === id);
    if (!model || model.is_default) return false; // Can't delete default models
    setModels(prev => prev.filter(m => m.id !== id));
    return true;
  };

  const duplicateModel = (id: string, newName: string): BoatModelDefinition | null => {
    const model = models.find(m => m.id === id);
    if (!model) return null;

    const duplicate: BoatModelDefinition = {
      ...model,
      id: generateId(),
      name: newName,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setModels(prev => [...prev, duplicate]);
    return duplicate;
  };

  const getModelById = (id: string): BoatModelDefinition | undefined => {
    return models.find(m => m.id === id);
  };

  const getModelByName = (name: string): BoatModelDefinition | undefined => {
    return models.find(m => m.name === name);
  };

  const getActiveModels = (): BoatModelDefinition[] => {
    return models.filter(m => m.is_active);
  };

  const getModelNames = (): string[] => {
    return models.filter(m => m.is_active).map(m => m.name);
  };

  const getModelPrice = (modelName: string): number => {
    const model = models.find(m => m.name === modelName);
    return model?.base_price_excl_vat || 0;
  };

  const getModelPropulsionTypes = (modelName: string): PropulsionType[] => {
    const model = models.find(m => m.name === modelName);
    return model?.available_propulsion || ['Electric', 'Diesel', 'Hybrid', 'Outboard'];
  };

  const value: BoatModelsState = {
    models,
    isLoading,
    addModel,
    updateModel,
    deleteModel,
    duplicateModel,
    getModelById,
    getModelByName,
    getActiveModels,
    getModelNames,
    getModelPrice,
    getModelPropulsionTypes,
  };

  return (
    <BoatModelsContext.Provider value={value}>
      {children}
    </BoatModelsContext.Provider>
  );
}

export function useBoatModels() {
  const context = useContext(BoatModelsContext);
  if (!context) {
    throw new Error('useBoatModels must be used within BoatModelsProvider');
  }
  return context;
}
