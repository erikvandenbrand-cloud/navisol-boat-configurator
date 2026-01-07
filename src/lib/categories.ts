// Navisol Categories & Subcategories Taxonomy

import type { CategoryDefinition } from './types';

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: '1',
    name: '1. Hull & Structural Components',
    subcategories: [
      {
        id: '1.1',
        name: '1.1 Hull Construction',
        items: ['Hull plating', 'Self-draining cockpit', 'Floor structure', 'Decks (fore, aft)', 'Bench structures', 'Console', 'Technical compartment', 'Overlapping strakes', 'Planing hull structure', 'Engine bed']
      },
      {
        id: '1.2',
        name: '1.2 Appendages & Underwater Gear',
        items: ['Propeller shaft tube', 'Rudder + stock', 'Skeg/keel protection', 'Bow thruster tunnel']
      },
      {
        id: '1.3',
        name: '1.3 Deck & Exterior Structure',
        items: ['Swim platform', 'Swim ladder', 'Towing eye', 'Deck hatches', 'Cleats/bollards', 'Flagpole holder', 'Anchor locker', 'Handrails/grab rails']
      },
      {
        id: '1.4',
        name: '1.4 Insulation & Coatings',
        items: ['Sound insulation', 'Thermal insulation', 'Anti-corrosion coatings', 'Paint/primer/antifouling']
      }
    ]
  },
  {
    id: '2',
    name: '2. Propulsion & Drivetrain',
    subcategories: [
      {
        id: '2.1',
        name: '2.1 Motorisation (Electric/Diesel/Hybrid)',
        items: ['Electric inboard motor', 'Diesel inboard motor', 'Hybrid inboard motor', 'Hybrid control unit', 'Hybrid clutch/coupling', 'Hybrid generator', 'Throttle/control panel', 'Steering cables', 'Cooling systems', 'Battery packs', 'Chargers', 'Main switches', 'Battery boxes']
      },
      {
        id: '2.2',
        name: '2.2 Propeller Shaft System',
        items: ['Propeller shaft', 'Rubber bearing', 'Flexible coupling', 'Shaft anode', 'Propeller', 'Rope cutter', 'Water scoop + seacock']
      },
      {
        id: '2.3',
        name: '2.3 Fuel System (Diesel & Hybrid)',
        items: ['Fuel tank', 'Fuel hoses', 'Fuel filters', 'Fuel level sensor', 'Ventilation fittings']
      },
      {
        id: '2.4',
        name: '2.4 High Voltage System (Electric & Hybrid)',
        items: ['HV cables', 'HV connectors', 'HV safety switches', 'HV distribution box', 'DC-DC converters']
      }
    ]
  },
  {
    id: '3',
    name: '3. Steering System',
    subcategories: [
      {
        id: '3.1',
        name: '3.1 Hydraulic Steering',
        items: ['Helm pump', 'Cylinder', 'Hose kit']
      },
      {
        id: '3.2',
        name: '3.2 Mechanical Components',
        items: ['Steering wheel', 'Steering tiller', 'Rudder bearings']
      },
      {
        id: '3.3',
        name: '3.3 Control Systems',
        items: ['Electronic steering modules', 'CAN steering components']
      }
    ]
  },
  {
    id: '4',
    name: '4. Electrical System & Navigation',
    subcategories: [
      {
        id: '4.1',
        name: '4.1 Power Distribution',
        items: ['12V DC distribution', '48V DC distribution', '230/400V AC distribution', 'Fuses & holders', 'Grounding system', 'Wiring', 'Cable ducts', 'Armoflex hose', 'Hose clamps']
      },
      {
        id: '4.2',
        name: '4.2 Navigation & Communication',
        items: ['Navigation lights', 'Masthead/anchor light', 'AIS transponder', 'GPS antenna', 'VHF radio', 'Handheld VHF', 'VHF antenna', 'AIS antenna']
      },
      {
        id: '4.3',
        name: '4.3 Monitoring & Instrumentation',
        items: ['Battery monitor', 'Engine monitor', 'Hybrid system monitor', 'Speed/depth instruments', 'Rudder angle indicator']
      },
      {
        id: '4.4',
        name: '4.4 Pumps & Switches',
        items: ['Bilge pumps', 'Switch panels', 'Main switches', 'Chargers', 'Inverters']
      },
      {
        id: '4.5',
        name: '4.5 Bow Thruster System',
        items: ['Bow thruster', 'Joystick', 'CAN cabling', 'Installation kit']
      },
      {
        id: '4.6',
        name: '4.6 Lighting (Interior & Exterior)',
        items: ['Cabin lights', 'Cockpit lights', 'Courtesy lights', 'Underwater lights']
      }
    ]
  },
  {
    id: '5',
    name: '5. Deck Equipment & Comfort',
    subcategories: [
      {
        id: '5.1',
        name: '5.1 Mooring & Anchoring',
        items: ['Anchor', 'Fenders', 'Mooring lines', 'Boathook']
      },
      {
        id: '5.2',
        name: '5.2 Safety & Rescue',
        items: ['Lifebuoy', 'Throw line', 'Emergency light']
      },
      {
        id: '5.3',
        name: '5.3 Hardware & Fittings',
        items: ['Hatch latches', 'Hinges', 'EPDM rubber', 'Fender profile', 'Gas struts']
      },
      {
        id: '5.4',
        name: '5.4 Aesthetics',
        items: ['Decals', 'Flagpole + flag']
      },
      {
        id: '5.5',
        name: '5.5 Canvas & Covers',
        items: ['Bimini top', 'Sprayhood', 'Full boat cover', 'Console cover']
      }
    ]
  },
  {
    id: '6',
    name: '6. Interior & Finishing',
    subcategories: [
      {
        id: '6.1',
        name: '6.1 Seating & Upholstery',
        items: ['Cushion set', "Captain's chair"]
      },
      {
        id: '6.2',
        name: '6.2 Flooring & Surfaces',
        items: ['Seadek/flexiteak']
      },
      {
        id: '6.3',
        name: '6.3 Interior Components',
        items: ['Storage compartments', 'Technical compartment finishing', 'Sound insulation', 'Interior lighting']
      },
      {
        id: '6.4',
        name: '6.4 Galley/Interior Options',
        items: ['Sink', 'Water pump', 'Freshwater tank', 'Refrigerator']
      }
    ]
  },
  {
    id: '7',
    name: '7. Safety & Certification',
    subcategories: [
      {
        id: '7.1',
        name: '7.1 Safety Equipment',
        items: ['Fire extinguishers', 'Emergency hammer', 'First aid kit']
      },
      {
        id: '7.2',
        name: '7.2 Certification & Documentation',
        items: ['AIS certification', 'SI/CVO inspection', 'Manuals & documentation', 'Navigation rules plate']
      }
    ]
  },
  {
    id: '8',
    name: '8. Plumbing & Ventilation',
    subcategories: [
      {
        id: '8.1',
        name: '8.1 Freshwater System',
        items: ['Water tank', 'Water pump', 'Hoses', 'Fittings']
      },
      {
        id: '8.2',
        name: '8.2 Wastewater/Bilge',
        items: ['Bilge hoses', 'Seacocks', 'Filters']
      },
      {
        id: '8.3',
        name: '8.3 Ventilation',
        items: ['Engine room vents', 'Deck vents', 'Fans']
      }
    ]
  },
  {
    id: '9',
    name: '9. Project & Operational Costs',
    subcategories: [
      {
        id: '9.1',
        name: '9.1 Labour & Services',
        items: ['Installation labour', 'Engineering/E-plan', 'Project management', 'Commissioning/sea trial', 'Internal transport', 'External transport', 'Warranty documentation']
      }
    ]
  }
];

// Helper to get all category names
export function getCategoryNames(): string[] {
  return CATEGORIES.map(c => c.name);
}

// Helper to get subcategories for a category
export function getSubcategoriesForCategory(categoryName: string): string[] {
  const category = CATEGORIES.find(c => c.name === categoryName);
  return category ? category.subcategories.map(s => s.name) : [];
}

// Helper to validate category/subcategory
export function validateCategorySubcategory(category: string, subcategory: string): boolean {
  const cat = CATEGORIES.find(c => c.name === category);
  if (!cat) return false;
  return cat.subcategories.some(s => s.name === subcategory);
}

// Helper to find closest matching category
export function findClosestCategory(input: string): string[] {
  const lowerInput = input.toLowerCase();
  return CATEGORIES
    .filter(c => c.name.toLowerCase().includes(lowerInput))
    .map(c => c.name);
}
