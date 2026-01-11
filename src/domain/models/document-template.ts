/**
 * Document Template Models - v4
 * Project-scoped editable document templates for CE compliance documentation
 * Templates are versioned: DRAFT → APPROVED (immutable)
 * Types: DoC (Declaration of Conformity), Owner's Manual, CE Marking Certificate, Annex Index
 */

import type { Entity } from './common';
import { generateUUID, now } from './common';

// ============================================
// DOCUMENT TEMPLATE TYPES
// ============================================

export const CE_DOCUMENT_TEMPLATE_TYPES = [
  'DOC_DOC', // Declaration of Conformity
  'DOC_OWNERS_MANUAL', // Owner's Manual
  'DOC_CE_MARKING_CERT', // CE Marking Certificate
  'DOC_ANNEX_INDEX', // Annex Index
] as const;

export type CEDocumentTemplateType = (typeof CE_DOCUMENT_TEMPLATE_TYPES)[number];

// ============================================
// TEMPLATE TYPE LABELS (FOR UI)
// ============================================

export const CE_DOCUMENT_TEMPLATE_LABELS: Record<CEDocumentTemplateType, string> = {
  DOC_DOC: 'Declaration of Conformity',
  DOC_OWNERS_MANUAL: "Owner's Manual",
  DOC_CE_MARKING_CERT: 'CE Marking Certificate',
  DOC_ANNEX_INDEX: 'Annex Index',
};

// ============================================
// TEMPLATE VERSION STATUS
// ============================================

export type DocumentTemplateVersionStatus = 'DRAFT' | 'APPROVED';

// ============================================
// IMAGE SLOT (PLACEHOLDER FOR IMAGES)
// ============================================

export interface DocumentTemplateImageSlot {
  key: string; // e.g., "manufacturer_logo", "ce_mark", "builder_plate"
  label: string; // Human-readable label for UI
  description?: string;
  dataUrl?: string; // Base64 data URL when filled
  caption?: string; // Optional caption for the image
}

// ============================================
// OWNER'S MANUAL MODULAR STRUCTURE
// ============================================

/**
 * Catalogue subchapter definition (static, stable IDs).
 */
export interface ManualCatalogueSubchapter {
  id: string; // Stable ID like "intro_welcome", "safety_equipment_list"
  order: number;
  title: string;
  /** System key that enables this subchapter by default (e.g., "shore_power", "fuel_system") */
  systemKey?: string;
  /** If true, included by default even without matching systemKey */
  defaultIncluded?: boolean;
  /** Image keys for this subchapter (creates {{IMAGE:key}} tokens) */
  imageKeys?: string[];
  /** Default AI-assisted seed content */
  seedContent: string;
}

/**
 * Catalogue chapter definition (static, stable IDs).
 */
export interface ManualCatalogueChapter {
  id: string; // Stable ID like "introduction", "safety", "propulsion"
  order: number;
  title: string;
  /** If true, this chapter is always included regardless of systems */
  alwaysApplicable?: boolean;
  subchapters: ManualCatalogueSubchapter[];
}

/**
 * Full catalogue structure for Owner's Manual.
 */
export interface ManualCatalogue {
  version: string;
  chapters: ManualCatalogueChapter[];
}

/**
 * A block in the Owner's Manual template version (editable unit).
 */
export interface ManualBlock {
  id: string;
  chapterId: string;
  subchapterId: string;
  order: number;
  /** Whether this block is included in the final document */
  included: boolean;
  /** Editable content (markdown/text) */
  content: string;
  /** Image slots for this block */
  imageSlots: DocumentTemplateImageSlot[];
}

// ============================================
// OWNER'S MANUAL CATALOGUE (STATIC DATA)
// ============================================

/**
 * System keys that can be set on a project.
 * Used to auto-include subchapters in Owner's Manual.
 */
export const SYSTEM_KEYS = [
  'electric_propulsion',
  'diesel_propulsion',
  'outboard_propulsion',
  'inboard_propulsion',
  'fuel_system',
  'shore_power',
  'solar_power',
  'generator',
  'hydraulic_steering',
  'cable_steering',
  'autopilot',
  'bilge_pump',
  'fire_extinguishers',
  'fire_suppression_system',
  'heating',
  'air_conditioning',
  'fresh_water',
  'hot_water',
  'waste_water',
  'holding_tank',
  'navigation_lights',
  'anchor_windlass',
  'bow_thruster',
  'stern_thruster',
  'radar',
  'ais',
  'vhf_radio',
  'chartplotter',
  'depth_sounder',
  'refrigeration',
  'galley',
  'heads',
  'shower',
  'davits',
  'tender',
  'swimming_platform',
  'bimini_top',
  'sprayhood',
] as const;

export type SystemKey = typeof SYSTEM_KEYS[number];

/**
 * Owner's Manual catalogue with all chapters and subchapters.
 * Each subchapter has AI-assisted seed content (neutral, non-claiming).
 */
export const OWNER_MANUAL_CATALOGUE: ManualCatalogue = {
  version: '1.0.0',
  chapters: [
    // Chapter 1: Introduction (always applicable)
    {
      id: 'introduction',
      order: 1,
      title: 'Introduction',
      alwaysApplicable: true,
      subchapters: [
        {
          id: 'intro_welcome',
          order: 1,
          title: 'Welcome',
          defaultIncluded: true,
          seedContent: `Congratulations on your new vessel. This Owner's Manual provides essential information for the safe operation, maintenance, and care of your boat. Please read this manual thoroughly before operating the vessel and keep it aboard at all times for future reference.

The information in this manual is based on the vessel configuration at delivery. If your vessel has been modified or if additional equipment has been fitted, please consult the relevant documentation for those items.`,
        },
        {
          id: 'intro_manual_use',
          order: 2,
          title: 'How to Use This Manual',
          defaultIncluded: true,
          seedContent: `This manual is organized into chapters covering different aspects of your vessel. Each chapter contains relevant information for that system or topic.

**Symbols Used:**
- Sections may be marked as applicable only if certain equipment is fitted
- Placeholder values (e.g., specifications) should be reviewed for accuracy
- Maintenance intervals are guidelines and may vary based on usage conditions`,
        },
        {
          id: 'intro_warranty',
          order: 3,
          title: 'Warranty Overview',
          defaultIncluded: true,
          seedContent: `Your vessel is covered by the manufacturer's warranty as detailed in the separate warranty documentation. The warranty terms, conditions, and coverage periods are specified in that document.

To maintain warranty coverage, please follow the recommended maintenance schedules and use qualified service personnel for any work beyond routine owner maintenance.`,
        },
      ],
    },
    // Chapter 2: Vessel Identification (always applicable)
    {
      id: 'vessel_identification',
      order: 2,
      title: 'Vessel Identification',
      alwaysApplicable: true,
      subchapters: [
        {
          id: 'id_builders_plate',
          order: 1,
          title: "Builder's Plate",
          defaultIncluded: true,
          imageKeys: ['builders_plate'],
          seedContent: `The builder's plate is permanently affixed to the vessel and contains essential identification information including:

- Manufacturer name and address
- Craft Identification Number (CIN)
- Design category
- Maximum load and persons
- CE marking (if applicable)

{{IMAGE:builders_plate}}

The builder's plate location is typically near the helm station or on a structural member. Do not remove or obscure this plate.`,
        },
        {
          id: 'id_specifications',
          order: 2,
          title: 'Principal Specifications',
          defaultIncluded: true,
          seedContent: `**Principal Dimensions:**
| Specification | Value |
|---------------|-------|
| Length Overall (LOA) | {{LENGTH_M}} m |
| Beam | {{BEAM_M}} m |
| Draft | {{DRAFT_M}} m |
| Displacement (light) | {{DISPLACEMENT_LIGHT_KG}} kg |
| Maximum Load | {{MAX_LOAD_KG}} kg |
| Maximum Persons | {{MAX_PERSONS}} |
| Design Category | {{DESIGN_CATEGORY}} |

These specifications represent the vessel as built. Actual values may vary slightly.`,
        },
        {
          id: 'id_design_category',
          order: 3,
          title: 'Design Category',
          defaultIncluded: true,
          seedContent: `This vessel has been assessed for Design Category {{DESIGN_CATEGORY}}.

**Design Categories:**
- **A (Ocean):** Designed for extended voyages, self-sufficient in severe weather
- **B (Offshore):** Designed for offshore voyages in moderate conditions
- **C (Inshore):** Designed for coastal waters, large bays, and estuaries
- **D (Sheltered waters):** Designed for small lakes, rivers, and canals

Always operate within the conditions appropriate for your vessel's design category.`,
        },
      ],
    },
    // Chapter 3: General Arrangement
    {
      id: 'general_arrangement',
      order: 3,
      title: 'General Arrangement',
      alwaysApplicable: true,
      subchapters: [
        {
          id: 'ga_deck_plan',
          order: 1,
          title: 'Deck Layout',
          defaultIncluded: true,
          imageKeys: ['deck_plan'],
          seedContent: `{{IMAGE:deck_plan}}

The deck layout shows the arrangement of exterior spaces, including:
- Helm station
- Seating areas
- Access points
- Mooring points
- Safety equipment locations

Familiarize yourself with all deck areas and their intended use before operating the vessel.`,
        },
        {
          id: 'ga_interior_layout',
          order: 2,
          title: 'Interior Layout',
          defaultIncluded: true,
          imageKeys: ['interior_layout'],
          seedContent: `{{IMAGE:interior_layout}}

The interior layout shows the arrangement of accommodation spaces, including:
- Cabin(s) and berths
- Saloon area
- Galley (if fitted)
- Heads compartment (if fitted)
- Storage areas

Familiarize yourself with all interior spaces and emergency exits.`,
        },
        {
          id: 'ga_storage',
          order: 3,
          title: 'Storage & Lockers',
          defaultIncluded: true,
          seedContent: `Storage lockers are provided throughout the vessel. Key storage locations include:

- Forepeak locker
- Cockpit lockers
- Under-berth storage
- Galley storage (if fitted)

When stowing gear, distribute weight evenly and secure loose items. Heavy items should be stowed low and centered. Always ensure access to safety equipment is not blocked.`,
        },
      ],
    },
    // Chapter 4: Safety Equipment
    {
      id: 'safety',
      order: 4,
      title: 'Safety Equipment',
      alwaysApplicable: true,
      subchapters: [
        {
          id: 'safety_required_equipment',
          order: 1,
          title: 'Required Safety Equipment',
          defaultIncluded: true,
          seedContent: `The following safety equipment should be carried aboard as appropriate for your operating area:

- Life jackets/PFDs for each person aboard
- Throwable flotation device
- Visual distress signals (flares, if required)
- Sound producing device (horn or whistle)
- Navigation lights (for night operation)
- Fire extinguisher(s)
- First aid kit
- Anchor and rode

Check local regulations for specific requirements in your operating area. Inspect all safety equipment regularly and replace expired items.`,
        },
        {
          id: 'safety_pfd_locations',
          order: 2,
          title: 'Life Jacket Locations',
          defaultIncluded: true,
          seedContent: `Life jackets (Personal Flotation Devices) are stored in designated locations aboard. Common storage locations include:

- Under cockpit seats
- In dedicated locker near companionway
- In cabin overhead compartments

Ensure all persons aboard know where life jackets are stored and how to properly wear them. Children should wear properly sized PFDs at all times when on deck.`,
        },
        {
          id: 'safety_fire',
          order: 3,
          title: 'Fire Safety',
          systemKey: 'fire_extinguishers',
          defaultIncluded: true,
          seedContent: `Fire extinguishers are located at key positions throughout the vessel. If fitted, common locations include:

- Near the galley
- Near the engine compartment access
- In the cockpit or helm area

Fire extinguishers should be inspected regularly and replaced or serviced according to manufacturer recommendations. Familiarize yourself with extinguisher operation before an emergency occurs.

**In Case of Fire:**
1. Alert all persons aboard
2. If safe to do so, fight the fire with appropriate extinguisher
3. Shut off fuel supply if applicable
4. Prepare to abandon ship if fire cannot be controlled
5. Call for assistance on VHF Channel 16`,
        },
        {
          id: 'safety_navigation_lights',
          order: 4,
          title: 'Navigation Lights',
          systemKey: 'navigation_lights',
          seedContent: `Navigation lights are required for operation between sunset and sunrise, and in restricted visibility. If fitted, your vessel includes:

- Port (red) and starboard (green) sidelights
- Stern light (white)
- Masthead/steaming light (if applicable)
- All-round anchor light

Check that all navigation lights are functioning before departing for night operation. Carry spare bulbs aboard.`,
        },
        {
          id: 'safety_bilge',
          order: 5,
          title: 'Bilge Pumps',
          systemKey: 'bilge_pump',
          seedContent: `If fitted, bilge pumps remove water that accumulates in the bilge. Your vessel may include:

- Electric bilge pump(s) with automatic float switch
- Manual bilge pump as backup

Check bilge pump operation regularly. Keep bilge area clean and free of debris that could clog pump intakes. Monitor bilge water levels as part of routine vessel checks.`,
        },
      ],
    },
    // Chapter 5: Propulsion System
    {
      id: 'propulsion',
      order: 5,
      title: 'Propulsion System',
      subchapters: [
        {
          id: 'prop_electric',
          order: 1,
          title: 'Electric Propulsion',
          systemKey: 'electric_propulsion',
          imageKeys: ['propulsion_diagram'],
          seedContent: `{{IMAGE:propulsion_diagram}}

If fitted, the electric propulsion system provides quiet, emission-free operation. Key components may include:

- Electric motor(s)
- Battery bank
- Motor controller
- Throttle control

**Operation Notes:**
- Monitor battery state of charge during operation
- Plan trips within available battery range
- Allow for reserve capacity for safety
- Follow charging procedures in the electrical system chapter

Refer to the motor manufacturer's documentation for specific operating procedures and maintenance requirements.`,
        },
        {
          id: 'prop_diesel',
          order: 2,
          title: 'Diesel Engine',
          systemKey: 'diesel_propulsion',
          imageKeys: ['engine_diagram'],
          seedContent: `{{IMAGE:engine_diagram}}

If fitted, the diesel engine provides reliable propulsion power. Key operating procedures include:

**Pre-Start Checks:**
- Check engine oil level
- Check coolant level
- Inspect for leaks
- Check raw water strainer (if applicable)
- Ensure fuel is sufficient

**Starting Procedure:**
- Ensure gearbox is in neutral
- Open raw water seacock (if applicable)
- Pre-heat if cold (as indicated)
- Start engine and check for cooling water discharge

Refer to the engine manufacturer's documentation for specific procedures, specifications, and maintenance requirements.`,
        },
        {
          id: 'prop_outboard',
          order: 3,
          title: 'Outboard Engine',
          systemKey: 'outboard_propulsion',
          seedContent: `If fitted, the outboard engine(s) provide propulsion. Key considerations include:

**Pre-Operation:**
- Check fuel level
- Inspect propeller for damage
- Verify engine is securely mounted
- Check kill switch lanyard

**Operation:**
- Always wear kill switch lanyard when operating
- Allow engine to warm up before applying full throttle
- Tilt engine when in shallow water

Refer to the outboard manufacturer's documentation for specific operating procedures and maintenance requirements.`,
        },
        {
          id: 'prop_inboard',
          order: 4,
          title: 'Inboard Engine',
          systemKey: 'inboard_propulsion',
          imageKeys: ['engine_compartment'],
          seedContent: `{{IMAGE:engine_compartment}}

If fitted, the inboard engine provides propulsion via fixed shaft and propeller. Key operating considerations include:

**Engine Compartment Access:**
The engine compartment provides access for checks and maintenance. Ensure adequate ventilation before starting.

**Pre-Start Checks:**
- Check oil and coolant levels
- Inspect belts and hoses
- Check for fuel or oil leaks
- Verify cooling water intake is clear

Refer to the engine manufacturer's documentation for specific procedures and specifications.`,
        },
        {
          id: 'prop_transmission',
          order: 5,
          title: 'Transmission & Gearbox',
          defaultIncluded: true,
          seedContent: `If fitted, the transmission or gearbox transfers engine power to the propeller. Operating notes:

- Always shift gears at low engine RPM
- Allow a brief pause when shifting between forward and reverse
- Check transmission fluid level per manufacturer schedule

Refer to the transmission manufacturer's documentation for specific requirements.`,
        },
      ],
    },
    // Chapter 6: Fuel System
    {
      id: 'fuel_system',
      order: 6,
      title: 'Fuel System',
      subchapters: [
        {
          id: 'fuel_overview',
          order: 1,
          title: 'Fuel System Overview',
          systemKey: 'fuel_system',
          imageKeys: ['fuel_system_diagram'],
          seedContent: `{{IMAGE:fuel_system_diagram}}

If fitted, the fuel system stores and delivers fuel to the engine(s). Key components may include:

- Fuel tank(s)
- Fuel fill and vent
- Fuel filter/water separator
- Fuel lines and connections
- Fuel shutoff valve(s)

**Fuel Capacity:** {{FUEL_CAPACITY_L}} L (if applicable)

Always use the correct fuel type as specified by the engine manufacturer.`,
        },
        {
          id: 'fuel_filling',
          order: 2,
          title: 'Fueling Procedures',
          systemKey: 'fuel_system',
          seedContent: `Safe fueling procedures, if applicable:

**Before Fueling:**
- Stop all engines
- Extinguish all flames
- Close all hatches and ports
- Turn off electrical equipment

**During Fueling:**
- Maintain nozzle contact with fill to prevent static discharge
- Do not overfill
- Wipe up any spills immediately

**After Fueling:**
- Open hatches and ventilate compartments
- Check for fuel odor before starting engine
- Run blower (if fitted) before starting`,
        },
        {
          id: 'fuel_maintenance',
          order: 3,
          title: 'Fuel System Maintenance',
          systemKey: 'fuel_system',
          seedContent: `If fitted, regular fuel system maintenance includes:

- Check fuel filter/water separator and drain water as needed
- Inspect fuel lines for wear, chafe, or leaks
- Check fuel tank fittings and connections
- Keep fuel tank topped up when not in use to reduce condensation

Replace fuel filters per manufacturer recommendations or if fuel flow is restricted.`,
        },
      ],
    },
    // Chapter 7: Electrical System
    {
      id: 'electrical',
      order: 7,
      title: 'Electrical System',
      subchapters: [
        {
          id: 'elec_overview',
          order: 1,
          title: 'Electrical System Overview',
          defaultIncluded: true,
          imageKeys: ['electrical_schematic'],
          seedContent: `{{IMAGE:electrical_schematic}}

The electrical system provides power for vessel systems and equipment. Key specifications, if applicable:

| Specification | Value |
|---------------|-------|
| DC System Voltage | {{SYSTEM_VOLTAGE}} V |
| Battery Capacity | {{BATTERY_CAPACITY_AH}} Ah |
| Shore Power | {{SHORE_POWER}} |

Familiarize yourself with the location of the main battery switch and circuit breaker panel.`,
        },
        {
          id: 'elec_batteries',
          order: 2,
          title: 'Battery System',
          defaultIncluded: true,
          seedContent: `The battery system, if fitted, provides electrical power for vessel systems. Notes:

**Battery Types:**
Batteries may be lead-acid, AGM, or lithium. Follow the specific maintenance requirements for your battery type.

**Battery Switches:**
Know the location and operation of battery switches. Always turn off battery switches when leaving the vessel unattended for extended periods.

**Battery Monitoring:**
If fitted, the battery monitor shows state of charge and consumption. Monitor battery levels to avoid deep discharge.`,
        },
        {
          id: 'elec_shore_power',
          order: 3,
          title: 'Shore Power Connection',
          systemKey: 'shore_power',
          imageKeys: ['shore_power_inlet'],
          seedContent: `{{IMAGE:shore_power_inlet}}

If fitted, shore power allows connection to marina electricity supply.

**Connection Procedure:**
1. Ensure shore power breaker on vessel is OFF
2. Connect cable to vessel inlet first
3. Connect cable to shore outlet
4. Turn on shore breaker at marina pedestal
5. Turn on vessel shore power breaker

**Disconnection:**
1. Turn off vessel shore power breaker
2. Turn off shore breaker at pedestal
3. Disconnect from shore outlet first
4. Disconnect from vessel inlet
5. Coil and stow cable

Always use proper marine-grade shore power cables rated for the installation.`,
        },
        {
          id: 'elec_solar',
          order: 4,
          title: 'Solar Charging System',
          systemKey: 'solar_power',
          seedContent: `If fitted, the solar charging system provides battery charging from sunlight. Components may include:

- Solar panels
- Charge controller
- Wiring and connections

The solar system operates automatically when sufficient light is available. Monitor charging via the charge controller display or battery monitor.

Keep solar panels clean for optimal performance. Inspect connections periodically.`,
        },
        {
          id: 'elec_generator',
          order: 5,
          title: 'Generator',
          systemKey: 'generator',
          seedContent: `If fitted, the generator provides AC power independent of shore connection.

**Before Starting:**
- Check fuel and oil levels
- Ensure adequate ventilation
- Check exhaust system

**Operation:**
Follow the generator manufacturer's operating procedures. Allow the generator to warm up before applying heavy loads.

Refer to the generator manufacturer's documentation for specific operating and maintenance requirements.`,
        },
        {
          id: 'elec_panel',
          order: 6,
          title: 'Electrical Panel & Circuits',
          defaultIncluded: true,
          seedContent: `The electrical distribution panel provides control and circuit protection for vessel systems.

**Circuit Breakers:**
Individual circuit breakers protect each circuit. If a breaker trips, identify the cause before resetting. Repeated tripping indicates a fault requiring attention.

**Main Switch:**
The main battery switch disconnects the batteries from the electrical system. Learn its location and operation.

Familiarize yourself with the panel layout and labeling before operating the vessel.`,
        },
      ],
    },
    // Chapter 8: Steering System
    {
      id: 'steering',
      order: 8,
      title: 'Steering System',
      subchapters: [
        {
          id: 'steer_hydraulic',
          order: 1,
          title: 'Hydraulic Steering',
          systemKey: 'hydraulic_steering',
          seedContent: `If fitted, the hydraulic steering system provides smooth, responsive helm control.

**Operation:**
Hydraulic steering typically requires minimal effort and provides good feedback. Check for:
- Smooth operation throughout full range
- No excessive play or stiffness
- No fluid leaks

**Maintenance:**
- Check hydraulic fluid level periodically
- Inspect hoses and connections for leaks
- Bleed system if steering feels spongy

Refer to the steering system manufacturer's documentation for specific requirements.`,
        },
        {
          id: 'steer_cable',
          order: 2,
          title: 'Cable Steering',
          systemKey: 'cable_steering',
          seedContent: `If fitted, the cable steering system connects the helm to the rudder or outboard via mechanical cables.

**Operation:**
Check for smooth operation throughout the full steering range. There should be no binding or excessive play.

**Maintenance:**
- Inspect cables for wear or corrosion
- Lubricate as recommended by manufacturer
- Check cable connections at helm and transom

Replace cables showing signs of wear or damage.`,
        },
        {
          id: 'steer_autopilot',
          order: 3,
          title: 'Autopilot',
          systemKey: 'autopilot',
          imageKeys: ['autopilot_display'],
          seedContent: `{{IMAGE:autopilot_display}}

If fitted, the autopilot can maintain a set heading or follow a route. Important notes:

- Always maintain a proper lookout while autopilot is engaged
- Know how to quickly disengage autopilot for manual control
- Do not use autopilot in congested waters or near hazards
- Autopilot does not relieve the skipper of responsibility

Refer to the autopilot manufacturer's documentation for specific operating instructions.`,
        },
        {
          id: 'steer_emergency',
          order: 4,
          title: 'Emergency Steering',
          defaultIncluded: true,
          seedContent: `In case of primary steering failure, emergency steering provisions may include:

- Tiller connection to rudder stock (if applicable)
- Auxiliary steering method as provided

Familiarize yourself with the emergency steering procedure before an emergency occurs. Know the location of any emergency tiller or steering equipment.`,
        },
      ],
    },
    // Chapter 9: Domestic Systems
    {
      id: 'domestic',
      order: 9,
      title: 'Domestic Systems',
      subchapters: [
        {
          id: 'dom_fresh_water',
          order: 1,
          title: 'Fresh Water System',
          systemKey: 'fresh_water',
          imageKeys: ['water_system_diagram'],
          seedContent: `{{IMAGE:water_system_diagram}}

If fitted, the fresh water system provides potable water. Components may include:

- Water tank(s)
- Pressure pump
- Accumulator tank
- Faucets and outlets

**Capacity:** {{WATER_CAPACITY_L}} L (if applicable)

Sanitize the water system periodically. When leaving the vessel for extended periods, consider draining the system or adding appropriate sanitizer.`,
        },
        {
          id: 'dom_hot_water',
          order: 2,
          title: 'Hot Water System',
          systemKey: 'hot_water',
          seedContent: `If fitted, the hot water system may be heated by:

- Engine heat exchanger (when engine is running)
- Electric heating element (requires shore power or generator)
- Calorifier combining both methods

Allow time for water to heat. Hot water temperature at the tap may vary. Exercise caution to prevent scalding.`,
        },
        {
          id: 'dom_waste_water',
          order: 3,
          title: 'Waste Water & Holding Tank',
          systemKey: 'waste_water',
          seedContent: `If fitted, waste water systems may include:

- Grey water sump
- Holding tank for black water
- Deck pump-out fitting
- Overboard discharge (where permitted)

Check local regulations regarding discharge. Many areas require use of holding tanks and pump-out facilities.

Keep holding tank vents clear. Use appropriate holding tank treatment chemicals.`,
        },
        {
          id: 'dom_heads',
          order: 4,
          title: 'Marine Toilet (Heads)',
          systemKey: 'heads',
          imageKeys: ['heads_diagram'],
          seedContent: `{{IMAGE:heads_diagram}}

If fitted, the marine toilet requires specific operating procedures:

- Use only approved marine toilet paper
- Do not flush foreign objects
- Operate pump fully with each use
- Keep intake seacock closed when not in use (if applicable)

Follow the toilet manufacturer's operating instructions. Regular cleaning and maintenance prevents odor and blockages.`,
        },
        {
          id: 'dom_shower',
          order: 5,
          title: 'Shower',
          systemKey: 'shower',
          seedContent: `If fitted, the shower drains to a sump with automatic or manual pump.

**Operation:**
- Ensure drain pump is functioning before use
- Conserve fresh water when on tank supply
- Wipe down after use to prevent mildew

Keep shower drain clear of debris. Clean sump periodically.`,
        },
        {
          id: 'dom_galley',
          order: 6,
          title: 'Galley',
          systemKey: 'galley',
          seedContent: `If fitted, the galley may include:

- Sink with fresh water supply
- Stove/hob (gas, electric, or alcohol)
- Refrigerator or cool box
- Storage for provisions

**Gas Appliances (if fitted):**
- Turn off gas at bottle when not in use
- Ensure adequate ventilation when cooking
- Check gas fittings periodically for leaks
- LPG is heavier than air – ventilate bilge if gas smell detected

Follow appliance manufacturers' operating instructions.`,
        },
        {
          id: 'dom_refrigeration',
          order: 7,
          title: 'Refrigeration',
          systemKey: 'refrigeration',
          seedContent: `If fitted, the refrigeration system may include:

- 12V DC compressor unit
- Ice box with holding plates
- Combination unit

**Operation Notes:**
- Pre-cool refrigerator when on shore power before departure
- Keep lid/door closed as much as possible
- Monitor battery consumption if running from batteries alone

Refer to the refrigerator manufacturer's documentation for specific operating instructions.`,
        },
        {
          id: 'dom_heating',
          order: 8,
          title: 'Heating System',
          systemKey: 'heating',
          seedContent: `If fitted, the heating system provides cabin warmth. Types may include:

- Diesel-fired cabin heater
- Electric heater (shore power only)
- Hot water radiators (engine or calorifier heat)

Follow the heater manufacturer's operating and safety instructions. Ensure adequate ventilation when using combustion heaters.`,
        },
        {
          id: 'dom_air_conditioning',
          order: 9,
          title: 'Air Conditioning',
          systemKey: 'air_conditioning',
          seedContent: `If fitted, the air conditioning system typically requires:

- Shore power or generator (high power consumption)
- Raw water cooling (seacock must be open)

**Operation:**
- Open raw water seacock before starting
- Allow system to run for several minutes before adjusting temperature
- Close seacock when not in use

Refer to the air conditioning manufacturer's documentation for specific requirements.`,
        },
      ],
    },
    // Chapter 10: Deck Equipment
    {
      id: 'deck_equipment',
      order: 10,
      title: 'Deck Equipment',
      subchapters: [
        {
          id: 'deck_anchor',
          order: 1,
          title: 'Anchor & Ground Tackle',
          defaultIncluded: true,
          seedContent: `Ground tackle typically includes:

- Primary anchor and rode (chain and/or rope)
- Anchor roller or bow fitting
- Anchor locker

**Anchoring Tips:**
- Choose appropriate scope (typically 5:1 to 7:1 for rope, 3:1 for all-chain)
- Set anchor and verify it is holding
- Monitor position while at anchor

Inspect anchor, chain, and rope regularly for wear.`,
        },
        {
          id: 'deck_windlass',
          order: 2,
          title: 'Anchor Windlass',
          systemKey: 'anchor_windlass',
          seedContent: `If fitted, the electric windlass raises and lowers the anchor.

**Operation:**
- Ensure power is on at windlass circuit breaker
- Use foot switches or remote control
- Guide chain/rope into locker to prevent jamming
- Do not use windlass as anchor brake while anchored

**Maintenance:**
- Rinse windlass with fresh water after use
- Lubricate as recommended by manufacturer
- Check electrical connections periodically`,
        },
        {
          id: 'deck_mooring',
          order: 3,
          title: 'Mooring Equipment',
          defaultIncluded: true,
          seedContent: `Mooring equipment typically includes:

- Dock lines (bow, stern, spring lines)
- Fenders
- Cleats and fairleads

**Best Practices:**
- Use appropriate size lines for your vessel
- Chafe protection on lines where needed
- Properly sized fenders for dock conditions
- Secure dock lines with proper knots or cleating

Inspect mooring lines regularly and replace if worn or damaged.`,
        },
        {
          id: 'deck_thrusters',
          order: 4,
          title: 'Bow/Stern Thruster',
          systemKey: 'bow_thruster',
          seedContent: `If fitted, thrusters aid in maneuvering at low speed.

**Operation:**
- Use at slow speeds or when stationary
- Short bursts are typically more effective than continuous operation
- Allow motor to cool between extended uses

**Notes:**
- Thrusters draw high current – monitor battery
- Do not use at high vessel speeds

Refer to the thruster manufacturer's documentation for specific operating limits.`,
        },
        {
          id: 'deck_davits',
          order: 5,
          title: 'Davits & Tender',
          systemKey: 'davits',
          seedContent: `If fitted, davits allow storage and launching of a tender or dinghy.

**Operation:**
- Ensure davits are rated for tender weight
- Secure tender properly when stowed
- Use control lines when raising/lowering

**Safety:**
- Stand clear of loaded davits
- Check davit hardware and lines regularly`,
        },
        {
          id: 'deck_platform',
          order: 6,
          title: 'Swimming Platform',
          systemKey: 'swimming_platform',
          seedContent: `If fitted, the swimming platform provides access to the water.

**Safety:**
- Ensure propulsion is off before anyone enters the water
- Use boarding ladder for safe exit from water
- Platform may become slippery when wet

Keep platform clean and inspect for any damage.`,
        },
        {
          id: 'deck_canvas',
          order: 7,
          title: 'Canvas & Covers',
          systemKey: 'bimini_top',
          seedContent: `If fitted, canvas covers and enclosures may include:

- Bimini top
- Sprayhood
- Cockpit enclosure
- Winter cover

**Care:**
- Rinse with fresh water regularly
- Clean with appropriate canvas cleaner
- Ensure fabric is dry before stowing to prevent mildew
- Check zippers and fasteners

Store covers properly to extend their life.`,
        },
      ],
    },
    // Chapter 11: Navigation Equipment
    {
      id: 'navigation',
      order: 11,
      title: 'Navigation Equipment',
      subchapters: [
        {
          id: 'nav_chartplotter',
          order: 1,
          title: 'Chartplotter/GPS',
          systemKey: 'chartplotter',
          imageKeys: ['chartplotter_display'],
          seedContent: `{{IMAGE:chartplotter_display}}

If fitted, the chartplotter provides electronic chart display and GPS navigation.

**Important Notes:**
- Electronic charts are an aid to navigation, not a substitute for proper navigation practice
- Keep charts updated
- Verify position using multiple sources when possible
- Always maintain a proper lookout

Refer to the chartplotter manufacturer's documentation for specific operating instructions.`,
        },
        {
          id: 'nav_radar',
          order: 2,
          title: 'Radar',
          systemKey: 'radar',
          seedContent: `If fitted, radar provides target detection and tracking, particularly valuable in reduced visibility.

**Operation:**
- Allow warm-up time as specified by manufacturer
- Adjust range and gain for conditions
- Radar is an aid, not a substitute for visual lookout

Radar training is recommended for effective use. Refer to the radar manufacturer's documentation for specific operating instructions.`,
        },
        {
          id: 'nav_ais',
          order: 3,
          title: 'AIS',
          systemKey: 'ais',
          seedContent: `If fitted, AIS (Automatic Identification System) transmits and receives vessel identity, position, and other data.

**AIS Types:**
- Class A: Full-featured, commercial standard
- Class B: Reduced power and reporting rate, common on pleasure craft

Enter correct MMSI number. AIS is a valuable situational awareness tool but does not replace proper lookout.

Refer to the AIS manufacturer's documentation for setup and operation.`,
        },
        {
          id: 'nav_vhf',
          order: 4,
          title: 'VHF Radio',
          systemKey: 'vhf_radio',
          seedContent: `If fitted, the VHF radio provides ship-to-ship and ship-to-shore communication.

**Key Channels:**
- Channel 16: Distress, safety, and calling
- Channel 9: Recreational calling (in some areas)

**DSC (Digital Selective Calling):**
If equipped, DSC allows one-button distress calling if connected to GPS. Ensure correct MMSI is programmed.

Operator licensing may be required. Learn proper radio procedures and phonetic alphabet.`,
        },
        {
          id: 'nav_depth',
          order: 5,
          title: 'Depth Sounder',
          systemKey: 'depth_sounder',
          seedContent: `If fitted, the depth sounder displays water depth below the transducer.

**Notes:**
- Know whether display shows depth below transducer, keel, or waterline
- Set shallow alarm if available
- Depth readings may be affected by aeration or bottom conditions

Monitor depth when navigating in unfamiliar or shallow waters.`,
        },
        {
          id: 'nav_compass',
          order: 6,
          title: 'Compass',
          defaultIncluded: true,
          seedContent: `A reliable compass is essential for navigation, whether magnetic or electronic (fluxgate).

**Magnetic Compass:**
- Check deviation periodically
- Keep magnetic items away from compass
- Know local magnetic variation

**Electronic Compass:**
- Calibrate as instructed
- May be affected by nearby magnetic fields

The compass provides heading information independent of GPS.`,
        },
      ],
    },
    // Chapter 12: Operation
    {
      id: 'operation',
      order: 12,
      title: 'Operation',
      alwaysApplicable: true,
      subchapters: [
        {
          id: 'op_pre_departure',
          order: 1,
          title: 'Pre-Departure Checklist',
          defaultIncluded: true,
          seedContent: `Before departing, complete the following checks:

**Safety:**
- [ ] Weather forecast checked
- [ ] Float plan filed/communicated
- [ ] Safety equipment checked and accessible
- [ ] All persons briefed on safety procedures

**Vessel:**
- [ ] Fuel and water levels adequate
- [ ] Engine/propulsion pre-checks complete
- [ ] Navigation lights functioning (if applicable)
- [ ] Bilges dry, bilge pump operational
- [ ] Lines and fenders ready

**Navigation:**
- [ ] Charts/electronics ready
- [ ] Route planned
- [ ] Tides and currents checked

Develop a routine pre-departure checklist suited to your vessel and operations.`,
        },
        {
          id: 'op_maneuvering',
          order: 2,
          title: 'Maneuvering',
          defaultIncluded: true,
          seedContent: `Basic maneuvering considerations for your vessel:

**Docking:**
- Approach slowly
- Have lines and fenders ready
- Consider wind and current effects
- Use spring lines for control
- Use thrusters if fitted

**Leaving the Dock:**
- Plan exit considering wind and current
- Release lines in appropriate sequence
- Clear the dock before applying significant power

Practice in calm conditions to become comfortable with your vessel's handling.`,
        },
        {
          id: 'op_anchoring',
          order: 3,
          title: 'Anchoring',
          defaultIncluded: true,
          seedContent: `Anchoring procedure:

**Selecting Anchorage:**
- Check depth and bottom type
- Consider swing room
- Note potential hazards
- Consider weather forecast

**Setting Anchor:**
1. Approach anchorage into wind/current
2. Stop vessel where you want anchor to lie
3. Lower anchor to bottom
4. Reverse slowly while paying out rode
5. Set anchor with brief reverse throttle
6. Verify position is holding

Monitor position periodically and especially if conditions change.`,
        },
        {
          id: 'op_rough_weather',
          order: 4,
          title: 'Heavy Weather',
          defaultIncluded: true,
          seedContent: `If encountering heavy weather:

**Preparation:**
- Secure loose items below and on deck
- Close hatches and ports
- Ensure bilge pumps operational
- All crew in life jackets
- Reduce sail or slow down

**During Heavy Weather:**
- Maintain awareness of vessel motion
- Avoid beam seas if possible
- Consider heaving-to or running off
- Monitor for water ingress

Know your vessel's limits and your own. Discretion is always advisable – if in doubt, seek shelter or assistance.`,
        },
        {
          id: 'op_person_overboard',
          order: 5,
          title: 'Person Overboard',
          defaultIncluded: true,
          seedContent: `If a person falls overboard:

**Immediate Actions:**
1. Shout "Man overboard!" and point at person
2. Throw flotation device toward person
3. Assign someone to maintain visual contact
4. Note GPS position if possible

**Recovery:**
- Circle back to person
- Approach from downwind
- Stop vessel near person
- Assist person aboard

Practice MOB drills with your crew. Know how to use any recovery equipment aboard.`,
        },
      ],
    },
    // Chapter 13: Maintenance
    {
      id: 'maintenance',
      order: 13,
      title: 'Maintenance',
      alwaysApplicable: true,
      subchapters: [
        {
          id: 'maint_schedule',
          order: 1,
          title: 'Maintenance Schedule',
          defaultIncluded: true,
          seedContent: `Regular maintenance intervals:

| Interval | Tasks |
|----------|-------|
| Before each use | Visual inspection, check fluid levels, test systems |
| Weekly (in use) | Check batteries, clean deck, inspect lines |
| Monthly | Check through-hulls, inspect safety equipment |
| Seasonally | Service engine, check anodes, antifouling inspection |
| Annually | Full service, haul-out, detailed inspection |

Adapt this schedule based on your usage and environment. Keep a maintenance log.`,
        },
        {
          id: 'maint_engine',
          order: 2,
          title: 'Engine Maintenance',
          defaultIncluded: true,
          seedContent: `Engine maintenance (if applicable):

**Regular Checks:**
- Oil level and condition
- Coolant level
- Belt condition and tension
- Fuel filter/water separator

**Periodic Service:**
- Oil and filter changes per manufacturer interval
- Impeller replacement
- Fuel system service
- Zincs/anodes inspection

Refer to your engine manufacturer's maintenance schedule. Keep records of all service.`,
        },
        {
          id: 'maint_hull',
          order: 3,
          title: 'Hull Maintenance',
          defaultIncluded: true,
          seedContent: `Hull maintenance:

**Below Waterline:**
- Inspect antifouling coating
- Check and replace anodes (zincs) as needed
- Inspect through-hulls and seacocks
- Clean and inspect propeller

**Above Waterline:**
- Wash with fresh water regularly
- Wax or polish as appropriate for gelcoat/paint
- Inspect for damage or stress cracks

Haul-out periodically for comprehensive underwater inspection.`,
        },
        {
          id: 'maint_electrical',
          order: 4,
          title: 'Electrical Maintenance',
          defaultIncluded: true,
          seedContent: `Electrical system maintenance:

**Batteries:**
- Check terminals for corrosion
- Verify connections are tight
- Check electrolyte level (if applicable)
- Test battery condition periodically

**Wiring:**
- Inspect connections for corrosion
- Check for chafe or damage
- Test navigation lights and other circuits

Keep electrical systems dry. Address any corrosion promptly.`,
        },
        {
          id: 'maint_winterizing',
          order: 5,
          title: 'Winterizing & Storage',
          defaultIncluded: true,
          seedContent: `If storing vessel for winter or extended period:

**Engine:**
- Change oil and filter
- Fog engine (per manufacturer recommendation)
- Drain or add antifreeze to cooling system

**Fuel System:**
- Fill tank to reduce condensation
- Add fuel stabilizer

**Water Systems:**
- Drain all fresh water systems
- Add antifreeze to drains and heads (if applicable)

**General:**
- Remove valuables and electronics
- Ventilate to prevent mold
- Cover or store under roof if possible

Follow manufacturer recommendations for your specific systems.`,
        },
      ],
    },
    // Chapter 14: Contact Information
    {
      id: 'contact',
      order: 14,
      title: 'Contact Information',
      alwaysApplicable: true,
      subchapters: [
        {
          id: 'contact_manufacturer',
          order: 1,
          title: 'Manufacturer',
          defaultIncluded: true,
          seedContent: `**Manufacturer:**
{{MANUFACTURER_NAME}}

**Address:**
{{MANUFACTURER_ADDRESS}}

**Contact:**
{{MANUFACTURER_CONTACT}}

**Website:**
{{MANUFACTURER_WEBSITE}}

For warranty service, parts, and technical support, contact the manufacturer or your authorized dealer.`,
        },
        {
          id: 'contact_dealer',
          order: 2,
          title: 'Dealer Information',
          defaultIncluded: true,
          seedContent: `**Delivering Dealer:**
{{DEALER_NAME}}

**Address:**
{{DEALER_ADDRESS}}

**Contact:**
{{DEALER_CONTACT}}

Your dealer can assist with service, parts, and support inquiries.`,
        },
        {
          id: 'contact_emergency',
          order: 3,
          title: 'Emergency Contacts',
          defaultIncluded: true,
          seedContent: `**Emergency Numbers:**

| Service | Number |
|---------|--------|
| Coast Guard / Maritime Rescue | {{COAST_GUARD_NUMBER}} |
| VHF Distress Channel | 16 |
| Local Emergency | 112 (Europe) / 911 (US) |

Keep this page accessible. Consider laminating for reference at the helm.`,
        },
      ],
    },
  ],
};

// ============================================
// DOCUMENT TEMPLATE VERSION (Updated)
// ============================================

export interface ProjectDocumentTemplateVersion extends Entity {
  templateId: string;
  versionNumber: number;
  status: DocumentTemplateVersionStatus;

  /**
   * Template content in plain text/markdown.
   * Supports text placeholders like {{FIELD}} and image slots like {{IMAGE:key}}.
   * For Owner's Manual, this field is used for legacy content only.
   * New Owner's Manual uses ownerManualBlocks instead.
   */
  content: string;

  /**
   * Registered image slots for this template version.
   * Each slot can hold an image (base64 data URL).
   * For Owner's Manual with blocks, image slots are stored per block instead.
   */
  imageSlots: DocumentTemplateImageSlot[];

  /**
   * List of required field placeholders (for validation).
   */
  requiredFields: string[];

  /**
   * Notes about this version (changelog, etc.)
   */
  notes?: string;

  // Approval tracking
  approvedAt?: string;
  approvedBy?: string;

  // Who created this version
  createdBy: string;

  // ============================================
  // OWNER'S MANUAL MODULAR STRUCTURE (Optional)
  // ============================================

  /**
   * For Owner's Manual only: modular content blocks.
   * When present, these blocks are used instead of the flat `content` field.
   */
  ownerManualBlocks?: ManualBlock[];

  /**
   * Whether this version contains AI-assisted seed content.
   * If true, editor shows a banner: "AI-assisted draft text — review before approval"
   * Only applicable to Owner's Manual DRAFT versions.
   */
  aiAssisted?: boolean;
}

// ============================================
// DOCUMENT TEMPLATE (AGGREGATE)
// ============================================

export interface ProjectDocumentTemplate extends Entity {
  projectId: string;
  type: CEDocumentTemplateType;
  name: string;
  description?: string;

  /**
   * All versions of this template (immutable once APPROVED).
   * Latest DRAFT version is the working version.
   */
  versions: ProjectDocumentTemplateVersion[];

  /**
   * Current approved version ID (if any).
   * Used for generating final documents.
   */
  currentVersionId?: string;
}

// ============================================
// DEFAULT TEMPLATE CONTENT
// ============================================

/**
 * Declaration of Conformity - IMCI-compliant skeleton
 * Sentences marked [FIXED] are required per RCD 2013/53/EU and must not be modified.
 */
const DEFAULT_DOC_CONTENT = `# EU DECLARATION OF CONFORMITY

**No.:** {{DOC_NUMBER}}

## 1. Product Identification

| Field | Value |
|-------|-------|
| Manufacturer | {{MANUFACTURER_NAME}} |
| Address | {{MANUFACTURER_ADDRESS}} |
| Craft Identification Number (CIN) | {{CIN}} |
| Boat Model | {{BOAT_MODEL}} |
| Craft Type | {{CRAFT_TYPE}} |
| Design Category | {{DESIGN_CATEGORY}} |
| Maximum Load (kg) | {{MAX_LOAD_KG}} |
| Maximum Persons | {{MAX_PERSONS}} |

{{IMAGE:builders_plate}}

## 2. Declaration

[FIXED] This declaration of conformity is issued under the sole responsibility of the manufacturer.

[FIXED] The object of the declaration described above is in conformity with the relevant Union harmonisation legislation:

- **Directive 2013/53/EU** (Recreational Craft Directive)

[FIXED] References to the relevant harmonised standards used, or references to the other technical specifications in relation to which conformity is declared:

| Standard | Title |
|----------|-------|
| {{STANDARD_1}} | {{STANDARD_1_TITLE}} |
| {{STANDARD_2}} | {{STANDARD_2_TITLE}} |
| {{STANDARD_3}} | {{STANDARD_3_TITLE}} |

## 3. Conformity Assessment

| Field | Value |
|-------|-------|
| Module | {{CONFORMITY_MODULE}} |
| Notified Body | {{NOTIFIED_BODY_NAME}} |
| Notified Body Number | {{NOTIFIED_BODY_NUMBER}} |
| Certificate Number | {{NB_CERTIFICATE_NUMBER}} |

{{IMAGE:notified_body_logo}}

## 4. Signatory

{{IMAGE:manufacturer_logo}}

| Field | Value |
|-------|-------|
| Signed for and on behalf of | {{MANUFACTURER_NAME}} |
| Name | {{SIGNATORY_NAME}} |
| Position | {{SIGNATORY_POSITION}} |
| Place | {{ISSUE_PLACE}} |
| Date | {{ISSUE_DATE}} |

**Signature:** ________________________
`;

/**
 * Owner's Manual - Concise section headings with placeholders
 * No long prose - just structure for editors to fill in.
 */
const DEFAULT_OWNERS_MANUAL_CONTENT = `# OWNER'S MANUAL

**Model:** {{BOAT_MODEL}}
**CIN:** {{CIN}}
**Delivery Date:** {{DELIVERY_DATE}}

{{IMAGE:boat_photo}}

---

## 1. INTRODUCTION

{{INTRODUCTION_TEXT}}

## 2. VESSEL IDENTIFICATION

| Field | Value |
|-------|-------|
| Manufacturer | {{MANUFACTURER_NAME}} |
| Model | {{BOAT_MODEL}} |
| CIN | {{CIN}} |
| Design Category | {{DESIGN_CATEGORY}} |
| Year of Construction | {{YEAR_OF_CONSTRUCTION}} |

{{IMAGE:builders_plate}}

## 3. TECHNICAL SPECIFICATIONS

| Specification | Value |
|---------------|-------|
| Length Overall (LOA) | {{LENGTH_M}} m |
| Beam | {{BEAM_M}} m |
| Draft | {{DRAFT_M}} m |
| Displacement (light) | {{DISPLACEMENT_LIGHT_KG}} kg |
| Maximum Load | {{MAX_LOAD_KG}} kg |
| Maximum Persons | {{MAX_PERSONS}} |
| Fuel Capacity | {{FUEL_CAPACITY_L}} L |
| Water Capacity | {{WATER_CAPACITY_L}} L |

## 4. GENERAL ARRANGEMENT

{{IMAGE:general_arrangement}}

{{GENERAL_ARRANGEMENT_DESCRIPTION}}

## 5. SAFETY EQUIPMENT

### 5.1 Required Safety Equipment
{{REQUIRED_SAFETY_EQUIPMENT}}

### 5.2 Navigation Lights
{{NAVIGATION_LIGHTS_DESCRIPTION}}

### 5.3 Fire Safety
{{FIRE_SAFETY_DESCRIPTION}}

## 6. PROPULSION SYSTEM

| Field | Value |
|-------|-------|
| Propulsion Type | {{PROPULSION_TYPE}} |
| Engine Make/Model | {{ENGINE_MAKE_MODEL}} |
| Power | {{ENGINE_POWER_KW}} kW |
| Fuel Type | {{FUEL_TYPE}} |

{{PROPULSION_DESCRIPTION}}

## 7. ELECTRICAL SYSTEM

{{IMAGE:electrical_schematic}}

| Field | Value |
|-------|-------|
| System Voltage | {{SYSTEM_VOLTAGE}} V |
| Battery Capacity | {{BATTERY_CAPACITY_AH}} Ah |
| Shore Power | {{SHORE_POWER}} |

{{ELECTRICAL_DESCRIPTION}}

## 8. FUEL SYSTEM

{{IMAGE:fuel_system_diagram}}

{{FUEL_SYSTEM_DESCRIPTION}}

## 9. STEERING SYSTEM

{{STEERING_SYSTEM_DESCRIPTION}}

## 10. OPERATION INSTRUCTIONS

### 10.1 Pre-Departure Checklist
{{PRE_DEPARTURE_CHECKLIST}}

### 10.2 Launching & Retrieval
{{LAUNCHING_INSTRUCTIONS}}

### 10.3 Underway Operation
{{UNDERWAY_OPERATION}}

### 10.4 Mooring & Anchoring
{{MOORING_INSTRUCTIONS}}

## 11. MAINTENANCE SCHEDULE

| Interval | Task |
|----------|------|
| Before each use | {{MAINTENANCE_BEFORE_USE}} |
| Monthly | {{MAINTENANCE_MONTHLY}} |
| Annually | {{MAINTENANCE_ANNUALLY}} |
| 5 years | {{MAINTENANCE_5_YEARS}} |

## 12. WARRANTY INFORMATION

{{WARRANTY_TERMS}}

---

**Manufacturer:** {{MANUFACTURER_NAME}}
**Address:** {{MANUFACTURER_ADDRESS}}
**Contact:** {{MANUFACTURER_CONTACT}}
**Website:** {{MANUFACTURER_WEBSITE}}
`;

/**
 * CE Marking Certificate skeleton
 */
const DEFAULT_CE_MARKING_CERT_CONTENT = `# CE MARKING CERTIFICATE

## Certificate Details

| Field | Value |
|-------|-------|
| Certificate Number | {{CERTIFICATE_NUMBER}} |
| Issue Date | {{ISSUE_DATE}} |
| Valid Until | {{VALID_UNTIL}} |

## Product Information

| Field | Value |
|-------|-------|
| Manufacturer | {{MANUFACTURER_NAME}} |
| Address | {{MANUFACTURER_ADDRESS}} |
| Boat Model | {{BOAT_MODEL}} |
| CIN | {{CIN}} |
| Design Category | {{DESIGN_CATEGORY}} |

{{IMAGE:builders_plate}}

## Applicable Legislation

[FIXED] This certificate confirms that the above product has been assessed and found to comply with:

- **Directive 2013/53/EU** of the European Parliament and of the Council on recreational craft and personal watercraft

## Conformity Assessment

| Field | Value |
|-------|-------|
| Assessment Module | {{CONFORMITY_MODULE}} |
| Notified Body | {{NOTIFIED_BODY_NAME}} |
| Notified Body Number | {{NOTIFIED_BODY_NUMBER}} |

{{IMAGE:ce_mark}}

## Standards Applied

| Standard | Description |
|----------|-------------|
| {{STANDARD_1}} | {{STANDARD_1_TITLE}} |
| {{STANDARD_2}} | {{STANDARD_2_TITLE}} |

## Notified Body Certification

{{IMAGE:notified_body_logo}}

| Field | Value |
|-------|-------|
| Issued by | {{ISSUER_NAME}} |
| Position | {{ISSUER_POSITION}} |
| Date | {{ISSUE_DATE}} |

**Signature:** ________________________
`;

/**
 * Technical File Annex Index skeleton
 */
const DEFAULT_ANNEX_INDEX_CONTENT = `# TECHNICAL FILE - ANNEX INDEX

**Project:** {{PROJECT_TITLE}} ({{PROJECT_NUMBER}})
**Boat Model:** {{BOAT_MODEL}}
**CIN:** {{CIN}}
**Prepared by:** {{PREPARED_BY}}
**Date:** {{CURRENT_DATE}}

---

## Section 1: General Description

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 1.1 | General arrangement drawing | | | |
| 1.2 | Principal dimensions | | | |
| 1.3 | Builder's plate specification | | | |

{{IMAGE:general_arrangement}}

## Section 2: Design Drawings & Plans

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 2.1 | Hull lines plan | | | |
| 2.2 | Structural drawings | | | |
| 2.3 | Deck plan | | | |
| 2.4 | Interior layout | | | |

## Section 3: Structural Calculations

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 3.1 | Scantling calculations (ISO 12215) | | | |
| 3.2 | Hull laminate schedule | | | |
| 3.3 | Deck laminate schedule | | | |

## Section 4: Stability & Buoyancy

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 4.1 | Stability calculations (ISO 12217) | | | |
| 4.2 | Flotation/buoyancy calculations | | | |
| 4.3 | Load capacity calculation | | | |
| 4.4 | Inclining test report | | | |

## Section 5: Materials & Certificates

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 5.1 | Resin certificates | | | |
| 5.2 | Fiberglass certificates | | | |
| 5.3 | Core material certificates | | | |
| 5.4 | Gelcoat certificates | | | |

## Section 6: Propulsion System

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 6.1 | Engine type approval certificate | | | |
| 6.2 | Exhaust emissions certificate | | | |
| 6.3 | Noise emissions test report | | | |
| 6.4 | Propulsion installation drawing | | | |

## Section 7: Electrical Systems

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 7.1 | Electrical single-line diagram | | | |
| 7.2 | Circuit protection schedule | | | |
| 7.3 | Battery specification | | | |
| 7.4 | Navigation light circuit | | | |

{{IMAGE:electrical_schematic}}

## Section 8: Fuel Systems

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 8.1 | Fuel system schematic | | | |
| 8.2 | Fuel tank specification | | | |
| 8.3 | Ventilation calculation | | | |

## Section 9: Steering & Controls

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 9.1 | Steering system drawing | | | |
| 9.2 | Helm position visibility | | | |
| 9.3 | Control cable routing | | | |

## Section 10: Essential Requirements Checklist

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 10.1 | RCD essential requirements checklist | | | |
| 10.2 | Risk assessment | | | |

## Section 11: Conformity Documentation

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 11.1 | EU Declaration of Conformity | | | |
| 11.2 | CE Marking Certificate | | | |
| 11.3 | Notified Body reports | | | |

## Section 12: Owner Documentation

| Annex | Document | Rev | Date | Status |
|-------|----------|-----|------|--------|
| 12.1 | Owner's Manual | | | |
| 12.2 | Warranty certificate | | | |

---

**Total Annexes:** {{TOTAL_ANNEXES}}
**File Revision:** {{FILE_REVISION}}
`;

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a default image slot configuration for a template type.
 */
function getDefaultImageSlots(type: CEDocumentTemplateType): DocumentTemplateImageSlot[] {
  switch (type) {
    case 'DOC_DOC':
      return [
        { key: 'builders_plate', label: "Builder's Plate", description: 'Photo or image of the builder\'s plate affixed to the vessel' },
        { key: 'manufacturer_logo', label: 'Manufacturer Logo', description: 'Company logo for letterhead' },
        { key: 'notified_body_logo', label: 'Notified Body Logo', description: 'Logo of the notified body (if applicable)' },
      ];
    case 'DOC_OWNERS_MANUAL':
      return [
        { key: 'boat_photo', label: 'Boat Photo', description: 'Main exterior photo of the vessel' },
        { key: 'builders_plate', label: "Builder's Plate", description: 'Photo of the builder\'s plate' },
        { key: 'general_arrangement', label: 'General Arrangement', description: 'General arrangement drawing or plan view' },
        { key: 'electrical_schematic', label: 'Electrical Schematic', description: 'Single-line electrical diagram' },
        { key: 'fuel_system_diagram', label: 'Fuel System Diagram', description: 'Fuel system schematic' },
      ];
    case 'DOC_CE_MARKING_CERT':
      return [
        { key: 'builders_plate', label: "Builder's Plate", description: 'Photo of the builder\'s plate' },
        { key: 'ce_mark', label: 'CE Mark', description: 'CE conformity mark image' },
        { key: 'notified_body_logo', label: 'Notified Body Logo', description: 'Logo of the notified body' },
      ];
    case 'DOC_ANNEX_INDEX':
      return [
        { key: 'general_arrangement', label: 'General Arrangement', description: 'General arrangement drawing thumbnail' },
        { key: 'electrical_schematic', label: 'Electrical Schematic', description: 'Electrical diagram thumbnail' },
      ];
    default:
      return [];
  }
}

/**
 * Get the default content for a template type.
 */
function getDefaultContent(type: CEDocumentTemplateType): string {
  switch (type) {
    case 'DOC_DOC':
      return DEFAULT_DOC_CONTENT;
    case 'DOC_OWNERS_MANUAL':
      return DEFAULT_OWNERS_MANUAL_CONTENT;
    case 'DOC_CE_MARKING_CERT':
      return DEFAULT_CE_MARKING_CERT_CONTENT;
    case 'DOC_ANNEX_INDEX':
      return DEFAULT_ANNEX_INDEX_CONTENT;
    default:
      return '';
  }
}

/**
 * Get default required fields for a template type.
 */
function getDefaultRequiredFields(type: CEDocumentTemplateType): string[] {
  switch (type) {
    case 'DOC_DOC':
      return ['MANUFACTURER_NAME', 'BOAT_MODEL', 'CIN', 'DESIGN_CATEGORY', 'ISSUE_DATE', 'SIGNATORY_NAME'];
    case 'DOC_OWNERS_MANUAL':
      return ['BOAT_MODEL', 'CIN', 'MANUFACTURER_NAME'];
    case 'DOC_CE_MARKING_CERT':
      return ['MANUFACTURER_NAME', 'BOAT_MODEL', 'CIN', 'ISSUE_DATE', 'CONFORMITY_MODULE'];
    case 'DOC_ANNEX_INDEX':
      return ['PROJECT_TITLE', 'PROJECT_NUMBER', 'BOAT_MODEL', 'CIN'];
    default:
      return [];
  }
}

/**
 * Create an empty template version (DRAFT).
 */
export function createTemplateVersion(
  templateId: string,
  type: CEDocumentTemplateType,
  userId: string,
  versionNumber = 1
): ProjectDocumentTemplateVersion {
  const timestamp = now();
  return {
    id: generateUUID(),
    templateId,
    versionNumber,
    status: 'DRAFT',
    content: getDefaultContent(type),
    imageSlots: getDefaultImageSlots(type),
    requiredFields: getDefaultRequiredFields(type),
    createdBy: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 0,
  };
}

/**
 * Create an empty document template for a project.
 * For Owner's Manual, use createOwnerManualTemplate with projectSystems instead.
 */
export function createDocumentTemplate(
  projectId: string,
  type: CEDocumentTemplateType,
  userId: string,
  projectSystems?: string[]
): ProjectDocumentTemplate {
  // For Owner's Manual, use the modular version
  if (type === 'DOC_OWNERS_MANUAL') {
    return createOwnerManualTemplate(projectId, userId, projectSystems);
  }

  const timestamp = now();
  const templateId = generateUUID();

  const initialVersion = createTemplateVersion(templateId, type, userId);

  return {
    id: templateId,
    projectId,
    type,
    name: CE_DOCUMENT_TEMPLATE_LABELS[type],
    versions: [initialVersion],
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 0,
  };
}

/**
 * Create all 4 document templates for a NEW_BUILD project.
 */
export function createAllDocumentTemplates(
  projectId: string,
  userId: string,
  projectSystems?: string[]
): ProjectDocumentTemplate[] {
  return CE_DOCUMENT_TEMPLATE_TYPES.map((type) =>
    createDocumentTemplate(projectId, type, userId, projectSystems)
  );
}

/**
 * Ensure document templates exist for a project (backward compatibility).
 * For NEW_BUILD: creates templates if missing.
 * For REFIT/MAINTENANCE: returns empty array (templates are optional).
 */
export function ensureDocumentTemplates(
  projectType: 'NEW_BUILD' | 'REFIT' | 'MAINTENANCE',
  projectId: string,
  existingTemplates: ProjectDocumentTemplate[] | undefined,
  userId: string,
  projectSystems?: string[]
): ProjectDocumentTemplate[] {
  // REFIT/MAINTENANCE projects don't require templates
  if (projectType !== 'NEW_BUILD') {
    return existingTemplates || [];
  }

  // NEW_BUILD projects require all 4 templates
  if (!existingTemplates || existingTemplates.length === 0) {
    return createAllDocumentTemplates(projectId, userId, projectSystems);
  }

  // Ensure all template types exist
  const existingTypes = new Set(existingTemplates.map((t) => t.type));
  const templates = [...existingTemplates];

  for (const type of CE_DOCUMENT_TEMPLATE_TYPES) {
    if (!existingTypes.has(type)) {
      templates.push(createDocumentTemplate(projectId, type, userId, projectSystems));
    }
  }

  return templates;
}

/**
 * Check if a template version is editable.
 * Only DRAFT versions can be edited.
 */
export function isTemplateVersionEditable(version: ProjectDocumentTemplateVersion): boolean {
  return version.status === 'DRAFT';
}

/**
 * Check if a template has an approved version.
 */
export function hasApprovedVersion(template: ProjectDocumentTemplate): boolean {
  return template.versions.some((v) => v.status === 'APPROVED');
}

/**
 * Get the current draft version of a template (if any).
 */
export function getDraftVersion(
  template: ProjectDocumentTemplate
): ProjectDocumentTemplateVersion | undefined {
  return template.versions.find((v) => v.status === 'DRAFT');
}

/**
 * Get the approved version of a template (if any).
 */
export function getApprovedVersion(
  template: ProjectDocumentTemplate
): ProjectDocumentTemplateVersion | undefined {
  if (template.currentVersionId) {
    return template.versions.find((v) => v.id === template.currentVersionId);
  }
  return template.versions.find((v) => v.status === 'APPROVED');
}

// ============================================
// OWNER'S MANUAL MODULAR FACTORY FUNCTIONS
// ============================================

/**
 * Create image slots for a subchapter based on its imageKeys.
 */
function createImageSlotsForSubchapter(
  subchapter: ManualCatalogueSubchapter
): DocumentTemplateImageSlot[] {
  if (!subchapter.imageKeys || subchapter.imageKeys.length === 0) {
    return [];
  }

  return subchapter.imageKeys.map((key) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Image for ${subchapter.title}`,
  }));
}

/**
 * Determine if a subchapter should be included based on project systems.
 * Rules:
 * - Chapter's alwaysApplicable subchapters with defaultIncluded are always included
 * - Subchapters with defaultIncluded are included
 * - Subchapters with systemKey are included if that systemKey is in project.systems
 */
export function shouldIncludeSubchapter(
  chapter: ManualCatalogueChapter,
  subchapter: ManualCatalogueSubchapter,
  projectSystems: string[] | undefined
): boolean {
  // Always include if chapter is alwaysApplicable and subchapter has defaultIncluded
  if (chapter.alwaysApplicable && subchapter.defaultIncluded) {
    return true;
  }

  // Include if defaultIncluded (regardless of chapter)
  if (subchapter.defaultIncluded) {
    return true;
  }

  // Include if systemKey matches project systems
  if (subchapter.systemKey && projectSystems?.includes(subchapter.systemKey)) {
    return true;
  }

  return false;
}

/**
 * Create all Owner's Manual blocks from the catalogue.
 * Uses project systems to determine initial inclusion state.
 */
export function createOwnerManualBlocks(
  projectSystems: string[] | undefined
): ManualBlock[] {
  const blocks: ManualBlock[] = [];
  let globalOrder = 0;

  for (const chapter of OWNER_MANUAL_CATALOGUE.chapters) {
    for (const subchapter of chapter.subchapters) {
      globalOrder++;

      const included = shouldIncludeSubchapter(chapter, subchapter, projectSystems);

      blocks.push({
        id: generateUUID(),
        chapterId: chapter.id,
        subchapterId: subchapter.id,
        order: globalOrder,
        included,
        content: subchapter.seedContent,
        imageSlots: createImageSlotsForSubchapter(subchapter),
      });
    }
  }

  return blocks;
}

/**
 * Create an Owner's Manual template version with modular blocks.
 */
export function createOwnerManualTemplateVersion(
  templateId: string,
  userId: string,
  projectSystems: string[] | undefined,
  versionNumber = 1
): ProjectDocumentTemplateVersion {
  const timestamp = now();
  const blocks = createOwnerManualBlocks(projectSystems);

  return {
    id: generateUUID(),
    templateId,
    versionNumber,
    status: 'DRAFT',
    content: '', // Empty for modular Owner's Manual, blocks hold content
    imageSlots: [], // Empty, image slots are per-block
    requiredFields: getDefaultRequiredFields('DOC_OWNERS_MANUAL'),
    ownerManualBlocks: blocks,
    aiAssisted: true, // Seed content is AI-assisted
    createdBy: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 0,
  };
}

/**
 * Create an Owner's Manual document template with modular blocks.
 */
export function createOwnerManualTemplate(
  projectId: string,
  userId: string,
  projectSystems: string[] | undefined
): ProjectDocumentTemplate {
  const timestamp = now();
  const templateId = generateUUID();

  const initialVersion = createOwnerManualTemplateVersion(
    templateId,
    userId,
    projectSystems
  );

  return {
    id: templateId,
    projectId,
    type: 'DOC_OWNERS_MANUAL',
    name: CE_DOCUMENT_TEMPLATE_LABELS.DOC_OWNERS_MANUAL,
    versions: [initialVersion],
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 0,
  };
}

/**
 * Migrate legacy Owner's Manual content (single text blob) to modular blocks.
 * Creates blocks from catalogue and puts the legacy content in a special "legacy_content" block.
 */
export function migrateOwnerManualToBlocks(
  legacyContent: string,
  legacyImageSlots: DocumentTemplateImageSlot[],
  projectSystems: string[] | undefined
): { blocks: ManualBlock[]; aiAssisted: boolean } {
  const blocks: ManualBlock[] = [];
  let globalOrder = 0;

  // Create blocks from catalogue (all excluded by default for migrated content)
  for (const chapter of OWNER_MANUAL_CATALOGUE.chapters) {
    for (const subchapter of chapter.subchapters) {
      globalOrder++;

      // For migration, only include alwaysApplicable chapters with defaultIncluded subchapters
      const included = !!(chapter.alwaysApplicable && subchapter.defaultIncluded);

      blocks.push({
        id: generateUUID(),
        chapterId: chapter.id,
        subchapterId: subchapter.id,
        order: globalOrder,
        included,
        content: subchapter.seedContent,
        imageSlots: createImageSlotsForSubchapter(subchapter),
      });
    }
  }

  // Add the legacy content as a special block in the "introduction" chapter
  if (legacyContent && legacyContent.trim().length > 0) {
    globalOrder++;
    blocks.push({
      id: generateUUID(),
      chapterId: 'introduction',
      subchapterId: 'legacy_content',
      order: globalOrder,
      included: true, // Always include legacy content
      content: legacyContent,
      imageSlots: legacyImageSlots, // Preserve existing image slots
    });
  }

  return {
    blocks,
    aiAssisted: false, // Migrated content is not AI-assisted
  };
}

/**
 * Check if an Owner's Manual version uses the modular block structure.
 */
export function isModularOwnerManual(
  version: ProjectDocumentTemplateVersion
): boolean {
  return !!version.ownerManualBlocks && version.ownerManualBlocks.length > 0;
}

/**
 * Get a specific block from an Owner's Manual version.
 */
export function getManualBlock(
  version: ProjectDocumentTemplateVersion,
  chapterId: string,
  subchapterId: string
): ManualBlock | undefined {
  if (!version.ownerManualBlocks) return undefined;
  return version.ownerManualBlocks.find(
    (b) => b.chapterId === chapterId && b.subchapterId === subchapterId
  );
}

/**
 * Get all blocks for a specific chapter.
 */
export function getChapterBlocks(
  version: ProjectDocumentTemplateVersion,
  chapterId: string
): ManualBlock[] {
  if (!version.ownerManualBlocks) return [];
  return version.ownerManualBlocks
    .filter((b) => b.chapterId === chapterId)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get all included blocks from an Owner's Manual version.
 */
export function getIncludedBlocks(
  version: ProjectDocumentTemplateVersion
): ManualBlock[] {
  if (!version.ownerManualBlocks) return [];
  return version.ownerManualBlocks
    .filter((b) => b.included)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get catalogue chapter by ID.
 */
export function getCatalogueChapter(
  chapterId: string
): ManualCatalogueChapter | undefined {
  return OWNER_MANUAL_CATALOGUE.chapters.find((c) => c.id === chapterId);
}

/**
 * Get catalogue subchapter by IDs.
 */
export function getCatalogueSubchapter(
  chapterId: string,
  subchapterId: string
): ManualCatalogueSubchapter | undefined {
  const chapter = getCatalogueChapter(chapterId);
  if (!chapter) return undefined;
  return chapter.subchapters.find((s) => s.id === subchapterId);
}

/**
 * Get the title for a chapter from the catalogue.
 * Falls back to formatted ID if not found.
 */
export function getChapterTitle(chapterId: string): string {
  const chapter = getCatalogueChapter(chapterId);
  if (chapter) return chapter.title;
  // Fallback: format the ID as a title
  return chapterId
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get the title for a subchapter from the catalogue.
 * Falls back to formatted ID if not found.
 */
export function getSubchapterTitle(chapterId: string, subchapterId: string): string {
  const subchapter = getCatalogueSubchapter(chapterId, subchapterId);
  if (subchapter) return subchapter.title;
  // Fallback: format the ID as a title
  return subchapterId
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================
// ENSURE / REPAIR OWNER'S MANUAL BLOCKS
// ============================================

/**
 * Ensure Owner's Manual blocks are complete based on the catalogue.
 * This function:
 * - Creates missing blocks for any catalogue subchapter
 * - Preserves existing block content and imageSlots
 * - Sets default `included` based on:
 *   - alwaysApplicable chapters → true
 *   - systemKey present in projectSystems → true
 *   - defaultIncluded in catalogue → true
 *   - otherwise false
 * - Preserves legacy_content blocks (never deletes them)
 * - Returns updated blocks array (does NOT mutate input)
 *
 * @param existingBlocks - Current blocks (may be empty or partial)
 * @param projectSystems - Array of system keys enabled on the project
 * @returns Updated blocks array with all catalogue subchapters represented
 */
export function ensureOwnerManualBlocksFromCatalogue(
  existingBlocks: ManualBlock[] | undefined,
  projectSystems: string[] | undefined
): ManualBlock[] {
  const blocks: ManualBlock[] = [];
  const existingByKey = new Map<string, ManualBlock>();

  // Index existing blocks by chapterId:subchapterId for quick lookup
  if (existingBlocks) {
    for (const block of existingBlocks) {
      const key = `${block.chapterId}:${block.subchapterId}`;
      existingByKey.set(key, block);
    }
  }

  let globalOrder = 0;

  // Process all catalogue chapters and subchapters
  for (const chapter of OWNER_MANUAL_CATALOGUE.chapters) {
    for (const subchapter of chapter.subchapters) {
      globalOrder++;
      const key = `${chapter.id}:${subchapter.id}`;
      const existing = existingByKey.get(key);

      if (existing) {
        // Preserve existing block with updated order
        blocks.push({
          ...existing,
          order: globalOrder,
        });
        existingByKey.delete(key); // Mark as processed
      } else {
        // Create new block from catalogue
        const included = shouldIncludeSubchapter(chapter, subchapter, projectSystems);
        blocks.push({
          id: generateUUID(),
          chapterId: chapter.id,
          subchapterId: subchapter.id,
          order: globalOrder,
          included,
          content: subchapter.seedContent,
          imageSlots: createImageSlotsForSubchapter(subchapter),
        });
      }
    }
  }

  // Preserve any non-catalogue blocks (e.g., legacy_content) at the end
  for (const [key, block] of existingByKey) {
    // Skip if it matches a catalogue entry (shouldn't happen, but defensive)
    const [chapterId, subchapterId] = key.split(':');
    const inCatalogue = getCatalogueSubchapter(chapterId, subchapterId);
    if (!inCatalogue) {
      globalOrder++;
      blocks.push({
        ...block,
        order: globalOrder,
      });
    }
  }

  return blocks;
}

/**
 * Ensure a template version has complete Owner's Manual blocks.
 * If the version has no blocks, creates them from catalogue.
 * If the version has blocks, repairs/adds any missing ones.
 * Returns a new version object (does NOT mutate input).
 */
export function ensureOwnerManualVersionBlocks(
  version: ProjectDocumentTemplateVersion,
  projectSystems: string[] | undefined
): ProjectDocumentTemplateVersion {
  // If this version has legacy content (no blocks), migrate it first
  if (!version.ownerManualBlocks || version.ownerManualBlocks.length === 0) {
    if (version.content && version.content.trim().length > 0) {
      // Migrate legacy content
      const { blocks, aiAssisted } = migrateOwnerManualToBlocks(
        version.content,
        version.imageSlots,
        projectSystems
      );
      // Now ensure from catalogue (adds missing blocks)
      const ensuredBlocks = ensureOwnerManualBlocksFromCatalogue(blocks, projectSystems);
      return {
        ...version,
        ownerManualBlocks: ensuredBlocks,
        aiAssisted,
        updatedAt: now(),
      };
    }
    // No legacy content, create fresh from catalogue
    const blocks = createOwnerManualBlocks(projectSystems);
    return {
      ...version,
      ownerManualBlocks: blocks,
      aiAssisted: true,
      updatedAt: now(),
    };
  }

  // Has blocks - ensure all catalogue subchapters are present
  const ensuredBlocks = ensureOwnerManualBlocksFromCatalogue(
    version.ownerManualBlocks,
    projectSystems
  );

  // Only update if blocks changed
  if (ensuredBlocks.length === version.ownerManualBlocks.length) {
    return version;
  }

  return {
    ...version,
    ownerManualBlocks: ensuredBlocks,
    updatedAt: now(),
  };
}

/**
 * Ensure an Owner's Manual template has complete blocks in its DRAFT version.
 * Returns a new template object if changes were made, otherwise the original.
 */
export function ensureOwnerManualTemplateBlocks(
  template: ProjectDocumentTemplate,
  projectSystems: string[] | undefined
): ProjectDocumentTemplate {
  if (template.type !== 'DOC_OWNERS_MANUAL') {
    return template;
  }

  const draftVersion = getDraftVersion(template);
  if (!draftVersion) {
    return template;
  }

  const ensuredVersion = ensureOwnerManualVersionBlocks(draftVersion, projectSystems);

  // Only update if version changed
  if (ensuredVersion === draftVersion) {
    return template;
  }

  const updatedVersions = template.versions.map((v) =>
    v.id === draftVersion.id ? ensuredVersion : v
  );

  return {
    ...template,
    versions: updatedVersions,
    updatedAt: now(),
  };
}
