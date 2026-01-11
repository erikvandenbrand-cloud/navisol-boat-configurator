/**
 * EAGLE BOATS - Default Model Data
 * Based on: https://eagleboats.nl
 *
 * Dutch-built aluminium boats with electric and hybrid propulsion
 * Location: Elburg, The Netherlands
 */

import type { Model, PropulsionType, CECategory } from './new-structure-types';

// ============================================
// BOAT RANGES (Series)
// ============================================

export type BoatRange = 'TS' | 'CLASSIC' | 'SG' | 'HYBRUUT' | 'FORCE' | 'SALOON';

export const BOAT_RANGES: Record<BoatRange, {
  name: string;
  description: string;
  propulsion_focus: PropulsionType[];
}> = {
  TS: {
    name: 'TS Series',
    description: 'T-Top Sport - Flagship electric line with modern styling',
    propulsion_focus: ['Electric'],
  },
  CLASSIC: {
    name: 'Classic Series',
    description: 'Traditional Dutch sloep style for canals and inland waters',
    propulsion_focus: ['Electric'],
  },
  SG: {
    name: 'SG Series',
    description: 'Sport Grand - Versatile elegance for all conditions',
    propulsion_focus: ['Electric', 'Hybrid'],
  },
  HYBRUUT: {
    name: 'Hybruut Series',
    description: 'Hybrid propulsion - Electric comfort with combustion range',
    propulsion_focus: ['Hybrid'],
  },
  FORCE: {
    name: 'Force Series',
    description: 'Commercial work boats for business and fleet operations',
    propulsion_focus: ['Electric', 'Hybrid'],
  },
  SALOON: {
    name: 'Saloon Series',
    description: 'Enclosed cabin models for year-round cruising',
    propulsion_focus: ['Electric', 'Hybrid'],
  },
};

// ============================================
// DEFAULT MODELS
// ============================================

export interface EagleBoatModel extends Omit<Model, 'id' | 'created_at' | 'updated_at'> {
  range: BoatRange;
  tagline: string;
  highlights: string[];
  image_url: string;
}

export const DEFAULT_EAGLE_MODELS: EagleBoatModel[] = [
  // ============================================
  // TS SERIES - Flagship Electric
  // ============================================
  {
    name: 'Eagle 525T',
    range: 'TS',
    tagline: 'Elegant day cruising',
    description: 'Compact yet sophisticated day cruiser with the signature Eagle T-Top styling. Perfect for couples and small families exploring coastal waters.',
    length_m: 5.25,
    beam_m: 2.10,
    draft_m: 0.35,
    weight_kg: 850,
    max_persons: 5,
    ce_category: 'C' as CECategory,
    available_propulsion: ['Electric'] as PropulsionType[],
    default_propulsion: 'Electric' as PropulsionType,
    base_price_excl_vat: 45000,
    is_active: true,
    is_default: true,
    highlights: [
      'Compact T-Top design',
      'Silent electric propulsion',
      'Premium upholstery',
      'Integrated swim platform',
    ],
    image_url: 'https://ext.same-assets.com/1354135331/3705907936.jpeg',
  },
  {
    name: 'Eagle 25TS',
    range: 'TS',
    tagline: 'Sophisticated tender',
    description: 'HISWA Electric Boat of the Year 2025. The Eagle 25TS sets a new standard for electric boating, combining Dutch engineering excellence with sustainable propulsion.',
    length_m: 7.50,
    beam_m: 2.50,
    draft_m: 0.45,
    weight_kg: 1800,
    max_persons: 8,
    ce_category: 'C' as CECategory,
    available_propulsion: ['Electric'] as PropulsionType[],
    default_propulsion: 'Electric' as PropulsionType,
    base_price_excl_vat: 89000,
    is_active: true,
    is_default: true,
    highlights: [
      '⭐ HISWA Electric Boat of the Year 2025',
      'Award-winning design',
      'Premium aluminium construction',
      'Extended range battery system',
      'Luxurious interior finish',
    ],
    image_url: 'https://ext.same-assets.com/1354135331/803860996.jpeg',
  },
  {
    name: 'Eagle 28TS',
    range: 'TS',
    tagline: 'Premium comfort',
    description: 'Spacious day cruiser with overnight capability. The 28TS offers the perfect balance of performance, comfort, and electric efficiency.',
    length_m: 8.50,
    beam_m: 2.80,
    draft_m: 0.55,
    weight_kg: 2800,
    max_persons: 10,
    ce_category: 'C' as CECategory,
    available_propulsion: ['Electric', 'Hybrid'] as PropulsionType[],
    default_propulsion: 'Electric' as PropulsionType,
    base_price_excl_vat: 125000,
    is_active: true,
    is_default: true,
    highlights: [
      'Overnight cabin option',
      'Dual battery banks',
      'Premium helm station',
      'Full galley available',
    ],
    image_url: 'https://ext.same-assets.com/1354135331/624305291.webp',
  },
  {
    name: 'Eagle 32TS',
    range: 'TS',
    tagline: 'Spacious luxury',
    description: 'The flagship of the TS series. Uncompromising luxury meets sustainable technology in this impressive 32-foot electric cruiser.',
    length_m: 9.70,
    beam_m: 3.20,
    draft_m: 0.65,
    weight_kg: 4200,
    max_persons: 12,
    ce_category: 'B' as CECategory,
    available_propulsion: ['Electric', 'Hybrid'] as PropulsionType[],
    default_propulsion: 'Electric' as PropulsionType,
    base_price_excl_vat: 185000,
    is_active: true,
    is_default: true,
    highlights: [
      'Flagship model',
      'Full standing headroom cabin',
      'Separate heads compartment',
      'Premium sound system',
      'Extended cruising range',
    ],
    image_url: 'https://ext.same-assets.com/1354135331/3150293400.jpeg',
  },

  // ============================================
  // CLASSIC SERIES - Traditional Dutch Sloep
  // ============================================
  {
    name: 'Eagle C550',
    range: 'CLASSIC',
    tagline: 'Canal pleasure',
    description: 'Compact classic sloep designed for Dutch canals and small waterways. Traditional styling with modern electric propulsion.',
    length_m: 5.50,
    beam_m: 2.00,
    draft_m: 0.30,
    weight_kg: 700,
    max_persons: 6,
    ce_category: 'D' as CECategory,
    available_propulsion: ['Electric'] as PropulsionType[],
    default_propulsion: 'Electric' as PropulsionType,
    base_price_excl_vat: 38000,
    is_active: true,
    is_default: true,
    highlights: [
      'Traditional sloep design',
      'Low bridge clearance',
      'Silent canal cruising',
      'Easy single-handed operation',
    ],
    image_url: 'https://ext.same-assets.com/1354135331/618955806.jpeg',
  },
  {
    name: 'Eagle C570',
    range: 'CLASSIC',
    tagline: 'Canal pleasure plus',
    description: 'Slightly larger classic sloep with enhanced comfort features. Perfect for day trips on Dutch waterways.',
    length_m: 5.70,
    beam_m: 2.10,
    draft_m: 0.32,
    weight_kg: 780,
    max_persons: 6,
    ce_category: 'D' as CECategory,
    available_propulsion: ['Electric'] as PropulsionType[],
    default_propulsion: 'Electric' as PropulsionType,
    base_price_excl_vat: 42000,
    is_active: true,
    is_default: true,
    highlights: [
      'Enhanced seating capacity',
      'Improved storage',
      'Traditional craftsmanship',
      'Electric efficiency',
    ],
    image_url: 'https://ext.same-assets.com/1354135331/618955806.jpeg',
  },
  {
    name: 'Eagle C720',
    range: 'CLASSIC',
    tagline: 'Grand touring',
    description: 'The grand tourer of the Classic series. Spacious traditional sloep for extended day cruises and entertaining.',
    length_m: 7.20,
    beam_m: 2.40,
    draft_m: 0.40,
    weight_kg: 1400,
    max_persons: 8,
    ce_category: 'C' as CECategory,
    available_propulsion: ['Electric'] as PropulsionType[],
    default_propulsion: 'Electric' as PropulsionType,
    base_price_excl_vat: 68000,
    is_active: true,
    is_default: true,
    highlights: [
      'Spacious deck layout',
      'Full sunbed option',
      'Premium upholstery',
      'Entertaining-ready',
    ],
    image_url: 'https://ext.same-assets.com/1354135331/2734770259.jpeg',
  },
  {
    name: 'Eagle C999',
    range: 'CLASSIC',
    tagline: 'Ultimate freedom',
    description: 'The ultimate classic sloep. Nearly 10 meters of pure Dutch craftsmanship with the option for hybrid propulsion for extended range.',
    length_m: 9.99,
    beam_m: 3.00,
    draft_m: 0.55,
    weight_kg: 3500,
    max_persons: 12,
    ce_category: 'C' as CECategory,
    available_propulsion: ['Electric', 'Hybrid'] as PropulsionType[],
    default_propulsion: 'Electric' as PropulsionType,
    base_price_excl_vat: 145000,
    is_active: true,
    is_default: true,
    highlights: [
      'Flagship classic model',
      'Hybrid option available',
      'Full cabin possibility',
      'Ultimate comfort',
    ],
    image_url: 'https://ext.same-assets.com/1354135331/3910772652.jpeg',
  },

  // ============================================
  // SG SERIES - Sport Grand
  // ============================================
  {
    name: 'Eagle 28SG',
    range: 'SG',
    tagline: 'Versatile elegance',
    description: 'The Sport Grand combines the best of both worlds - sporty performance with elegant classic lines. A versatile choice for the discerning owner.',
    length_m: 8.50,
    beam_m: 2.75,
    draft_m: 0.50,
    weight_kg: 2600,
    max_persons: 10,
    ce_category: 'C' as CECategory,
    available_propulsion: ['Electric', 'Hybrid'] as PropulsionType[],
    default_propulsion: 'Electric' as PropulsionType,
    base_price_excl_vat: 115000,
    is_active: true,
    is_default: true,
    highlights: [
      'Sport-classic hybrid design',
      'Versatile deck layout',
      'Performance-oriented hull',
      'Optional hardtop',
    ],
    image_url: 'https://ext.same-assets.com/1354135331/3832940634.jpeg',
  },

  // ============================================
  // HYBRUUT SERIES - Hybrid Propulsion
  // ============================================
  {
    name: 'Eagle Hybruut 28',
    range: 'HYBRUUT',
    tagline: 'Silent exploration',
    description: 'The Hybruut 28 offers the best of both worlds: silent electric cruising for everyday use with combustion range when you need it.',
    length_m: 8.50,
    beam_m: 2.80,
    draft_m: 0.55,
    weight_kg: 3000,
    max_persons: 10,
    ce_category: 'C' as CECategory,
    available_propulsion: ['Hybrid'] as PropulsionType[],
    default_propulsion: 'Hybrid' as PropulsionType,
    base_price_excl_vat: 135000,
    is_active: true,
    is_default: true,
    highlights: [
      'True hybrid system',
      'Extended cruising range',
      'Silent electric mode',
      'Diesel generator charging',
    ],
    image_url: 'https://ext.same-assets.com/1354135331/2291826846.jpeg',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getModelsByRange(range: BoatRange): EagleBoatModel[] {
  return DEFAULT_EAGLE_MODELS.filter(m => m.range === range);
}

export function getActiveModels(): EagleBoatModel[] {
  return DEFAULT_EAGLE_MODELS.filter(m => m.is_active);
}

export function getModelByName(name: string): EagleBoatModel | undefined {
  return DEFAULT_EAGLE_MODELS.find(m => m.name === name);
}

// ============================================
// COMPANY INFO
// ============================================

export const EAGLE_BOATS_COMPANY = {
  name: 'Eagle Boats',
  legal_name: 'Eagle Boats B.V.',
  tagline: 'Dutch-Built Aluminium Boats',
  description: 'Engineering excellence meets sustainable propulsion',

  address: {
    street: 'Industrieweg',
    city: 'Elburg',
    postal_code: '8081 HH',
    country: 'The Netherlands',
  },

  contact: {
    phone: '+31 (0)85 0600 139',
    email: 'info@eagleboats.nl',
    website: 'https://eagleboats.nl',
  },

  branding: {
    logo_url: 'https://ext.same-assets.com/1354135331/3210280025.png',
    primary_color: '#2f754e', // eagle-green
    accent_color: '#0f2434',  // dark blue
  },
};
