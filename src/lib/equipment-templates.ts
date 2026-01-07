/**
 * Equipment Templates for Eagle Boats Models
 * Defines standard and optional equipment for each model
 */

export interface EquipmentTemplateItem {
  id: string;
  category: string;
  name: string;
  description?: string;
  isStandard: boolean; // Included by default
  isOptional: boolean; // Can be added/removed
  price: number; // Price if optional (0 if standard)
  unit: string;
  qty: number;
}

export interface EquipmentTemplate {
  modelId: string;
  modelName: string;
  items: EquipmentTemplateItem[];
}

// Equipment Categories
export const EQUIPMENT_CATEGORIES = [
  'Hull & Structure',
  'Propulsion',
  'Electrical',
  'Navigation',
  'Deck Equipment',
  'Comfort & Interior',
  'Safety',
  'Exterior & Styling',
  'Accessories',
] as const;

// Base equipment that all models share
const BASE_SAFETY_EQUIPMENT: EquipmentTemplateItem[] = [
  { id: 'safety-1', category: 'Safety', name: 'Fire Extinguisher 2kg', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
  { id: 'safety-2', category: 'Safety', name: 'First Aid Kit', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
  { id: 'safety-3', category: 'Safety', name: 'Life Jackets (CE approved)', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
  { id: 'safety-4', category: 'Safety', name: 'Throwable Life Ring', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
  { id: 'safety-5', category: 'Safety', name: 'Navigation Lights (LED)', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
  { id: 'safety-6', category: 'Safety', name: 'Horn/Sound Signal', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
];

const BASE_DECK_EQUIPMENT: EquipmentTemplateItem[] = [
  { id: 'deck-1', category: 'Deck Equipment', name: 'Mooring Cleats (stainless)', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 4 },
  { id: 'deck-2', category: 'Deck Equipment', name: 'Fender Holders', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 4 },
  { id: 'deck-3', category: 'Deck Equipment', name: 'Mooring Lines', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 4 },
  { id: 'deck-4', category: 'Deck Equipment', name: 'Fenders', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 4 },
  { id: 'deck-5', category: 'Deck Equipment', name: 'Boat Hook', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
];

// Model-specific templates
export const EQUIPMENT_TEMPLATES: EquipmentTemplate[] = [
  // ============================================
  // Eagle 525T
  // ============================================
  {
    modelId: 'model-1',
    modelName: 'Eagle 525T',
    items: [
      // Hull & Structure
      { id: '525t-hull-1', category: 'Hull & Structure', name: 'Aluminium Hull (marine grade)', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '525t-hull-2', category: 'Hull & Structure', name: 'Integrated Swim Platform', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '525t-hull-3', category: 'Hull & Structure', name: 'Self-draining Deck', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },

      // Propulsion
      { id: '525t-prop-1', category: 'Propulsion', name: 'Electric Motor 10kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '525t-prop-2', category: 'Propulsion', name: 'Lithium Battery Pack 8kWh', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '525t-prop-3', category: 'Propulsion', name: 'Shore Power Charger', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '525t-prop-4', category: 'Propulsion', name: 'Battery Upgrade to 12kWh', isStandard: false, isOptional: true, price: 4500, unit: 'pcs', qty: 1 },

      // Electrical
      { id: '525t-elec-1', category: 'Electrical', name: '12V Electrical System', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '525t-elec-2', category: 'Electrical', name: 'LED Courtesy Lights', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '525t-elec-3', category: 'Electrical', name: 'USB Charging Ports (2x)', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '525t-elec-4', category: 'Electrical', name: 'Bluetooth Audio System', isStandard: false, isOptional: true, price: 850, unit: 'set', qty: 1 },

      // Navigation
      { id: '525t-nav-1', category: 'Navigation', name: 'Compass', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '525t-nav-2', category: 'Navigation', name: 'Depth Sounder', isStandard: false, isOptional: true, price: 450, unit: 'pcs', qty: 1 },
      { id: '525t-nav-3', category: 'Navigation', name: 'GPS Chartplotter 7"', isStandard: false, isOptional: true, price: 1200, unit: 'pcs', qty: 1 },

      // Comfort & Interior
      { id: '525t-comfort-1', category: 'Comfort & Interior', name: 'Helm Seat (adjustable)', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '525t-comfort-2', category: 'Comfort & Interior', name: 'Bow Seating with Storage', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '525t-comfort-3', category: 'Comfort & Interior', name: 'Premium Upholstery Upgrade', isStandard: false, isOptional: true, price: 1800, unit: 'set', qty: 1 },
      { id: '525t-comfort-4', category: 'Comfort & Interior', name: 'Teak Deck Flooring', isStandard: false, isOptional: true, price: 2400, unit: 'set', qty: 1 },

      // Exterior & Styling
      { id: '525t-ext-1', category: 'Exterior & Styling', name: 'T-Top with Canvas', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '525t-ext-2', category: 'Exterior & Styling', name: 'Custom Hull Color', isStandard: false, isOptional: true, price: 2200, unit: 'pcs', qty: 1 },
      { id: '525t-ext-3', category: 'Exterior & Styling', name: 'Stainless Steel Railing Package', isStandard: false, isOptional: true, price: 1600, unit: 'set', qty: 1 },

      ...BASE_SAFETY_EQUIPMENT.map(item => ({ ...item, id: `525t-${item.id}` })),
      ...BASE_DECK_EQUIPMENT.map(item => ({ ...item, id: `525t-${item.id}` })),
    ],
  },

  // ============================================
  // Eagle 25TS (Award Winner)
  // ============================================
  {
    modelId: 'model-2',
    modelName: 'Eagle 25TS',
    items: [
      // Hull & Structure
      { id: '25ts-hull-1', category: 'Hull & Structure', name: 'Aluminium Hull (marine grade)', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-hull-2', category: 'Hull & Structure', name: 'Integrated Swim Platform with Ladder', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-hull-3', category: 'Hull & Structure', name: 'Self-draining Deck', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-hull-4', category: 'Hull & Structure', name: 'Anchor Locker', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },

      // Propulsion
      { id: '25ts-prop-1', category: 'Propulsion', name: 'Electric Motor 20kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-prop-2', category: 'Propulsion', name: 'Lithium Battery Pack 20kWh', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-prop-3', category: 'Propulsion', name: 'Shore Power Charger 3kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-prop-4', category: 'Propulsion', name: 'Battery Upgrade to 30kWh', isStandard: false, isOptional: true, price: 8500, unit: 'pcs', qty: 1 },
      { id: '25ts-prop-5', category: 'Propulsion', name: 'Fast Charger 7kW', isStandard: false, isOptional: true, price: 2200, unit: 'pcs', qty: 1 },
      { id: '25ts-prop-6', category: 'Propulsion', name: 'Solar Panel Array (400W)', isStandard: false, isOptional: true, price: 3200, unit: 'set', qty: 1 },

      // Electrical
      { id: '25ts-elec-1', category: 'Electrical', name: '12V/48V Electrical System', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '25ts-elec-2', category: 'Electrical', name: 'LED Courtesy Lights', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '25ts-elec-3', category: 'Electrical', name: 'USB-C Charging Ports (4x)', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '25ts-elec-4', category: 'Electrical', name: 'Premium Audio System with Subwoofer', isStandard: false, isOptional: true, price: 2400, unit: 'set', qty: 1 },
      { id: '25ts-elec-5', category: 'Electrical', name: 'Underwater LED Lights', isStandard: false, isOptional: true, price: 1800, unit: 'set', qty: 1 },

      // Navigation
      { id: '25ts-nav-1', category: 'Navigation', name: 'GPS Chartplotter 9"', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-nav-2', category: 'Navigation', name: 'Depth/Speed Transducer', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-nav-3', category: 'Navigation', name: 'VHF Radio', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-nav-4', category: 'Navigation', name: 'AIS Transponder', isStandard: false, isOptional: true, price: 1400, unit: 'pcs', qty: 1 },
      { id: '25ts-nav-5', category: 'Navigation', name: 'Radar System', isStandard: false, isOptional: true, price: 4500, unit: 'pcs', qty: 1 },
      { id: '25ts-nav-6', category: 'Navigation', name: 'Autopilot', isStandard: false, isOptional: true, price: 3200, unit: 'set', qty: 1 },

      // Comfort & Interior
      { id: '25ts-comfort-1', category: 'Comfort & Interior', name: 'Premium Helm Station', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-comfort-2', category: 'Comfort & Interior', name: 'Bow Lounge with Sun Pad', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '25ts-comfort-3', category: 'Comfort & Interior', name: 'Aft Seating with Storage', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '25ts-comfort-4', category: 'Comfort & Interior', name: 'Coolbox/Refrigerator', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-comfort-5', category: 'Comfort & Interior', name: 'Premium Leather Upholstery', isStandard: false, isOptional: true, price: 4200, unit: 'set', qty: 1 },
      { id: '25ts-comfort-6', category: 'Comfort & Interior', name: 'Teak Deck Package', isStandard: false, isOptional: true, price: 5800, unit: 'set', qty: 1 },
      { id: '25ts-comfort-7', category: 'Comfort & Interior', name: 'Electric Grill', isStandard: false, isOptional: true, price: 1200, unit: 'pcs', qty: 1 },

      // Exterior & Styling
      { id: '25ts-ext-1', category: 'Exterior & Styling', name: 'T-Top with Integrated Lights', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '25ts-ext-2', category: 'Exterior & Styling', name: 'Stainless Steel Package', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '25ts-ext-3', category: 'Exterior & Styling', name: 'Custom Hull Color (choice of 12)', isStandard: false, isOptional: true, price: 3500, unit: 'pcs', qty: 1 },
      { id: '25ts-ext-4', category: 'Exterior & Styling', name: 'Full Boat Cover', isStandard: false, isOptional: true, price: 2800, unit: 'pcs', qty: 1 },

      // Accessories
      { id: '25ts-acc-1', category: 'Accessories', name: 'Electric Anchor Windlass', isStandard: false, isOptional: true, price: 1800, unit: 'pcs', qty: 1 },
      { id: '25ts-acc-2', category: 'Accessories', name: 'Telescopic Gangway', isStandard: false, isOptional: true, price: 2400, unit: 'pcs', qty: 1 },
      { id: '25ts-acc-3', category: 'Accessories', name: 'Wakeboard Tower', isStandard: false, isOptional: true, price: 4500, unit: 'pcs', qty: 1 },

      ...BASE_SAFETY_EQUIPMENT.map(item => ({ ...item, id: `25ts-${item.id}` })),
      ...BASE_DECK_EQUIPMENT.map(item => ({ ...item, id: `25ts-${item.id}` })),
    ],
  },

  // ============================================
  // Eagle 28TS
  // ============================================
  {
    modelId: 'model-3',
    modelName: 'Eagle 28TS',
    items: [
      // Hull & Structure
      { id: '28ts-hull-1', category: 'Hull & Structure', name: 'Aluminium Hull (marine grade)', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-hull-2', category: 'Hull & Structure', name: 'Integrated Swim Platform with Shower', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-hull-3', category: 'Hull & Structure', name: 'Cabin with Standing Headroom', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-hull-4', category: 'Hull & Structure', name: 'Anchor Locker with Windlass', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },

      // Propulsion
      { id: '28ts-prop-1', category: 'Propulsion', name: 'Electric Motor 40kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-prop-2', category: 'Propulsion', name: 'Lithium Battery Pack 40kWh', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-prop-3', category: 'Propulsion', name: 'Shore Power Charger 7kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-prop-4', category: 'Propulsion', name: 'Battery Upgrade to 60kWh', isStandard: false, isOptional: true, price: 14500, unit: 'pcs', qty: 1 },
      { id: '28ts-prop-5', category: 'Propulsion', name: 'Hybrid Generator System', isStandard: false, isOptional: true, price: 18000, unit: 'set', qty: 1 },
      { id: '28ts-prop-6', category: 'Propulsion', name: 'Bow Thruster', isStandard: false, isOptional: true, price: 4800, unit: 'pcs', qty: 1 },

      // Electrical
      { id: '28ts-elec-1', category: 'Electrical', name: '12V/48V/230V Electrical System', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '28ts-elec-2', category: 'Electrical', name: 'Shore Power Connection 16A', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-elec-3', category: 'Electrical', name: 'LED Ambient Lighting', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '28ts-elec-4', category: 'Electrical', name: 'Premium Audio System', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '28ts-elec-5', category: 'Electrical', name: 'Air Conditioning', isStandard: false, isOptional: true, price: 6500, unit: 'set', qty: 1 },

      // Navigation
      { id: '28ts-nav-1', category: 'Navigation', name: 'GPS Chartplotter 12"', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-nav-2', category: 'Navigation', name: 'VHF Radio with DSC', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-nav-3', category: 'Navigation', name: 'AIS Transponder', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-nav-4', category: 'Navigation', name: 'Autopilot System', isStandard: false, isOptional: true, price: 4200, unit: 'set', qty: 1 },
      { id: '28ts-nav-5', category: 'Navigation', name: 'Radar 4kW', isStandard: false, isOptional: true, price: 5800, unit: 'pcs', qty: 1 },

      // Comfort & Interior
      { id: '28ts-comfort-1', category: 'Comfort & Interior', name: 'Double Berth Cabin', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-comfort-2', category: 'Comfort & Interior', name: 'Marine Toilet', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-comfort-3', category: 'Comfort & Interior', name: 'Galley with Sink', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '28ts-comfort-4', category: 'Comfort & Interior', name: 'Refrigerator 65L', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-comfort-5', category: 'Comfort & Interior', name: 'Full Galley with Cooktop', isStandard: false, isOptional: true, price: 3800, unit: 'set', qty: 1 },
      { id: '28ts-comfort-6', category: 'Comfort & Interior', name: 'Teak Interior Package', isStandard: false, isOptional: true, price: 8500, unit: 'set', qty: 1 },

      // Exterior & Styling
      { id: '28ts-ext-1', category: 'Exterior & Styling', name: 'Hardtop with Sunroof', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28ts-ext-2', category: 'Exterior & Styling', name: 'Teak Deck (cockpit)', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '28ts-ext-3', category: 'Exterior & Styling', name: 'Full Teak Package', isStandard: false, isOptional: true, price: 12000, unit: 'set', qty: 1 },

      ...BASE_SAFETY_EQUIPMENT.map(item => ({ ...item, id: `28ts-${item.id}` })),
      ...BASE_DECK_EQUIPMENT.map(item => ({ ...item, id: `28ts-${item.id}` })),
    ],
  },

  // ============================================
  // Eagle 32TS (Flagship)
  // ============================================
  {
    modelId: 'model-4',
    modelName: 'Eagle 32TS',
    items: [
      // Hull & Structure
      { id: '32ts-hull-1', category: 'Hull & Structure', name: 'Aluminium Hull (marine grade)', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-hull-2', category: 'Hull & Structure', name: 'Hydraulic Swim Platform', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-hull-3', category: 'Hull & Structure', name: 'Full Standing Headroom Cabin', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-hull-4', category: 'Hull & Structure', name: 'Separate Heads Compartment', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },

      // Propulsion
      { id: '32ts-prop-1', category: 'Propulsion', name: 'Electric Motor 60kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-prop-2', category: 'Propulsion', name: 'Lithium Battery Pack 80kWh', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-prop-3', category: 'Propulsion', name: 'Shore Power Charger 11kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-prop-4', category: 'Propulsion', name: 'Bow Thruster', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-prop-5', category: 'Propulsion', name: 'Battery Upgrade to 120kWh', isStandard: false, isOptional: true, price: 28000, unit: 'pcs', qty: 1 },
      { id: '32ts-prop-6', category: 'Propulsion', name: 'Hybrid Generator 20kW', isStandard: false, isOptional: true, price: 24000, unit: 'set', qty: 1 },
      { id: '32ts-prop-7', category: 'Propulsion', name: 'Stern Thruster', isStandard: false, isOptional: true, price: 5200, unit: 'pcs', qty: 1 },

      // Electrical
      { id: '32ts-elec-1', category: 'Electrical', name: 'Full 230V AC System', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '32ts-elec-2', category: 'Electrical', name: 'Shore Power 32A', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-elec-3', category: 'Electrical', name: 'Premium Audio with Subwoofers', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '32ts-elec-4', category: 'Electrical', name: 'Air Conditioning', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '32ts-elec-5', category: 'Electrical', name: 'Heating System', isStandard: false, isOptional: true, price: 4800, unit: 'set', qty: 1 },

      // Navigation
      { id: '32ts-nav-1', category: 'Navigation', name: 'Glass Cockpit Display 16"', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-nav-2', category: 'Navigation', name: 'Radar 4kW with MARPA', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-nav-3', category: 'Navigation', name: 'AIS Class B', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-nav-4', category: 'Navigation', name: 'Autopilot', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '32ts-nav-5', category: 'Navigation', name: 'Thermal Camera', isStandard: false, isOptional: true, price: 8500, unit: 'pcs', qty: 1 },

      // Comfort & Interior
      { id: '32ts-comfort-1', category: 'Comfort & Interior', name: 'Master Cabin with Island Berth', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-comfort-2', category: 'Comfort & Interior', name: 'Electric Marine Toilet', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-comfort-3', category: 'Comfort & Interior', name: 'Full Galley with Oven', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '32ts-comfort-4', category: 'Comfort & Interior', name: 'Refrigerator/Freezer 120L', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-comfort-5', category: 'Comfort & Interior', name: 'Guest Cabin', isStandard: false, isOptional: true, price: 15000, unit: 'pcs', qty: 1 },
      { id: '32ts-comfort-6', category: 'Comfort & Interior', name: 'Washer/Dryer', isStandard: false, isOptional: true, price: 3200, unit: 'pcs', qty: 1 },

      // Exterior & Styling
      { id: '32ts-ext-1', category: 'Exterior & Styling', name: 'Hardtop with Electric Sunroof', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '32ts-ext-2', category: 'Exterior & Styling', name: 'Full Teak Deck', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '32ts-ext-3', category: 'Exterior & Styling', name: 'Hydraulic Passerelle', isStandard: false, isOptional: true, price: 8500, unit: 'pcs', qty: 1 },

      ...BASE_SAFETY_EQUIPMENT.map(item => ({ ...item, id: `32ts-${item.id}` })),
      ...BASE_DECK_EQUIPMENT.map(item => ({ ...item, id: `32ts-${item.id}` })),
    ],
  },

  // ============================================
  // Eagle C550
  // ============================================
  {
    modelId: 'model-5',
    modelName: 'Eagle C550',
    items: [
      { id: 'c550-hull-1', category: 'Hull & Structure', name: 'Aluminium Hull (classic sloep)', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c550-hull-2', category: 'Hull & Structure', name: 'Low Freeboard Design', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c550-prop-1', category: 'Propulsion', name: 'Electric Motor 6kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c550-prop-2', category: 'Propulsion', name: 'Lithium Battery 5kWh', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c550-prop-3', category: 'Propulsion', name: 'Battery Upgrade to 8kWh', isStandard: false, isOptional: true, price: 2800, unit: 'pcs', qty: 1 },
      { id: 'c550-comfort-1', category: 'Comfort & Interior', name: 'Bench Seating for 6', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: 'c550-comfort-2', category: 'Comfort & Interior', name: 'Convertible Table', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c550-comfort-3', category: 'Comfort & Interior', name: 'Bimini Top', isStandard: false, isOptional: true, price: 1200, unit: 'pcs', qty: 1 },
      { id: 'c550-comfort-4', category: 'Comfort & Interior', name: 'Teak Table Top', isStandard: false, isOptional: true, price: 650, unit: 'pcs', qty: 1 },
      ...BASE_SAFETY_EQUIPMENT.map(item => ({ ...item, id: `c550-${item.id}` })),
      ...BASE_DECK_EQUIPMENT.map(item => ({ ...item, id: `c550-${item.id}` })),
    ],
  },

  // ============================================
  // Eagle C570
  // ============================================
  {
    modelId: 'model-6',
    modelName: 'Eagle C570',
    items: [
      { id: 'c570-hull-1', category: 'Hull & Structure', name: 'Aluminium Hull (classic sloep)', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c570-prop-1', category: 'Propulsion', name: 'Electric Motor 8kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c570-prop-2', category: 'Propulsion', name: 'Lithium Battery 6kWh', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c570-prop-3', category: 'Propulsion', name: 'Battery Upgrade to 10kWh', isStandard: false, isOptional: true, price: 3200, unit: 'pcs', qty: 1 },
      { id: 'c570-comfort-1', category: 'Comfort & Interior', name: 'Enhanced Seating', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: 'c570-comfort-2', category: 'Comfort & Interior', name: 'Storage Compartments', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: 'c570-comfort-3', category: 'Comfort & Interior', name: 'Bimini Top', isStandard: false, isOptional: true, price: 1400, unit: 'pcs', qty: 1 },
      { id: 'c570-elec-1', category: 'Electrical', name: 'Bluetooth Audio', isStandard: false, isOptional: true, price: 650, unit: 'set', qty: 1 },
      ...BASE_SAFETY_EQUIPMENT.map(item => ({ ...item, id: `c570-${item.id}` })),
      ...BASE_DECK_EQUIPMENT.map(item => ({ ...item, id: `c570-${item.id}` })),
    ],
  },

  // ============================================
  // Eagle C720
  // ============================================
  {
    modelId: 'model-7',
    modelName: 'Eagle C720',
    items: [
      { id: 'c720-hull-1', category: 'Hull & Structure', name: 'Aluminium Hull (grand touring)', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c720-prop-1', category: 'Propulsion', name: 'Electric Motor 15kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c720-prop-2', category: 'Propulsion', name: 'Lithium Battery 15kWh', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c720-prop-3', category: 'Propulsion', name: 'Battery Upgrade to 25kWh', isStandard: false, isOptional: true, price: 7500, unit: 'pcs', qty: 1 },
      { id: 'c720-comfort-1', category: 'Comfort & Interior', name: 'Spacious Deck Layout', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: 'c720-comfort-2', category: 'Comfort & Interior', name: 'Full Sunbed', isStandard: false, isOptional: true, price: 2400, unit: 'pcs', qty: 1 },
      { id: 'c720-comfort-3', category: 'Comfort & Interior', name: 'Coolbox', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c720-nav-1', category: 'Navigation', name: 'GPS Chartplotter 7"', isStandard: false, isOptional: true, price: 1200, unit: 'pcs', qty: 1 },
      { id: 'c720-ext-1', category: 'Exterior & Styling', name: 'Bimini Top', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c720-ext-2', category: 'Exterior & Styling', name: 'Spray Hood', isStandard: false, isOptional: true, price: 1800, unit: 'pcs', qty: 1 },
      ...BASE_SAFETY_EQUIPMENT.map(item => ({ ...item, id: `c720-${item.id}` })),
      ...BASE_DECK_EQUIPMENT.map(item => ({ ...item, id: `c720-${item.id}` })),
    ],
  },

  // ============================================
  // Eagle C999
  // ============================================
  {
    modelId: 'model-8',
    modelName: 'Eagle C999',
    items: [
      { id: 'c999-hull-1', category: 'Hull & Structure', name: 'Aluminium Hull (flagship classic)', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c999-hull-2', category: 'Hull & Structure', name: 'Optional Cabin', isStandard: false, isOptional: true, price: 18000, unit: 'pcs', qty: 1 },
      { id: 'c999-prop-1', category: 'Propulsion', name: 'Electric Motor 30kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c999-prop-2', category: 'Propulsion', name: 'Lithium Battery 40kWh', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c999-prop-3', category: 'Propulsion', name: 'Hybrid System', isStandard: false, isOptional: true, price: 22000, unit: 'set', qty: 1 },
      { id: 'c999-prop-4', category: 'Propulsion', name: 'Bow Thruster', isStandard: false, isOptional: true, price: 4200, unit: 'pcs', qty: 1 },
      { id: 'c999-comfort-1', category: 'Comfort & Interior', name: 'Luxury Seating for 12', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: 'c999-comfort-2', category: 'Comfort & Interior', name: 'Full Galley', isStandard: false, isOptional: true, price: 4500, unit: 'set', qty: 1 },
      { id: 'c999-comfort-3', category: 'Comfort & Interior', name: 'Marine Toilet', isStandard: false, isOptional: true, price: 2800, unit: 'pcs', qty: 1 },
      { id: 'c999-nav-1', category: 'Navigation', name: 'GPS Chartplotter 9"', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c999-ext-1', category: 'Exterior & Styling', name: 'Bimini Top', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'c999-ext-2', category: 'Exterior & Styling', name: 'Full Enclosure', isStandard: false, isOptional: true, price: 5500, unit: 'set', qty: 1 },
      ...BASE_SAFETY_EQUIPMENT.map(item => ({ ...item, id: `c999-${item.id}` })),
      ...BASE_DECK_EQUIPMENT.map(item => ({ ...item, id: `c999-${item.id}` })),
    ],
  },

  // ============================================
  // Eagle 28SG
  // ============================================
  {
    modelId: 'model-9',
    modelName: 'Eagle 28SG',
    items: [
      { id: '28sg-hull-1', category: 'Hull & Structure', name: 'Sport-Classic Hull Design', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28sg-prop-1', category: 'Propulsion', name: 'Electric Motor 35kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28sg-prop-2', category: 'Propulsion', name: 'Lithium Battery 35kWh', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28sg-prop-3', category: 'Propulsion', name: 'Hybrid Option', isStandard: false, isOptional: true, price: 18000, unit: 'set', qty: 1 },
      { id: '28sg-comfort-1', category: 'Comfort & Interior', name: 'Versatile Deck Layout', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: '28sg-comfort-2', category: 'Comfort & Interior', name: 'Cabin with Berth', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28sg-nav-1', category: 'Navigation', name: 'GPS Chartplotter 9"', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: '28sg-ext-1', category: 'Exterior & Styling', name: 'Optional Hardtop', isStandard: false, isOptional: true, price: 8500, unit: 'pcs', qty: 1 },
      ...BASE_SAFETY_EQUIPMENT.map(item => ({ ...item, id: `28sg-${item.id}` })),
      ...BASE_DECK_EQUIPMENT.map(item => ({ ...item, id: `28sg-${item.id}` })),
    ],
  },

  // ============================================
  // Eagle Hybruut 28
  // ============================================
  {
    modelId: 'model-10',
    modelName: 'Eagle Hybruut 28',
    items: [
      { id: 'hyb28-hull-1', category: 'Hull & Structure', name: 'Aluminium Hull (hybrid-optimized)', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'hyb28-prop-1', category: 'Propulsion', name: 'Hybrid Propulsion System', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: 'hyb28-prop-2', category: 'Propulsion', name: 'Electric Motor 30kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'hyb28-prop-3', category: 'Propulsion', name: 'Diesel Generator 15kW', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'hyb28-prop-4', category: 'Propulsion', name: 'Lithium Battery 30kWh', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'hyb28-prop-5', category: 'Propulsion', name: 'Extended Battery 50kWh', isStandard: false, isOptional: true, price: 14000, unit: 'pcs', qty: 1 },
      { id: 'hyb28-prop-6', category: 'Propulsion', name: 'Bow Thruster', isStandard: false, isOptional: true, price: 4500, unit: 'pcs', qty: 1 },
      { id: 'hyb28-comfort-1', category: 'Comfort & Interior', name: 'Cabin with Double Berth', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'hyb28-comfort-2', category: 'Comfort & Interior', name: 'Marine Toilet', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'hyb28-comfort-3', category: 'Comfort & Interior', name: 'Galley', isStandard: true, isOptional: false, price: 0, unit: 'set', qty: 1 },
      { id: 'hyb28-nav-1', category: 'Navigation', name: 'GPS Chartplotter 12"', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      { id: 'hyb28-nav-2', category: 'Navigation', name: 'VHF Radio', isStandard: true, isOptional: false, price: 0, unit: 'pcs', qty: 1 },
      ...BASE_SAFETY_EQUIPMENT.map(item => ({ ...item, id: `hyb28-${item.id}` })),
      ...BASE_DECK_EQUIPMENT.map(item => ({ ...item, id: `hyb28-${item.id}` })),
    ],
  },
];

// Helper functions
export function getEquipmentTemplate(modelId: string): EquipmentTemplate | undefined {
  return EQUIPMENT_TEMPLATES.find(t => t.modelId === modelId);
}

export function getStandardItems(modelId: string): EquipmentTemplateItem[] {
  const template = getEquipmentTemplate(modelId);
  return template?.items.filter(item => item.isStandard) || [];
}

export function getOptionalItems(modelId: string): EquipmentTemplateItem[] {
  const template = getEquipmentTemplate(modelId);
  return template?.items.filter(item => item.isOptional) || [];
}

export function calculateConfigurationPrice(
  modelBasePrice: number,
  selectedOptions: string[]
): { basePrice: number; optionsTotal: number; totalPrice: number } {
  let optionsTotal = 0;

  for (const template of EQUIPMENT_TEMPLATES) {
    for (const item of template.items) {
      if (selectedOptions.includes(item.id)) {
        optionsTotal += item.price * item.qty;
      }
    }
  }

  return {
    basePrice: modelBasePrice,
    optionsTotal,
    totalPrice: modelBasePrice + optionsTotal,
  };
}
