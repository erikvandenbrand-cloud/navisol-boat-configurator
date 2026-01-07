'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { generateId } from './formatting';
import type {
  OperatingProcedure,
  ChecklistTemplate,
  ChecklistTemplateItem,
  ProcedureCategory,
  ContentBlock,
  BoatModel,
  VesselChecklistItem,
  ChecklistItemPhoto,
} from './types';

const PROCEDURES_KEY = 'navisol_procedures';
const TEMPLATES_KEY = 'navisol_checklist_templates';

interface ProceduresState {
  procedures: OperatingProcedure[];
  templates: ChecklistTemplate[];
  isLoading: boolean;

  // Procedure actions
  addProcedure: (procedure: Omit<OperatingProcedure, 'id' | 'created_at' | 'updated_at'>) => OperatingProcedure;
  updateProcedure: (id: string, updates: Partial<OperatingProcedure>) => void;
  deleteProcedure: (id: string) => void;
  getProceduresByCategory: (category: ProcedureCategory) => OperatingProcedure[];
  getProcedureById: (id: string) => OperatingProcedure | undefined;
  searchProcedures: (query: string) => OperatingProcedure[];

  // Template actions
  addTemplate: (template: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>) => ChecklistTemplate;
  updateTemplate: (id: string, updates: Partial<ChecklistTemplate>) => void;
  deleteTemplate: (id: string) => void;
  getTemplatesByModel: (model: BoatModel | 'all') => ChecklistTemplate[];
  getTemplateById: (id: string) => ChecklistTemplate | undefined;
  getTemplatesForBoat: (model: BoatModel, checklistType: ChecklistTemplate['checklist_type']) => ChecklistTemplate[];

  // Apply template to vessel
  applyTemplateToChecklist: (templateId: string) => VesselChecklistItem[] | null;
  duplicateTemplate: (templateId: string, newName: string) => ChecklistTemplate | null;
}

const ProceduresContext = createContext<ProceduresState | undefined>(undefined);

// Sample procedures data
const SAMPLE_PROCEDURES: Omit<OperatingProcedure, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    title: 'Hull Plate Welding Procedure',
    description: 'Standard operating procedure for welding aluminium hull plates',
    category: 'hull_structural',
    subcategory: '1.1 Hull Construction',
    applicable_models: ['Eagle 750', 'Eagle 850', 'Eagle 1000', 'Eagle 1200'],
    content_blocks: [
      { id: 'b1', type: 'heading', order: 1, content: 'Safety Requirements', heading_level: 2 },
      { id: 'b2', type: 'warning', order: 2, content: 'Always wear appropriate PPE: welding helmet, gloves, and protective clothing.' },
      { id: 'b3', type: 'heading', order: 3, content: 'Preparation Steps', heading_level: 2 },
      { id: 'b4', type: 'steps', order: 4, steps: [
        { step: 1, instruction: 'Clean the aluminium surfaces with acetone to remove oils and contaminants' },
        { step: 2, instruction: 'Use a stainless steel wire brush to remove oxide layer' },
        { step: 3, instruction: 'Check plate alignment and clamp securely' },
        { step: 4, instruction: 'Set TIG welder to AC mode with appropriate amperage for plate thickness' },
        { step: 5, instruction: 'Use ER5356 or ER4043 filler rod as specified in the technical drawing' },
      ]},
      { id: 'b5', type: 'tip', order: 5, content: 'For 5mm plates, use 150-180A. For 8mm plates, use 200-250A.' },
    ],
    version: '1.0',
    status: 'approved',
    created_by_id: 'admin',
    created_by_name: 'System Admin',
    tags: ['welding', 'hull', 'aluminium', 'TIG'],
  },
  {
    title: 'Electric Motor Installation',
    description: 'Installation procedure for Torqeedo electric inboard motors',
    category: 'propulsion_drivetrain',
    subcategory: '2.1 Motorisation (Electric/Diesel/Hybrid)',
    applicable_models: ['Eagle 750', 'Eagle 850', 'Eagle 1000', 'Eagle 1200'],
    content_blocks: [
      { id: 'b1', type: 'heading', order: 1, content: 'Pre-Installation Checks', heading_level: 2 },
      { id: 'b2', type: 'list', order: 2, listType: 'bullet', items: [
        'Verify engine bed alignment with laser level',
        'Check all mounting bolt holes match the motor template',
        'Ensure HV cables are properly rated and routed',
        'Confirm battery capacity matches motor requirements',
      ]},
      { id: 'b3', type: 'warning', order: 3, content: 'High Voltage! Ensure main battery isolation switch is OFF before beginning installation.' },
      { id: 'b4', type: 'heading', order: 4, content: 'Installation Steps', heading_level: 2 },
      { id: 'b5', type: 'steps', order: 5, steps: [
        { step: 1, instruction: 'Position motor on engine bed using lifting equipment' },
        { step: 2, instruction: 'Align motor shaft with propeller shaft coupling' },
        { step: 3, instruction: 'Install flexible coupling and check alignment with dial gauge' },
        { step: 4, instruction: 'Torque mounting bolts to specification (see motor manual)' },
        { step: 5, instruction: 'Connect HV power cables with proper crimping' },
        { step: 6, instruction: 'Connect CAN bus communication cables' },
        { step: 7, instruction: 'Connect cooling water hoses' },
      ]},
    ],
    version: '2.1',
    status: 'approved',
    created_by_id: 'admin',
    created_by_name: 'System Admin',
    tags: ['electric', 'motor', 'installation', 'Torqeedo', 'HV'],
  },
  {
    title: 'Navigation Light Testing',
    description: 'Procedure for testing and verifying all navigation lights',
    category: 'electrical_navigation',
    subcategory: '4.2 Navigation & Communication',
    applicable_models: ['Eagle 750', 'Eagle 850', 'Eagle 1000', 'Eagle 1200'],
    content_blocks: [
      { id: 'b1', type: 'text', order: 1, content: 'All navigation lights must be tested before sea trial and documented in the quality checklist.' },
      { id: 'b2', type: 'heading', order: 2, content: 'Required Lights', heading_level: 2 },
      { id: 'b3', type: 'list', order: 3, listType: 'bullet', items: [
        'Port light (red) - 112.5° arc',
        'Starboard light (green) - 112.5° arc',
        'Stern light (white) - 135° arc',
        'Masthead/steaming light (white) - 225° arc',
        'All-round anchor light (white) - 360°',
      ]},
      { id: 'b4', type: 'heading', order: 4, content: 'Testing Procedure', heading_level: 2 },
      { id: 'b5', type: 'steps', order: 5, steps: [
        { step: 1, instruction: 'Turn on main electrical panel' },
        { step: 2, instruction: 'Activate navigation lights switch' },
        { step: 3, instruction: 'Visually verify each light is functioning' },
        { step: 4, instruction: 'Check visibility angles with protractor tool' },
        { step: 5, instruction: 'Test anchor light separately' },
        { step: 6, instruction: 'Document results in quality checklist' },
      ]},
    ],
    version: '1.2',
    status: 'approved',
    created_by_id: 'admin',
    created_by_name: 'System Admin',
    tags: ['navigation', 'lights', 'testing', 'electrical'],
  },
  {
    title: 'Fire Extinguisher Installation',
    description: 'Proper placement and mounting of fire extinguishers',
    category: 'safety_certification',
    subcategory: '7.1 Safety Equipment',
    applicable_models: ['Eagle 525T', 'Eagle 25TS', 'Eagle 28TS', 'Eagle 32TS', 'Eagle C550', 'Eagle C570', 'Eagle C720', 'Eagle C999', 'Eagle 28SG', 'Eagle Hybruut 28'],
    content_blocks: [
      { id: 'b1', type: 'warning', order: 1, content: 'Fire extinguishers must be CE certified and within valid inspection date.' },
      { id: 'b2', type: 'heading', order: 2, content: 'Quantity Requirements', heading_level: 2 },
      { id: 'b3', type: 'list', order: 3, listType: 'bullet', items: [
        'Eagle 525T/C550/C570: Minimum 1x 2kg ABC dry powder',
        'Eagle 25TS/C720/28SG: Minimum 2x 2kg ABC dry powder',
        'Eagle 28TS/C999/Hybruut 28: Minimum 2x 2kg ABC dry powder + 1x 2kg in engine room',
        'Eagle 32TS: Minimum 3x 2kg ABC dry powder + automatic system in engine room',
      ]},
      { id: 'b4', type: 'heading', order: 4, content: 'Mounting Locations', heading_level: 2 },
      { id: 'b5', type: 'text', order: 5, content: 'Fire extinguishers must be mounted in easily accessible locations, clearly visible and not obstructed. Minimum one extinguisher must be accessible from the helm position.' },
      { id: 'b6', type: 'tip', order: 6, content: 'Use marine-grade stainless steel brackets to prevent corrosion.' },
    ],
    version: '1.0',
    status: 'approved',
    created_by_id: 'admin',
    created_by_name: 'System Admin',
    tags: ['fire', 'safety', 'extinguisher', 'CE'],
  },
];

// Comprehensive checklist templates for each boat model and type
const SAMPLE_TEMPLATES: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>[] = [
  // Eagle 25TS - New Build Completion
  {
    name: 'Eagle 25TS - New Build Completion',
    description: 'Complete vessel completion checklist for Eagle 25TS new builds',
    boat_model: 'Eagle 25TS',
    checklist_type: 'vessel_completion',
    is_active: true,
    created_by_id: 'admin',
    items: [
      { id: 'e750-s1', category: 'safety', description: 'Fire extinguisher (1x 2kg ABC) installed', required: true, order: 1, photo_required: true, photo_count: 1 },
      { id: 'e750-s2', category: 'safety', description: 'Life jackets (4x) on board', required: true, order: 2, photo_required: false },
      { id: 'e750-s3', category: 'safety', description: 'Navigation lights tested (port, starboard, stern)', required: true, order: 3, photo_required: false },
      { id: 'e750-s4', category: 'safety', description: 'Manual bilge pump operational', required: true, order: 4, photo_required: false },
      { id: 'e750-s5', category: 'safety', description: 'Kill switch lanyard present and tested', required: true, order: 5, photo_required: false },
      { id: 'e750-d1', category: 'documentation', description: 'CE Declaration of Conformity (Category C)', required: true, order: 6, photo_required: false },
      { id: 'e750-d2', category: 'documentation', description: "Owner's Manual printed and bound", required: true, order: 7, photo_required: false },
      { id: 'e750-d3', category: 'documentation', description: 'Technical File complete', required: true, order: 8, photo_required: false },
      { id: 'e750-d4', category: 'documentation', description: 'Warranty card filled', required: true, order: 9, photo_required: false },
      { id: 'e750-sys1', category: 'systems', description: 'Outboard motor tested (if applicable)', required: false, order: 10, photo_required: false },
      { id: 'e750-sys2', category: 'systems', description: 'Electric propulsion tested', required: false, order: 11, photo_required: true, photo_count: 1 },
      { id: 'e750-sys3', category: 'systems', description: 'Steering system smooth operation', required: true, order: 12, photo_required: false },
      { id: 'e750-sys4', category: 'systems', description: '12V electrical system verified', required: true, order: 13, photo_required: false },
      { id: 'e750-q1', category: 'quality', description: 'Hull visual inspection - no dents/scratches', required: true, order: 14, photo_required: true, photo_count: 4, instructions: 'Photo all 4 sides of hull' },
      { id: 'e750-q2', category: 'quality', description: 'Weld quality inspection', required: true, order: 15, photo_required: true, photo_count: 2 },
      { id: 'e750-q3', category: 'quality', description: 'Sea trial completed', required: true, order: 16, photo_required: true, photo_count: 2 },
      { id: 'e750-h1', category: 'handover', description: 'Client walkthrough completed', required: true, order: 17, photo_required: false },
      { id: 'e750-h2', category: 'handover', description: 'Keys handed over', required: true, order: 18, photo_required: false },
      { id: 'e750-h3', category: 'handover', description: 'Vessel cleaned inside and out', required: true, order: 19, photo_required: true, photo_count: 2 },
    ],
  },
  // Eagle 28TS - New Build Completion
  {
    name: 'Eagle 28TS - New Build Completion',
    description: 'Complete vessel completion checklist for Eagle 28TS new builds',
    boat_model: 'Eagle 28TS',
    checklist_type: 'vessel_completion',
    is_active: true,
    created_by_id: 'admin',
    items: [
      { id: 'e850-s1', category: 'safety', description: 'Fire extinguishers (2x 2kg ABC) installed', required: true, order: 1, photo_required: true, photo_count: 1 },
      { id: 'e850-s2', category: 'safety', description: 'Life jackets (6x) on board', required: true, order: 2, photo_required: false },
      { id: 'e850-s3', category: 'safety', description: 'Navigation lights tested (full set)', required: true, order: 3, photo_required: false },
      { id: 'e850-s4', category: 'safety', description: 'Electric bilge pump with float switch', required: true, order: 4, photo_required: true, photo_count: 1 },
      { id: 'e850-s5', category: 'safety', description: 'Manual bilge pump backup', required: true, order: 5, photo_required: false },
      { id: 'e850-s6', category: 'safety', description: 'Kill switch tested', required: true, order: 6, photo_required: false },
      { id: 'e850-s7', category: 'safety', description: 'VHF radio installed and tested', required: false, order: 7, photo_required: false },
      { id: 'e850-d1', category: 'documentation', description: 'CE Declaration of Conformity (Category B/C)', required: true, order: 8, photo_required: false },
      { id: 'e850-d2', category: 'documentation', description: "Owner's Manual printed", required: true, order: 9, photo_required: false },
      { id: 'e850-d3', category: 'documentation', description: 'Technical File complete', required: true, order: 10, photo_required: false },
      { id: 'e850-d4', category: 'documentation', description: 'Engine/motor documentation', required: true, order: 11, photo_required: false },
      { id: 'e850-d5', category: 'documentation', description: 'Warranty documentation', required: true, order: 12, photo_required: false },
      { id: 'e850-sys1', category: 'systems', description: 'Propulsion system full test', required: true, order: 13, photo_required: true, photo_count: 1 },
      { id: 'e850-sys2', category: 'systems', description: 'Hydraulic steering tested', required: true, order: 14, photo_required: false },
      { id: 'e850-sys3', category: 'systems', description: 'Fuel system leak test', required: true, order: 15, photo_required: true, photo_count: 1 },
      { id: 'e850-sys4', category: 'systems', description: '12V/24V electrical systems', required: true, order: 16, photo_required: false },
      { id: 'e850-sys5', category: 'systems', description: 'Shore power connection (if fitted)', required: false, order: 17, photo_required: false },
      { id: 'e850-sys6', category: 'systems', description: 'Navigation electronics calibrated', required: false, order: 18, photo_required: false },
      { id: 'e850-q1', category: 'quality', description: 'Full hull inspection', required: true, order: 19, photo_required: true, photo_count: 4 },
      { id: 'e850-q2', category: 'quality', description: 'Weld inspection report', required: true, order: 20, photo_required: true, photo_count: 2 },
      { id: 'e850-q3', category: 'quality', description: 'Interior finish inspection', required: true, order: 21, photo_required: true, photo_count: 2 },
      { id: 'e850-q4', category: 'quality', description: 'Sea trial - speed test', required: true, order: 22, photo_required: true, photo_count: 1, instructions: 'Photo GPS showing max speed' },
      { id: 'e850-q5', category: 'quality', description: 'Snag list resolved', required: true, order: 23, photo_required: false },
      { id: 'e850-h1', category: 'handover', description: 'Full client walkthrough', required: true, order: 24, photo_required: false },
      { id: 'e850-h2', category: 'handover', description: 'Keys and remotes provided', required: true, order: 25, photo_required: false },
      { id: 'e850-h3', category: 'handover', description: 'Fuel tank filled', required: false, order: 26, photo_required: false },
      { id: 'e850-h4', category: 'handover', description: 'Complete cleaning', required: true, order: 27, photo_required: true, photo_count: 2 },
    ],
  },
  // Eagle C999 - New Build Completion
  {
    name: 'Eagle C999 - New Build Completion',
    description: 'Comprehensive completion checklist for Eagle C999 with cabin',
    boat_model: 'Eagle C999',
    checklist_type: 'vessel_completion',
    is_active: true,
    created_by_id: 'admin',
    items: [
      { id: 'e1000-s1', category: 'safety', description: 'Fire extinguishers (2x 2kg ABC + 1x engine room)', required: true, order: 1, photo_required: true, photo_count: 2 },
      { id: 'e1000-s2', category: 'safety', description: 'Life jackets (8x) on board', required: true, order: 2, photo_required: true, photo_count: 1 },
      { id: 'e1000-s3', category: 'safety', description: 'Full navigation light set tested', required: true, order: 3, photo_required: false },
      { id: 'e1000-s4', category: 'safety', description: 'Dual bilge pump system (auto + manual)', required: true, order: 4, photo_required: true, photo_count: 1 },
      { id: 'e1000-s5', category: 'safety', description: 'VHF radio with DSC', required: true, order: 5, photo_required: false },
      { id: 'e1000-s6', category: 'safety', description: 'EPIRB/PLB registered (if ordered)', required: false, order: 6, photo_required: false },
      { id: 'e1000-s7', category: 'safety', description: 'Fire blanket in galley', required: true, order: 7, photo_required: false },
      { id: 'e1000-s8', category: 'safety', description: 'CO detector installed (if gas system)', required: false, order: 8, photo_required: false },
      { id: 'e1000-d1', category: 'documentation', description: 'CE Declaration of Conformity (Category B)', required: true, order: 9, photo_required: false },
      { id: 'e1000-d2', category: 'documentation', description: "Owner's Manual - full 15 chapters", required: true, order: 10, photo_required: false },
      { id: 'e1000-d3', category: 'documentation', description: 'Technical File with all certificates', required: true, order: 11, photo_required: false },
      { id: 'e1000-d4', category: 'documentation', description: 'Engine documentation pack', required: true, order: 12, photo_required: false },
      { id: 'e1000-d5', category: 'documentation', description: 'Equipment manuals folder', required: true, order: 13, photo_required: false },
      { id: 'e1000-d6', category: 'documentation', description: 'Extended warranty certificate', required: true, order: 14, photo_required: false },
      { id: 'e1000-sys1', category: 'systems', description: 'Diesel/Electric propulsion full test', required: true, order: 15, photo_required: true, photo_count: 1 },
      { id: 'e1000-sys2', category: 'systems', description: 'Hydraulic steering - both stations', required: true, order: 16, photo_required: false },
      { id: 'e1000-sys3', category: 'systems', description: 'Bow thruster tested', required: true, order: 17, photo_required: false },
      { id: 'e1000-sys4', category: 'systems', description: 'Fuel system pressure test', required: true, order: 18, photo_required: true, photo_count: 1 },
      { id: 'e1000-sys5', category: 'systems', description: '12V/24V/230V electrical systems', required: true, order: 19, photo_required: false },
      { id: 'e1000-sys6', category: 'systems', description: 'Shore power with RCD test', required: true, order: 20, photo_required: false },
      { id: 'e1000-sys7', category: 'systems', description: 'Fresh water system test', required: true, order: 21, photo_required: false },
      { id: 'e1000-sys8', category: 'systems', description: 'Holding tank pump-out tested', required: true, order: 22, photo_required: false },
      { id: 'e1000-sys9', category: 'systems', description: 'Heating system tested', required: false, order: 23, photo_required: false },
      { id: 'e1000-sys10', category: 'systems', description: 'Navigation electronics full calibration', required: true, order: 24, photo_required: false },
      { id: 'e1000-q1', category: 'quality', description: 'Complete hull inspection', required: true, order: 25, photo_required: true, photo_count: 6 },
      { id: 'e1000-q2', category: 'quality', description: 'All welds NDT certified', required: true, order: 26, photo_required: true, photo_count: 2 },
      { id: 'e1000-q3', category: 'quality', description: 'Interior joinery inspection', required: true, order: 27, photo_required: true, photo_count: 4 },
      { id: 'e1000-q4', category: 'quality', description: 'Engine room inspection', required: true, order: 28, photo_required: true, photo_count: 2 },
      { id: 'e1000-q5', category: 'quality', description: 'Extended sea trial (4+ hours)', required: true, order: 29, photo_required: true, photo_count: 3 },
      { id: 'e1000-q6', category: 'quality', description: 'All snag items resolved', required: true, order: 30, photo_required: false },
      { id: 'e1000-h1', category: 'handover', description: 'Full day client handover session', required: true, order: 31, photo_required: false },
      { id: 'e1000-h2', category: 'handover', description: 'Systems demonstration completed', required: true, order: 32, photo_required: false },
      { id: 'e1000-h3', category: 'handover', description: 'All keys, remotes, codes provided', required: true, order: 33, photo_required: false },
      { id: 'e1000-h4', category: 'handover', description: 'Full fuel and water tanks', required: false, order: 34, photo_required: false },
      { id: 'e1000-h5', category: 'handover', description: 'Professional cleaning completed', required: true, order: 35, photo_required: true, photo_count: 4 },
    ],
  },
  // Eagle 32TS - New Build Completion
  {
    name: 'Eagle 32TS - New Build Completion',
    description: 'Premium completion checklist for flagship Eagle 32TS',
    boat_model: 'Eagle 32TS',
    checklist_type: 'vessel_completion',
    is_active: true,
    created_by_id: 'admin',
    items: [
      { id: 'e1200-s1', category: 'safety', description: 'Fire suppression system in engine room', required: true, order: 1, photo_required: true, photo_count: 1 },
      { id: 'e1200-s2', category: 'safety', description: 'Portable fire extinguishers (3x 2kg)', required: true, order: 2, photo_required: true, photo_count: 1 },
      { id: 'e1200-s3', category: 'safety', description: 'Life jackets (10x) incl. children sizes', required: true, order: 3, photo_required: true, photo_count: 1 },
      { id: 'e1200-s4', category: 'safety', description: 'Liferaft certified and registered', required: true, order: 4, photo_required: true, photo_count: 1 },
      { id: 'e1200-s5', category: 'safety', description: 'EPIRB registered with MMSI', required: true, order: 5, photo_required: false },
      { id: 'e1200-s6', category: 'safety', description: 'Full navigation light certification', required: true, order: 6, photo_required: false },
      { id: 'e1200-s7', category: 'safety', description: 'Triple bilge pump system', required: true, order: 7, photo_required: true, photo_count: 1 },
      { id: 'e1200-s8', category: 'safety', description: 'High water alarm tested', required: true, order: 8, photo_required: false },
      { id: 'e1200-s9', category: 'safety', description: 'VHF with AIS integrated', required: true, order: 9, photo_required: false },
      { id: 'e1200-s10', category: 'safety', description: 'Radar reflector mounted', required: true, order: 10, photo_required: false },
      { id: 'e1200-s11', category: 'safety', description: 'CO and gas detectors', required: true, order: 11, photo_required: false },
      { id: 'e1200-s12', category: 'safety', description: 'Emergency steering tested', required: true, order: 12, photo_required: false },
      { id: 'e1200-d1', category: 'documentation', description: 'CE Declaration Category A/B', required: true, order: 13, photo_required: false },
      { id: 'e1200-d2', category: 'documentation', description: 'Premium Owner\'s Manual bound', required: true, order: 14, photo_required: false },
      { id: 'e1200-d3', category: 'documentation', description: 'Full Technical File', required: true, order: 15, photo_required: false },
      { id: 'e1200-d4', category: 'documentation', description: 'Engine service book', required: true, order: 16, photo_required: false },
      { id: 'e1200-d5', category: 'documentation', description: 'Generator documentation', required: true, order: 17, photo_required: false },
      { id: 'e1200-d6', category: 'documentation', description: 'All equipment manuals folder', required: true, order: 18, photo_required: false },
      { id: 'e1200-d7', category: 'documentation', description: '5-year warranty certificate', required: true, order: 19, photo_required: false },
      { id: 'e1200-d8', category: 'documentation', description: 'Insurance valuation document', required: false, order: 20, photo_required: false },
      { id: 'e1200-sys1', category: 'systems', description: 'Main propulsion full power test', required: true, order: 21, photo_required: true, photo_count: 1 },
      { id: 'e1200-sys2', category: 'systems', description: 'Generator load test', required: true, order: 22, photo_required: true, photo_count: 1 },
      { id: 'e1200-sys3', category: 'systems', description: 'Dual station hydraulic steering', required: true, order: 23, photo_required: false },
      { id: 'e1200-sys4', category: 'systems', description: 'Bow and stern thrusters', required: true, order: 24, photo_required: false },
      { id: 'e1200-sys5', category: 'systems', description: 'Autopilot calibration', required: true, order: 25, photo_required: false },
      { id: 'e1200-sys6', category: 'systems', description: 'Fuel system complete test', required: true, order: 26, photo_required: true, photo_count: 1 },
      { id: 'e1200-sys7', category: 'systems', description: 'Full electrical system test', required: true, order: 27, photo_required: false },
      { id: 'e1200-sys8', category: 'systems', description: 'Shore power and inverter', required: true, order: 28, photo_required: false },
      { id: 'e1200-sys9', category: 'systems', description: 'Fresh water pressure system', required: true, order: 29, photo_required: false },
      { id: 'e1200-sys10', category: 'systems', description: 'Hot water system', required: true, order: 30, photo_required: false },
      { id: 'e1200-sys11', category: 'systems', description: 'Holding tank system', required: true, order: 31, photo_required: false },
      { id: 'e1200-sys12', category: 'systems', description: 'Air conditioning system', required: false, order: 32, photo_required: false },
      { id: 'e1200-sys13', category: 'systems', description: 'Heating system', required: true, order: 33, photo_required: false },
      { id: 'e1200-sys14', category: 'systems', description: 'Entertainment system', required: false, order: 34, photo_required: false },
      { id: 'e1200-sys15', category: 'systems', description: 'Full nav electronics suite', required: true, order: 35, photo_required: false },
      { id: 'e1200-q1', category: 'quality', description: 'Complete exterior inspection', required: true, order: 36, photo_required: true, photo_count: 8 },
      { id: 'e1200-q2', category: 'quality', description: 'NDT weld certification', required: true, order: 37, photo_required: true, photo_count: 2 },
      { id: 'e1200-q3', category: 'quality', description: 'Interior finish inspection', required: true, order: 38, photo_required: true, photo_count: 6 },
      { id: 'e1200-q4', category: 'quality', description: 'Cabin and heads inspection', required: true, order: 39, photo_required: true, photo_count: 4 },
      { id: 'e1200-q5', category: 'quality', description: 'Engine room inspection', required: true, order: 40, photo_required: true, photo_count: 4 },
      { id: 'e1200-q6', category: 'quality', description: 'Full day sea trial', required: true, order: 41, photo_required: true, photo_count: 4 },
      { id: 'e1200-q7', category: 'quality', description: 'Overnight test (systems)', required: true, order: 42, photo_required: false },
      { id: 'e1200-q8', category: 'quality', description: 'Punch list completed', required: true, order: 43, photo_required: false },
      { id: 'e1200-h1', category: 'handover', description: '2-day client handover program', required: true, order: 44, photo_required: false },
      { id: 'e1200-h2', category: 'handover', description: 'Full systems training', required: true, order: 45, photo_required: false },
      { id: 'e1200-h3', category: 'handover', description: 'Sea trial with owner', required: true, order: 46, photo_required: true, photo_count: 2 },
      { id: 'e1200-h4', category: 'handover', description: 'All keys, codes, remotes', required: true, order: 47, photo_required: false },
      { id: 'e1200-h5', category: 'handover', description: 'Full tanks (fuel, water)', required: true, order: 48, photo_required: false },
      { id: 'e1200-h6', category: 'handover', description: 'Champagne welcome pack', required: false, order: 49, photo_required: false },
      { id: 'e1200-h7', category: 'handover', description: 'Professional detail completed', required: true, order: 50, photo_required: true, photo_count: 4 },
    ],
  },
  // Annual Service Checklist - All Models
  {
    name: 'Annual Service Checklist - All Models',
    description: 'Standard annual service checklist applicable to all Eagle models',
    boat_model: 'all',
    checklist_type: 'maintenance',
    is_active: true,
    created_by_id: 'admin',
    items: [
      { id: 'maint-i1', category: 'intake', description: 'Vessel received and logged', required: true, order: 1, photo_required: true, photo_count: 2, instructions: 'Photo port and starboard on arrival' },
      { id: 'maint-i2', category: 'intake', description: 'Customer requirements documented', required: true, order: 2, photo_required: false },
      { id: 'maint-i3', category: 'intake', description: 'Engine hours recorded', required: true, order: 3, photo_required: true, photo_count: 1 },
      { id: 'maint-i4', category: 'intake', description: 'Visible damage noted', required: true, order: 4, photo_required: false },
      { id: 'maint-s1', category: 'service', description: 'Engine oil and filter changed', required: true, order: 5, photo_required: false },
      { id: 'maint-s2', category: 'service', description: 'Fuel filters replaced', required: true, order: 6, photo_required: false },
      { id: 'maint-s3', category: 'service', description: 'Impeller inspected/replaced', required: true, order: 7, photo_required: false },
      { id: 'maint-s4', category: 'service', description: 'Anodes checked/replaced', required: true, order: 8, photo_required: true, photo_count: 1 },
      { id: 'maint-s5', category: 'service', description: 'Drive/stern gear greased', required: true, order: 9, photo_required: false },
      { id: 'maint-s6', category: 'service', description: 'Belts inspected', required: true, order: 10, photo_required: false },
      { id: 'maint-s7', category: 'service', description: 'Battery condition checked', required: true, order: 11, photo_required: false },
      { id: 'maint-s8', category: 'service', description: 'Bilge pump tested', required: true, order: 12, photo_required: false },
      { id: 'maint-s9', category: 'service', description: 'Safety equipment checked', required: true, order: 13, photo_required: false },
      { id: 'maint-t1', category: 'testing', description: 'Engine start and run test', required: true, order: 14, photo_required: false },
      { id: 'maint-t2', category: 'testing', description: 'No leaks observed', required: true, order: 15, photo_required: false },
      { id: 'maint-t3', category: 'testing', description: 'Electrical systems functional', required: true, order: 16, photo_required: false },
      { id: 'maint-t4', category: 'testing', description: 'Steering system smooth', required: true, order: 17, photo_required: false },
      { id: 'maint-c1', category: 'completion', description: 'Work area cleaned', required: true, order: 18, photo_required: false },
      { id: 'maint-c2', category: 'completion', description: 'Service report completed', required: true, order: 19, photo_required: false },
      { id: 'maint-c3', category: 'completion', description: 'Next service date set', required: true, order: 20, photo_required: false },
      { id: 'maint-c4', category: 'completion', description: 'Customer notified', required: true, order: 21, photo_required: false },
    ],
  },
  // Winter Storage Preparation
  {
    name: 'Winter Storage Preparation',
    description: 'Winterization checklist for all Eagle models',
    boat_model: 'all',
    checklist_type: 'maintenance',
    is_active: true,
    created_by_id: 'admin',
    items: [
      { id: 'winter-1', category: 'service', description: 'Engine winterized with antifreeze', required: true, order: 1, photo_required: false },
      { id: 'winter-2', category: 'service', description: 'Fuel tank filled and stabilizer added', required: true, order: 2, photo_required: false },
      { id: 'winter-3', category: 'service', description: 'Fresh water system drained', required: true, order: 3, photo_required: false },
      { id: 'winter-4', category: 'service', description: 'Holding tank emptied and cleaned', required: true, order: 4, photo_required: false },
      { id: 'winter-5', category: 'service', description: 'Batteries removed or on maintainer', required: true, order: 5, photo_required: false },
      { id: 'winter-6', category: 'service', description: 'Seacocks closed', required: true, order: 6, photo_required: false },
      { id: 'winter-7', category: 'service', description: 'Interior dried and ventilated', required: true, order: 7, photo_required: false },
      { id: 'winter-8', category: 'service', description: 'Cover fitted or shrink-wrapped', required: true, order: 8, photo_required: true, photo_count: 2 },
      { id: 'winter-9', category: 'completion', description: 'Spring commissioning scheduled', required: false, order: 9, photo_required: false },
    ],
  },
  // Pre-Delivery Quality Inspection
  {
    name: 'Pre-Delivery Quality Inspection',
    description: 'Final quality check before any vessel handover',
    boat_model: 'all',
    checklist_type: 'quality_check',
    is_active: true,
    created_by_id: 'admin',
    items: [
      { id: 'qc-1', category: 'quality', description: 'Exterior finish - no scratches or marks', required: true, order: 1, photo_required: true, photo_count: 4 },
      { id: 'qc-2', category: 'quality', description: 'Deck hardware secure', required: true, order: 2, photo_required: false },
      { id: 'qc-3', category: 'quality', description: 'Interior finish complete', required: true, order: 3, photo_required: true, photo_count: 2 },
      { id: 'qc-4', category: 'quality', description: 'All systems operational', required: true, order: 4, photo_required: false },
      { id: 'qc-5', category: 'quality', description: 'Documentation complete', required: true, order: 5, photo_required: false },
      { id: 'qc-6', category: 'quality', description: 'Cleaning to showroom standard', required: true, order: 6, photo_required: true, photo_count: 2 },
    ],
  },
  // Annual Safety Inspection
  {
    name: 'Annual Safety Inspection',
    description: 'Comprehensive safety equipment inspection',
    boat_model: 'all',
    checklist_type: 'safety_inspection',
    is_active: true,
    created_by_id: 'admin',
    items: [
      { id: 'safety-1', category: 'safety', description: 'Fire extinguishers in date', required: true, order: 1, photo_required: true, photo_count: 1 },
      { id: 'safety-2', category: 'safety', description: 'Flares in date (if carried)', required: false, order: 2, photo_required: false },
      { id: 'safety-3', category: 'safety', description: 'Life jackets serviceable', required: true, order: 3, photo_required: false },
      { id: 'safety-4', category: 'safety', description: 'First aid kit complete', required: true, order: 4, photo_required: false },
      { id: 'safety-5', category: 'safety', description: 'Navigation lights working', required: true, order: 5, photo_required: false },
      { id: 'safety-6', category: 'safety', description: 'Horn/whistle operational', required: true, order: 6, photo_required: false },
      { id: 'safety-7', category: 'safety', description: 'Bilge pumps tested', required: true, order: 7, photo_required: false },
      { id: 'safety-8', category: 'safety', description: 'EPIRB/PLB battery in date', required: false, order: 8, photo_required: false },
      { id: 'safety-9', category: 'safety', description: 'VHF radio tested', required: false, order: 9, photo_required: false },
      { id: 'safety-10', category: 'safety', description: 'Liferaft service in date', required: false, order: 10, photo_required: false },
    ],
  },
];

export function ProceduresProvider({ children }: { children: ReactNode }) {
  const [procedures, setProcedures] = useState<OperatingProcedure[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const savedProcedures = localStorage.getItem(PROCEDURES_KEY);
      const savedTemplates = localStorage.getItem(TEMPLATES_KEY);

      if (savedProcedures) {
        setProcedures(JSON.parse(savedProcedures));
      } else {
        // Initialize with sample data
        const initialProcedures = SAMPLE_PROCEDURES.map(p => ({
          ...p,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setProcedures(initialProcedures);
      }

      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates));
      } else {
        // Initialize with sample templates
        const initialTemplates = SAMPLE_TEMPLATES.map(t => ({
          ...t,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setTemplates(initialTemplates);
      }
    } catch (error) {
      console.error('Failed to load procedures data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading) {
      localStorage.setItem(PROCEDURES_KEY, JSON.stringify(procedures));
    }
  }, [procedures, isLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading) {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    }
  }, [templates, isLoading]);

  // Procedure actions
  const addProcedure = (procedure: Omit<OperatingProcedure, 'id' | 'created_at' | 'updated_at'>): OperatingProcedure => {
    const newProcedure: OperatingProcedure = {
      ...procedure,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProcedures(prev => [...prev, newProcedure]);
    return newProcedure;
  };

  const updateProcedure = (id: string, updates: Partial<OperatingProcedure>) => {
    setProcedures(prev =>
      prev.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)
    );
  };

  const deleteProcedure = (id: string) => {
    setProcedures(prev => prev.filter(p => p.id !== id));
  };

  const getProceduresByCategory = (category: ProcedureCategory): OperatingProcedure[] => {
    return procedures.filter(p => p.category === category && p.status !== 'archived');
  };

  const getProcedureById = (id: string): OperatingProcedure | undefined => {
    return procedures.find(p => p.id === id);
  };

  const searchProcedures = (query: string): OperatingProcedure[] => {
    const q = query.toLowerCase();
    return procedures.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  };

  // Template actions
  const addTemplate = (template: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>): ChecklistTemplate => {
    const newTemplate: ChecklistTemplate = {
      ...template,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateTemplate = (id: string, updates: Partial<ChecklistTemplate>) => {
    setTemplates(prev =>
      prev.map(t => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t)
    );
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const getTemplatesByModel = (model: BoatModel | 'all'): ChecklistTemplate[] => {
    return templates.filter(t => t.boat_model === model || t.boat_model === 'all');
  };

  const getTemplateById = (id: string): ChecklistTemplate | undefined => {
    return templates.find(t => t.id === id);
  };

  const getTemplatesForBoat = (model: BoatModel, checklistType: ChecklistTemplate['checklist_type']): ChecklistTemplate[] => {
    return templates.filter(t =>
      (t.boat_model === model || t.boat_model === 'all') &&
      t.checklist_type === checklistType
    );
  };

  // Apply a template to a vessel's checklist
  const applyTemplateToChecklist = (templateId: string): VesselChecklistItem[] | null => {
    const template = getTemplateById(templateId);
    if (!template) return null;
    // Convert each template item to VesselChecklistItem format
    return template.items.map(item => ({
      id: generateId(),
      template_item_id: item.id,
      category: item.category,
      description: item.description,
      required: item.required,
      order: item.order,
      photo_required: item.photo_required ?? false,
      photo_count: item.photo_count ?? 0,
      instructions: item.instructions ?? '',
      completed: false,
      photos: [] as ChecklistItemPhoto[],
      notes: '',
      verified_by: '',
      verified_at: '',
    }));
  };

  // Duplicate a template with a new name
  const duplicateTemplate = (templateId: string, newName: string): ChecklistTemplate | null => {
    const template = getTemplateById(templateId);
    if (!template) return null;
    const newTemplate: ChecklistTemplate = {
      ...template,
      id: generateId(),
      name: newName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: template.items.map(item => ({
        ...item,
        id: generateId(),
      })),
    };
    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  };

  const value: ProceduresState = {
    procedures,
    templates,
    isLoading,
    addProcedure,
    updateProcedure,
    deleteProcedure,
    getProceduresByCategory,
    getProcedureById,
    searchProcedures,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplatesByModel,
    getTemplateById,
    getTemplatesForBoat,
    applyTemplateToChecklist,
    duplicateTemplate,
  };

  return (
    <ProceduresContext.Provider value={value}>
      {children}
    </ProceduresContext.Provider>
  );
}

export function useProcedures() {
  const context = useContext(ProceduresContext);
  if (!context) {
    throw new Error('useProcedures must be used within ProceduresProvider');
  }
  return context;
}
