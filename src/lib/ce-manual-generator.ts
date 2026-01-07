/**
 * CE-Compliant Owner's Manual Generator
 * Generates 15-chapter owner's manuals per RCD 2013/53/EU
 */

import type {
  BoatConfiguration,
  BoatConfigurationExtended,
  GlobalSettings,
  VesselSpecification,
  DesignCategory,
  ConfigurationItem,
  PropulsionTypeExtended,
  SteeringTypeExtended,
} from './types';
import { formatEuroDate } from './formatting';
import { DESIGN_CATEGORY_INFO, DEFAULT_VESSEL_SPECIFICATION } from './types';

// Helper to format value or return fallback
const val = (value: string | number | boolean | null | undefined, fallback = 'Not specified'): string => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

// Helper to format number with unit
const numUnit = (value: number | null | undefined, unit: string, fallback = 'Not specified'): string => {
  if (value === null || value === undefined) return fallback;
  return `${value} ${unit}`;
};

// Helper to format array as list
const listItems = (items: string[]): string => {
  if (!items || items.length === 0) return 'None';
  return items.map(i => i.replace(/_/g, ' ')).join(', ');
};

// Helper to capitalize first letter
const capitalize = (s: string): string => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';

// Helper to create diagram/image placeholder
const diagramPlaceholder = (title: string, description: string, figureNum: number): string => {
  return `
<div class="diagram-placeholder" style="border: 2px dashed #cbd5e1; border-radius: 8px; padding: 24px; margin: 16px 0; background: #f8fafc; text-align: center;">
  <div style="color: #64748b; font-size: 14px; margin-bottom: 8px;">Figure ${figureNum}</div>
  <div style="color: #1e293b; font-weight: 600; font-size: 16px; margin-bottom: 8px;">${title}</div>
  <div style="color: #64748b; font-size: 12px;">${description}</div>
  <div style="margin-top: 12px; padding: 40px; background: #e2e8f0; border-radius: 4px; color: #94a3b8;">
    [Insert ${title} Here]
  </div>
</div>
`;
};

// Helper for print-optimized page break
const pageBreak = (printOptimized: boolean): string => {
  return printOptimized ? '\n<div style="page-break-after: always;"></div>\n' : '\n---\n\n';
};

// Get spec from config, external spec, or use defaults
function getSpec(config: BoatConfiguration, externalSpec?: VesselSpecification): VesselSpecification {
  // Use external spec if provided (from ClientBoat)
  if (externalSpec) {
    return externalSpec;
  }
  // Use BoatConfigurationExtended type for vessel specification access
  const ext = config as BoatConfigurationExtended;
  if (ext.vessel_specification) {
    return ext.vessel_specification;
  }
  // Create spec from existing config data
  const modelSize = config.boat_model.match(/\d+/)?.[0] || '850';
  const lengthM = Number.parseInt(modelSize) / 100;

  return {
    ...DEFAULT_VESSEL_SPECIFICATION,
    general: {
      ...DEFAULT_VESSEL_SPECIFICATION.general,
      manufacturer: 'NAVISOL B.V.',
      model_name: config.boat_model,
      year_of_build: new Date().getFullYear(),
      design_category: 'C',
      vessel_type: config.propulsion_type === 'Electric' ? 'electric' : 'console',
    },
    dimensions: {
      ...DEFAULT_VESSEL_SPECIFICATION.dimensions,
      length_overall_m: lengthM,
      hull_material: 'Aluminium',
    },
    propulsion: {
      ...DEFAULT_VESSEL_SPECIFICATION.propulsion,
      propulsion_type: config.propulsion_type.toLowerCase() as PropulsionTypeExtended,
      fuel_type: config.propulsion_type === 'Diesel' ? 'diesel' : config.propulsion_type === 'Electric' ? 'none' : 'diesel',
    },
    steering: {
      ...DEFAULT_VESSEL_SPECIFICATION.steering,
      steering_type: config.steering_type.toLowerCase() as SteeringTypeExtended,
    },
  };
}

// Group items by category
function groupByCategory(items: ConfigurationItem[]): Map<string, ConfigurationItem[]> {
  const map = new Map<string, ConfigurationItem[]>();
  for (const item of items) {
    const cat = item.article.category;
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return map;
}

/**
 * Generate CE-Compliant Owner's Manual (15 Chapters)
 * @param config - The boat configuration with items
 * @param settings - Global company settings
 * @param vesselSpec - Optional vessel specification from ClientBoat (takes priority)
 * @param options - Optional generation options
 */
export function generateCEOwnersManual(
  config: BoatConfiguration,
  settings: GlobalSettings,
  vesselSpec?: VesselSpecification,
  options?: {
    includeDiagramPlaceholders?: boolean;
    printOptimized?: boolean;
  }
): string {
  const spec = getSpec(config, vesselSpec);
  const year = new Date().getFullYear();
  const generatedDate = formatEuroDate(new Date());
  const includedItems = config.items.filter(i => i.included);
  const includeDiagrams = options?.includeDiagramPlaceholders ?? true;
  const printOptimized = options?.printOptimized ?? false;

  let md = '';

  // ============================================
  // HEADER & TABLE OF CONTENTS
  // ============================================
  md += `<div class="manual-header">\n\n`;
  md += `# OWNER'S MANUAL\n\n`;
  md += `## ${spec.general.manufacturer || settings.company_name}\n`;
  md += `## ${spec.general.model_name || config.boat_model}\n\n`;
  md += `**Design Category:** ${spec.general.design_category || 'C'} — **Vessel Type:** ${capitalize(spec.general.vessel_type) || config.propulsion_type}\n\n`;
  md += `**CIN/WIN:** ${spec.general.cin_win || '________________'} — **Year:** ${spec.general.year_of_build || year}\n\n`;
  md += `**Generated:** ${generatedDate}\n\n`;
  md += `</div>\n\n`;
  md += `---\n\n`;

  // Table of Contents
  md += `## Table of Contents\n\n`;
  md += `1. [Welcome and General Information](#chapter-1)\n`;
  md += `2. [Identification and CE Conformity](#chapter-2)\n`;
  md += `3. [Safety](#chapter-3)\n`;
  md += `4. [Vessel Description](#chapter-4)\n`;
  md += `5. [Steering and Handling](#chapter-5)\n`;
  md += `6. [Propulsion](#chapter-6)\n`;
  md += `7. [Electrical System](#chapter-7)\n`;
  md += `8. [Fuel System](#chapter-8)\n`;
  md += `9. [Gas Installation](#chapter-9)\n`;
  md += `10. [Water and Waste Systems](#chapter-10)\n`;
  md += `11. [Operation of the Vessel](#chapter-11)\n`;
  md += `12. [Emergencies](#chapter-12)\n`;
  md += `13. [Maintenance](#chapter-13)\n`;
  md += `14. [Environment and Waste](#chapter-14)\n`;
  md += `15. [Annexes](#chapter-15)\n\n`;
  md += `---\n\n`;

  // ============================================
  // CHAPTER 1: WELCOME AND GENERAL INFORMATION
  // ============================================
  md += `<a id="chapter-1"></a>\n\n`;
  md += `# Chapter 1: Welcome and General Information\n\n`;

  md += `## 1.1 Welcome\n\n`;
  md += `Congratulations on your purchase of the **${spec.general.model_name || config.boat_model}** from ${spec.general.manufacturer || settings.company_name}.\n\n`;
  md += `This owner's manual contains important information about the safe operation, maintenance, and care of your vessel. `;
  md += `It has been prepared in accordance with the requirements of the **Recreational Craft Directive 2013/53/EU**.\n\n`;
  md += `**Please read this manual thoroughly before operating your vessel for the first time.** `;
  md += `Keep this manual aboard your vessel at all times for quick reference.\n\n`;

  md += `## 1.2 About This Manual\n\n`;
  md += `This manual covers:\n\n`;
  md += `- Vessel identification and CE conformity\n`;
  md += `- Safety information and emergency procedures\n`;
  md += `- Technical specifications and systems\n`;
  md += `- Operating instructions\n`;
  md += `- Maintenance requirements\n`;
  md += `- Environmental considerations\n\n`;

  md += `## 1.3 Manufacturer Information\n\n`;
  md += `| | |\n`;
  md += `|---|---|\n`;
  md += `| **Manufacturer** | ${spec.general.manufacturer || settings.company_name} |\n`;
  md += `| **Address** | ${settings.company_address} |\n`;
  md += `| **Phone** | ${settings.company_phone} |\n`;
  md += `| **Email** | ${settings.company_email} |\n`;
  md += `| **Website** | www.navisol.nl |\n\n`;

  md += `## 1.4 Service and Support\n\n`;
  md += `For technical support, spare parts, or service inquiries, please contact:\n\n`;
  md += `- **Phone:** ${settings.company_phone}\n`;
  md += `- **Email:** ${settings.company_email}\n`;
  md += `- **Service Hours:** Monday - Friday, 08:00 - 17:00 CET\n\n`;

  md += `When contacting us, please have the following information ready:\n\n`;
  md += `- Hull Identification Number (CIN/WIN)\n`;
  md += `- Model name and year of build\n`;
  md += `- Description of issue or inquiry\n\n`;

  md += `---\n\n`;

  // ============================================
  // CHAPTER 2: IDENTIFICATION AND CE CONFORMITY
  // ============================================
  md += `<a id="chapter-2"></a>\n\n`;
  md += `# Chapter 2: Identification and CE Conformity\n\n`;

  md += `## 2.1 Vessel Identification\n\n`;
  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| **Model** | ${spec.general.model_name || config.boat_model} |\n`;
  md += `| **Manufacturer** | ${spec.general.manufacturer || settings.company_name} |\n`;
  md += `| **Year of Build** | ${val(spec.general.year_of_build, String(year))} |\n`;
  md += `| **Hull Identification Number (CIN/WIN)** | ${spec.general.cin_win || '________________'} |\n`;
  md += `| **Vessel Type** | ${capitalize(spec.general.vessel_type) || config.propulsion_type} |\n`;
  md += `| **Intended Use** | ${capitalize(spec.general.intended_use) || 'Leisure'} |\n\n`;

  md += `## 2.2 CE Design Category\n\n`;
  const designCat = (spec.general.design_category || 'C') as DesignCategory;
  const catInfo = DESIGN_CATEGORY_INFO[designCat] || DESIGN_CATEGORY_INFO.C;

  md += `This vessel is certified for **Design Category ${designCat}: ${catInfo.name}**\n\n`;
  md += `| Category | Name | Wind Force | Wave Height |\n`;
  md += `|----------|------|------------|-------------|\n`;
  md += `| A | Ocean | > 8 Beaufort | > 4 m |\n`;
  md += `| B | Offshore | ≤ 8 Beaufort | ≤ 4 m |\n`;
  md += `| **C** | **Inshore** | **≤ 6 Beaufort** | **≤ 2 m** |\n`;
  md += `| D | Sheltered Waters | ≤ 4 Beaufort | ≤ 0.3 m |\n\n`;

  md += `**${catInfo.description}**\n\n`;

  md += `> **WARNING:** Do not operate this vessel in conditions exceeding the design category limits.\n\n`;

  md += `## 2.3 Builder's Plate\n\n`;
  md += `The builder's plate is permanently affixed to the vessel and displays:\n\n`;
  md += `- Manufacturer name and address\n`;
  md += `- CE marking\n`;
  md += `- Design category\n`;
  md += `- Maximum load (kg)\n`;
  md += `- Maximum number of persons\n`;
  md += `- Hull Identification Number\n\n`;

  md += `| Builder's Plate Data | Value |\n`;
  md += `|----------------------|-------|\n`;
  md += `| Maximum Persons | ${val(spec.safety.max_persons)} |\n`;
  md += `| Maximum Load | ${numUnit(spec.dimensions.max_load_kg, 'kg')} |\n`;
  md += `| Light Craft Mass | ${numUnit(spec.dimensions.light_craft_mass_kg, 'kg')} |\n\n`;

  md += `## 2.4 CE Declaration of Conformity\n\n`;
  md += `This vessel complies with the requirements of the following European Directives:\n\n`;
  md += `- **2013/53/EU** — Recreational Craft Directive (RCD)\n`;
  md += `- **2014/30/EU** — Electromagnetic Compatibility (EMC)\n`;
  if (spec.propulsion.propulsion_type === 'electric' || spec.propulsion.propulsion_type === 'hybrid') {
    md += `- **2014/35/EU** — Low Voltage Directive (LVD)\n`;
  }
  md += `\n`;

  md += `A copy of the Declaration of Conformity is included in the Annexes (Chapter 15).\n\n`;

  md += `## 2.5 Applied Standards\n\n`;
  md += `The following harmonised standards have been applied:\n\n`;
  md += `| Standard | Description |\n`;
  md += `|----------|-------------|\n`;
  md += `| EN ISO 12217-1 | Stability and buoyancy assessment |\n`;
  md += `| EN ISO 12215 | Hull construction and scantlings |\n`;
  md += `| EN ISO 12216 | Windows, portlights, hatches |\n`;
  md += `| EN ISO 13297 | Electrical systems |\n`;
  md += `| EN ISO 8849 | DC electrical installations |\n`;
  if (spec.propulsion.propulsion_type === 'electric' || spec.propulsion.propulsion_type === 'hybrid') {
    md += `| EN ISO 16315 | Electric propulsion systems |\n`;
  }
  if (spec.fuel_system.has_fuel_tank) {
    md += `| EN ISO 10088 | Permanently installed fuel systems |\n`;
  }
  if (spec.gas_installation.has_gas_system) {
    md += `| EN ISO 10239 | LPG systems |\n`;
  }
  md += `| EN ISO 11812 | Watertight cockpits and recesses |\n`;
  md += `| EN ISO 15085 | Anchor equipment |\n`;
  md += `| EN ISO 9094 | Fire protection |\n\n`;

  md += `---\n\n`;

  // ============================================
  // CHAPTER 3: SAFETY
  // ============================================
  md += `<a id="chapter-3"></a>\n\n`;
  md += `# Chapter 3: Safety\n\n`;

  md += `## 3.1 Important Safety Warnings\n\n`;
  md += `> **READ ALL SAFETY INSTRUCTIONS BEFORE OPERATING THIS VESSEL**\n\n`;

  md += `### General Safety\n\n`;
  md += `- Always wear a personal flotation device (PFD) when aboard\n`;
  md += `- Never operate the vessel under the influence of alcohol or drugs\n`;
  md += `- Check weather conditions before departure\n`;
  md += `- Inform someone of your travel plans (float plan)\n`;
  md += `- Carry required safety equipment at all times\n`;
  md += `- Follow all local navigation rules and regulations\n`;
  md += `- Maintain a proper lookout at all times\n`;
  md += `- Know the location of all safety equipment\n\n`;

  md += `### Operational Safety\n\n`;
  md += `- Never exceed the maximum load or persons capacity\n`;
  md += `- Do not operate in conditions exceeding the design category\n`;
  md += `- Ensure adequate ventilation when engine is running\n`;
  md += `- Keep hands, feet, and loose clothing away from moving parts\n`;
  md += `- Never leave the helm unattended while underway\n\n`;

  // Electric safety
  if (spec.propulsion.propulsion_type === 'electric' || spec.propulsion.propulsion_type === 'hybrid') {
    md += `## 3.2 High Voltage Safety\n\n`;
    md += `> **DANGER: This vessel contains high voltage electrical systems.**\n\n`;
    md += `- Do not open battery compartments or motor housings\n`;
    md += `- Do not attempt repairs on the high voltage system yourself\n`;
    md += `- In case of HV system damage, activate the emergency disconnect immediately\n`;
    md += `- Contact only authorized service personnel for HV system maintenance\n`;
    md += `- Keep water away from electrical connections\n`;
    md += `- Do not operate with damaged cables or connectors\n\n`;

    md += `**Emergency Disconnect Location:** ________________\n\n`;
  }

  // Fuel safety
  if (spec.fuel_system.has_fuel_tank || spec.propulsion.fuel_type === 'diesel' || spec.propulsion.fuel_type === 'petrol') {
    md += `## 3.3 Fuel Safety\n\n`;
    md += `> **WARNING: Fuel is flammable and can cause fire or explosion.**\n\n`;
    md += `- Turn off engine and all electrical equipment before refueling\n`;
    md += `- No smoking during refueling\n`;
    md += `- Clean up any fuel spills immediately\n`;
    md += `- Check fuel lines regularly for leaks\n`;
    md += `- Ensure proper ventilation before starting engine\n`;
    md += `- Never fill fuel tanks while passengers are aboard\n`;
    md += `- Use only the correct fuel type: **${capitalize(spec.propulsion.fuel_type) || 'As specified'}**\n\n`;
  }

  // Gas safety
  if (spec.gas_installation.has_gas_system) {
    md += `## 3.4 LPG Gas Safety\n\n`;
    md += `> **DANGER: LPG is highly flammable and heavier than air.**\n\n`;
    md += `- Turn off gas at the cylinder when not in use\n`;
    md += `- Check all connections regularly for leaks (use soapy water)\n`;
    md += `- Never use naked flames to check for leaks\n`;
    md += `- Ensure gas locker is properly ventilated\n`;
    md += `- Know the location of the gas shut-off valve\n`;
    md += `- If you smell gas, turn off at cylinder and ventilate immediately\n`;
    if (spec.gas_installation.gas_detector_installed) {
      md += `- Monitor the gas detector for warnings\n`;
    }
    md += `\n`;
  }

  md += `## 3.5 Safety Equipment\n\n`;
  md += `The following safety equipment is installed or should be carried:\n\n`;
  md += `| Equipment | Status/Quantity |\n`;
  md += `|-----------|----------------|\n`;
  md += `| Navigation Lights | ${val(spec.safety.navigation_lights)} |\n`;
  md += `| Fire Extinguishers | ${val(spec.safety.fire_extinguishers)} |\n`;
  md += `| Fire Blanket | ${val(spec.safety.fire_blanket)} |\n`;
  md += `| Bilge Pump | ${capitalize(spec.safety.bilge_pump) || 'Not specified'} |\n`;
  md += `| Kill Switch (Engine Cut-off) | ${val(spec.safety.kill_switch)} |\n`;
  md += `| First Aid Kit | ${val(spec.safety.first_aid_kit)} |\n`;
  md += `| Flares | ${val(spec.safety.flares)} |\n`;
  md += `| VHF Radio | ${val(spec.safety.vhf_radio)} |\n`;
  md += `| EPIRB | ${val(spec.safety.epirb)} |\n`;
  md += `| Radar Reflector | ${val(spec.safety.radar_reflector)} |\n`;
  md += `| Horn/Whistle | ${val(spec.safety.horn_whistle)} |\n`;
  if (spec.safety.liferaft) {
    md += `| Liferaft | Capacity: ${val(spec.safety.liferaft_capacity)} persons |\n`;
  }
  md += `\n`;

  md += `**Life Saving Equipment:** ${listItems(spec.safety.life_saving_equipment as string[])}\n\n`;

  md += `## 3.6 Safety Equipment Locations\n\n`;
  md += `| Equipment | Location |\n`;
  md += `|-----------|----------|\n`;
  md += `| Fire Extinguisher(s) | ________________ |\n`;
  md += `| First Aid Kit | ________________ |\n`;
  md += `| Life Jackets | ________________ |\n`;
  md += `| Flares | ________________ |\n`;
  md += `| Emergency Toolkit | ________________ |\n`;
  if (spec.safety.kill_switch) {
    md += `| Kill Switch Lanyard | ________________ |\n`;
  }
  md += `\n`;

  // Add safety equipment diagram placeholder
  if (includeDiagrams) {
    md += diagramPlaceholder('Safety Equipment Locations', 'Deck plan showing positions of all safety equipment', 6);
  }

  md += pageBreak(printOptimized);

  // ============================================
  // CHAPTER 4: VESSEL DESCRIPTION
  // ============================================
  md += `<a id="chapter-4"></a>\n\n`;
  md += `# Chapter 4: Vessel Description\n\n`;

  md += `## 4.1 Principal Dimensions\n\n`;
  md += `| Parameter | Value |\n`;
  md += `|-----------|-------|\n`;
  md += `| Length Overall (LOA) | ${numUnit(spec.dimensions.length_overall_m, 'm')} |\n`;
  md += `| Beam | ${numUnit(spec.dimensions.beam_m, 'm')} |\n`;
  md += `| Draft | ${numUnit(spec.dimensions.draft_m, 'm')} |\n`;
  md += `| Light Craft Mass | ${numUnit(spec.dimensions.light_craft_mass_kg, 'kg')} |\n`;
  md += `| Maximum Load | ${numUnit(spec.dimensions.max_load_kg, 'kg')} |\n`;
  md += `| Maximum Persons | ${val(spec.safety.max_persons)} |\n\n`;

  md += `## 4.2 Construction\n\n`;
  md += `| Component | Material |\n`;
  md += `|-----------|----------|\n`;
  md += `| Hull | ${val(spec.dimensions.hull_material)} |\n`;
  md += `| Deck | ${val(spec.dimensions.deck_material)} |\n`;
  md += `| Hull Type | ${capitalize(spec.dimensions.hull_type)} |\n\n`;

  md += `## 4.3 Performance\n\n`;
  md += `| Parameter | Value |\n`;
  md += `|-----------|-------|\n`;
  md += `| Maximum Speed | ${numUnit(spec.propulsion.max_speed_knots, 'knots')} |\n`;
  md += `| Cruising Speed | ${numUnit(spec.propulsion.cruising_speed_knots, 'knots')} |\n`;
  md += `| Range | ${numUnit(spec.propulsion.range_nm, 'nm')} |\n\n`;

  md += `## 4.4 Capacities\n\n`;
  md += `| Tank/System | Capacity |\n`;
  md += `|-------------|----------|\n`;
  if (spec.fuel_system.has_fuel_tank) {
    md += `| Fuel Tank | ${numUnit(spec.fuel_system.tank_capacity_l, 'L')} |\n`;
  }
  if (spec.water_waste.fresh_water_tank) {
    md += `| Fresh Water | ${numUnit(spec.water_waste.fresh_water_capacity_l, 'L')} |\n`;
  }
  if (spec.water_waste.holding_tank) {
    md += `| Holding Tank | ${numUnit(spec.water_waste.holding_tank_capacity_l, 'L')} |\n`;
  }
  if (spec.propulsion.propulsion_type === 'electric' || spec.propulsion.propulsion_type === 'hybrid') {
    md += `| Battery Capacity | ${numUnit(spec.propulsion.electric.battery_capacity_kwh, 'kWh')} |\n`;
  }
  md += `\n`;

  md += `## 4.5 General Arrangement\n\n`;
  if (includeDiagrams) {
    md += diagramPlaceholder('General Arrangement Drawing', 'Plan view showing deck layout, helm position, seating, and equipment locations', 1);
    md += diagramPlaceholder('Profile View', 'Side view showing waterline, freeboard, and superstructure', 2);
  } else {
    md += `*Refer to the general arrangement drawing in the Annexes (Chapter 15).*\n\n`;
  }

  md += pageBreak(printOptimized);

  // ============================================
  // CHAPTER 5: STEERING AND HANDLING
  // ============================================
  md += `<a id="chapter-5"></a>\n\n`;
  md += `# Chapter 5: Steering and Handling\n\n`;

  md += `## 5.1 Steering System\n\n`;
  md += `| Parameter | Value |\n`;
  md += `|-----------|-------|\n`;
  md += `| Steering Type | ${capitalize(spec.steering.steering_type) || config.steering_type} |\n`;
  md += `| Number of Helm Stations | ${val(spec.steering.number_of_helm_stations, '1')} |\n`;
  md += `| Visibility Type | ${capitalize(spec.steering.visibility_type)} |\n`;
  md += `| Autopilot | ${val(spec.steering.autopilot_installed)} |\n`;
  md += `| Emergency Steering | ${val(spec.steering.emergency_steering)} |\n\n`;

  // Steering type specific instructions
  const steeringType = spec.steering.steering_type || config.steering_type.toLowerCase();
  if (steeringType === 'hydraulic') {
    md += `## 5.2 Hydraulic Steering Operation\n\n`;
    md += `Your vessel is equipped with **hydraulic steering** which provides:\n\n`;
    md += `- Smooth, responsive control\n`;
    md += `- Reduced helm effort\n`;
    md += `- No mechanical cable maintenance\n\n`;
    md += `### Maintenance\n\n`;
    md += `- Check hydraulic fluid level monthly\n`;
    md += `- Inspect hoses for leaks or damage\n`;
    md += `- Service annually by qualified technician\n`;
    md += `- Report any unusual resistance or noise immediately\n\n`;
  } else if (steeringType === 'mechanical_cable') {
    md += `## 5.2 Mechanical Cable Steering\n\n`;
    md += `### Maintenance\n\n`;
    md += `- Lubricate steering cable annually\n`;
    md += `- Check cable for fraying or damage\n`;
    md += `- Ensure all connections are secure\n`;
    md += `- Test steering response before each trip\n\n`;
  } else if (steeringType === 'tiller') {
    md += `## 5.2 Tiller Steering\n\n`;
    md += `- Push the tiller to port to turn starboard\n`;
    md += `- Push the tiller to starboard to turn port\n`;
    md += `- Check tiller pivot for wear\n`;
    md += `- Ensure tiller is securely attached\n\n`;
  }

  md += `## 5.3 Handling Characteristics\n\n`;
  md += `### Low Speed Maneuvering\n\n`;
  md += `- The vessel may have reduced steering response at very low speeds\n`;
  if (spec.additional.bow_thruster) {
    md += `- Use bow thruster for tight maneuvering\n`;
  }
  if (spec.additional.stern_thruster) {
    md += `- Use stern thruster for improved control\n`;
  }
  md += `- Allow for wind and current effects\n\n`;

  md += `### Cruising\n\n`;
  md += `- Maintain a proper lookout at all times\n`;
  md += `- Adjust speed for conditions\n`;
  md += `- Be aware of the vessel's stopping distance\n\n`;

  if (spec.additional.bow_thruster || spec.additional.stern_thruster) {
    md += `## 5.4 Thruster Operation\n\n`;
    if (spec.additional.bow_thruster) {
      md += `### Bow Thruster\n\n`;
      md += `- Use for low-speed maneuvering only\n`;
      md += `- Do not operate continuously for more than 30 seconds\n`;
      md += `- Allow 2 minutes cooling between extended use\n`;
      md += `- Most effective at speeds below 3 knots\n\n`;
    }
    if (spec.additional.stern_thruster) {
      md += `### Stern Thruster\n\n`;
      md += `- Use in combination with bow thruster for pivoting\n`;
      md += `- Same operating limits as bow thruster apply\n\n`;
    }
  }

  if (spec.steering.autopilot_installed) {
    md += `## 5.5 Autopilot\n\n`;
    md += `> **WARNING:** Never leave the helm unattended, even with autopilot engaged.\n\n`;
    md += `- Engage autopilot only in open water\n`;
    md += `- Maintain a proper lookout at all times\n`;
    md += `- Be prepared to take manual control immediately\n`;
    md += `- Refer to autopilot manufacturer's manual for detailed operation\n\n`;
  }

  if (spec.additional.trim_tabs) {
    md += `## 5.6 Trim Tabs\n\n`;
    md += `Trim tabs are installed to optimize vessel attitude and performance.\n\n`;
    md += `- Use to correct listing due to uneven load distribution\n`;
    md += `- Lower stern tabs to raise bow at planing speed\n`;
    md += `- Adjust for optimal fuel efficiency and comfort\n\n`;
  }

  md += `---\n\n`;

  // ============================================
  // CHAPTER 6: PROPULSION
  // ============================================
  md += `<a id="chapter-6"></a>\n\n`;
  md += `# Chapter 6: Propulsion\n\n`;

  md += `## 6.1 Propulsion System Overview\n\n`;
  md += `| Parameter | Value |\n`;
  md += `|-----------|-------|\n`;
  md += `| Propulsion Type | ${capitalize(spec.propulsion.propulsion_type)} |\n`;
  md += `| Number of Motors | ${val(spec.propulsion.number_of_motors, '1')} |\n`;
  md += `| Power per Motor | ${numUnit(spec.propulsion.power_per_motor_kw, 'kW')} |\n`;
  md += `| Fuel Type | ${capitalize(spec.propulsion.fuel_type)} |\n\n`;

  // Electric propulsion
  if (spec.propulsion.propulsion_type === 'electric' || spec.propulsion.propulsion_type === 'hybrid') {
    md += `## 6.2 Electric Propulsion System\n\n`;
    md += `### Battery System\n\n`;
    md += `| Parameter | Value |\n`;
    md += `|-----------|-------|\n`;
    md += `| Battery Capacity | ${numUnit(spec.propulsion.electric.battery_capacity_kwh, 'kWh')} |\n`;
    md += `| Battery Voltage | ${numUnit(spec.propulsion.electric.battery_voltage_v, 'V')} |\n`;
    md += `| Battery Chemistry | ${val(spec.propulsion.electric.battery_chemistry)} |\n`;
    md += `| Charging Methods | ${listItems(spec.propulsion.electric.charging_methods as string[])} |\n`;
    md += `| Max Charging Power | ${numUnit(spec.propulsion.electric.max_charging_power_kw, 'kW')} |\n\n`;

    md += `### Operating the Electric Motor\n\n`;
    md += `1. Ensure main battery switch is ON\n`;
    md += `2. Check battery charge level on display\n`;
    md += `3. Turn ignition key to ON position\n`;
    md += `4. Verify all system indicators show normal\n`;
    md += `5. Select forward or reverse gear\n`;
    md += `6. Increase throttle gradually\n\n`;

    md += `### Battery Care\n\n`;
    md += `- Keep batteries charged between 20% and 80% for optimal lifespan\n`;
    md += `- Do not leave batteries fully discharged\n`;
    md += `- Use only approved chargers\n`;
    md += `- Check battery connections periodically\n`;
    md += `- Service by authorized dealer only\n\n`;

    md += `### Charging\n\n`;
    const chargingMethods = spec.propulsion.electric.charging_methods || [];
    if (chargingMethods.includes('shore_power_ac')) {
      md += `**Shore Power Charging:**\n`;
      md += `- Connect shore power cable to vessel inlet\n`;
      md += `- Ensure cable rating matches vessel requirements\n`;
      md += `- Monitor charging progress on display\n\n`;
    }
    if (chargingMethods.includes('solar_pv')) {
      md += `**Solar Charging:**\n`;
      md += `- Solar panels charge batteries automatically in daylight\n`;
      md += `- Keep panels clean for optimal performance\n\n`;
    }
  }

  // Diesel propulsion
  if (spec.propulsion.propulsion_type === 'inboard' || spec.propulsion.propulsion_type === 'sterndrive' || spec.propulsion.fuel_type === 'diesel') {
    md += `## 6.2 Diesel Engine Operation\n\n`;
    md += `### Starting Procedure\n\n`;
    md += `1. Check engine oil level\n`;
    md += `2. Check coolant level\n`;
    md += `3. Check fuel level\n`;
    md += `4. Turn battery switch to ON\n`;
    md += `5. Turn ignition key to START (do not crank for more than 10 seconds)\n`;
    md += `6. Allow engine to warm up at idle (2-3 minutes)\n`;
    md += `7. Check gauges for normal readings\n`;
    md += `8. Engage gear when ready\n\n`;

    md += `### Stopping Procedure\n\n`;
    md += `1. Return to neutral\n`;
    md += `2. Allow engine to idle for 2-3 minutes to cool\n`;
    md += `3. Turn ignition key to OFF\n`;
    md += `4. Turn battery switch to OFF (if leaving vessel)\n\n`;

    md += `### Engine Maintenance\n\n`;
    md += `| Interval | Task |\n`;
    md += `|----------|------|\n`;
    md += `| Before each use | Check oil level, coolant, visual inspection |\n`;
    md += `| Every 50 hours | Check belt tension, hose connections |\n`;
    md += `| Every 100 hours | Change engine oil and filter |\n`;
    md += `| Every 200 hours | Replace fuel filter |\n`;
    md += `| Annually | Full service by authorized dealer |\n\n`;
  }

  // Outboard
  if (spec.propulsion.propulsion_type === 'outboard') {
    md += `## 6.2 Outboard Motor Operation\n\n`;
    md += `- Refer to outboard motor manufacturer's manual for detailed operation\n`;
    md += `- Ensure kill switch lanyard is attached before starting\n`;
    md += `- Tilt motor up when in shallow water or when mooring\n`;
    md += `- Flush motor with fresh water after use in salt water\n\n`;
  }

  // List installed motors from configuration
  const propulsionItems = includedItems.filter(i =>
    i.article.category.includes('Propulsion') ||
    i.article.subcategory.includes('Motor')
  );
  if (propulsionItems.length > 0) {
    md += `## 6.3 Installed Propulsion Components\n\n`;
    md += `| Component | Brand | Article No. |\n`;
    md += `|-----------|-------|-------------|\n`;
    for (const item of propulsionItems) {
      md += `| ${item.article.part_name} | ${item.article.brand || '-'} | ${item.article.manufacturer_article_no || '-'} |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;

  // ============================================
  // CHAPTER 7: ELECTRICAL SYSTEM
  // ============================================
  md += `<a id="chapter-7"></a>\n\n`;
  md += `# Chapter 7: Electrical System\n\n`;

  md += `## 7.1 System Overview\n\n`;
  md += `| Parameter | Value |\n`;
  md += `|-----------|-------|\n`;
  md += `| DC System | ${val(spec.electrical_system.dc_system)} |\n`;
  if (spec.electrical_system.dc_system) {
    md += `| DC Voltage | ${numUnit(spec.electrical_system.dc_voltage, 'V', '12V')} |\n`;
  }
  md += `| AC System | ${val(spec.electrical_system.ac_system)} |\n`;
  if (spec.electrical_system.ac_system) {
    md += `| AC Voltage | ${numUnit(spec.electrical_system.ac_voltage, 'V', '230V')} |\n`;
  }
  md += `| Number of Batteries | ${val(spec.electrical_system.number_of_batteries)} |\n`;
  md += `| Battery Switches | ${val(spec.electrical_system.battery_switches)} |\n`;
  md += `| Fuse/Breaker Panels | ${val(spec.electrical_system.fuse_panels)} |\n`;
  md += `| Shore Power Inlet | ${val(spec.electrical_system.shore_power_inlet)} |\n`;
  md += `| Inverter/Charger | ${val(spec.electrical_system.inverter_charger)} |\n`;
  if (spec.electrical_system.generator_installed) {
    md += `| Generator | ${numUnit(spec.electrical_system.generator_power_kw, 'kW')} |\n`;
  }
  if (spec.electrical_system.solar_panels_installed) {
    md += `| Solar Panels | ${numUnit(spec.electrical_system.solar_capacity_w, 'W')} |\n`;
  }
  md += `\n`;

  md += `## 7.2 Battery System\n\n`;
  md += `### Battery Locations\n\n`;
  md += `| Battery | Location | Purpose |\n`;
  md += `|---------|----------|----------|\n`;
  md += `| Main/Starter | ________________ | Engine start / Main power |\n`;
  md += `| House Bank | ________________ | Domestic loads |\n`;
  if (spec.propulsion.propulsion_type === 'electric' || spec.propulsion.propulsion_type === 'hybrid') {
    md += `| Propulsion Bank | ________________ | Electric motor |\n`;
  }
  md += `\n`;

  if (spec.electrical_system.battery_switches) {
    md += `### Battery Switch Positions\n\n`;
    md += `| Position | Description |\n`;
    md += `|----------|-------------|\n`;
    md += `| OFF | All batteries disconnected |\n`;
    md += `| 1 | Battery 1 connected |\n`;
    md += `| 2 | Battery 2 connected |\n`;
    md += `| BOTH | Both batteries parallel |\n\n`;
    md += `> **WARNING:** Never switch battery positions while engine is running.\n\n`;
  }

  md += `## 7.3 Fuse and Breaker Panel\n\n`;
  md += `The main electrical panel is located at: ________________\n\n`;
  md += `In case of electrical failure:\n\n`;
  md += `1. Check the appropriate fuse or breaker\n`;
  md += `2. If a breaker has tripped, identify the cause before resetting\n`;
  md += `3. If a fuse has blown, replace with the same rating only\n`;
  md += `4. Contact service if problem persists\n\n`;

  if (spec.electrical_system.shore_power_inlet) {
    md += `## 7.4 Shore Power Connection\n\n`;
    md += `1. Ensure shore power breaker is OFF\n`;
    md += `2. Connect cable to vessel inlet first\n`;
    md += `3. Connect cable to shore pedestal\n`;
    md += `4. Turn on shore pedestal breaker\n`;
    md += `5. Turn on vessel shore power breaker\n\n`;
    md += `**Disconnecting:**\n`;
    md += `1. Turn off vessel shore power breaker\n`;
    md += `2. Turn off shore pedestal breaker\n`;
    md += `3. Disconnect from shore first, then vessel\n\n`;
    md += `> **WARNING:** Always disconnect shore power before leaving dock.\n\n`;
  }

  if (spec.electrical_system.inverter_charger) {
    md += `## 7.5 Inverter/Charger\n\n`;
    md += `The inverter provides AC power from the battery bank when shore power is not connected.\n\n`;
    md += `- Monitor battery level when using inverter\n`;
    md += `- High-draw appliances will drain batteries quickly\n`;
    md += `- Automatic changeover when shore power is connected\n\n`;
  }

  // List electrical components
  const electricalItems = includedItems.filter(i =>
    i.article.category.includes('Electrical') ||
    i.article.category.includes('Navigation')
  );
  if (electricalItems.length > 0) {
    md += `## 7.6 Installed Electrical Equipment\n\n`;
    md += `| Equipment | Brand | Article No. |\n`;
    md += `|-----------|-------|-------------|\n`;
    for (const item of electricalItems) {
      md += `| ${item.article.part_name} | ${item.article.brand || '-'} | ${item.article.manufacturer_article_no || '-'} |\n`;
    }
    md += `\n`;
  }

  // Add electrical wiring diagram placeholder
  if (includeDiagrams) {
    md += `## 7.7 Wiring Diagram\n\n`;
    md += diagramPlaceholder('Electrical Wiring Diagram', 'Complete wiring schematic showing batteries, switches, fuses, and circuits', 3);
    md += diagramPlaceholder('Panel Layout', 'Breaker/fuse panel layout with circuit labels', 4);
  }

  md += pageBreak(printOptimized);

  // ============================================
  // CHAPTER 8: FUEL SYSTEM
  // ============================================
  md += `<a id="chapter-8"></a>\n\n`;
  md += `# Chapter 8: Fuel System\n\n`;

  if (!spec.fuel_system.has_fuel_tank && spec.propulsion.fuel_type === 'none') {
    md += `This vessel is equipped with electric propulsion and does not have a fuel system.\n\n`;
    md += `*Not applicable to this vessel.*\n\n`;
  } else {
    md += `## 8.1 Fuel System Specifications\n\n`;
    md += `| Parameter | Value |\n`;
    md += `|-----------|-------|\n`;
    md += `| Fuel Type | ${capitalize(spec.propulsion.fuel_type) || 'Diesel'} |\n`;
    md += `| Tank Capacity | ${numUnit(spec.fuel_system.tank_capacity_l, 'L')} |\n`;
    md += `| Tank Material | ${capitalize(spec.fuel_system.tank_material)} |\n`;
    md += `| Ventilation | ${capitalize(spec.fuel_system.ventilation)} |\n`;
    md += `| Filler Type | ${capitalize(spec.fuel_system.filler_type)} |\n`;
    md += `| Fuel Filter | ${val(spec.fuel_system.fuel_filter_installed)} |\n`;
    md += `| Shut-off Valve | ${val(spec.fuel_system.fuel_shutoff_valve)} |\n\n`;

    md += `## 8.2 Refueling Procedure\n\n`;
    md += `> **WARNING:** Follow all safety precautions when handling fuel.\n\n`;
    md += `1. Moor vessel securely\n`;
    md += `2. Turn off engine and all electrical equipment\n`;
    md += `3. Ensure all passengers have disembarked\n`;
    md += `4. No smoking or open flames\n`;
    md += `5. Open fuel filler cap\n`;
    md += `6. Insert fuel nozzle and fill slowly\n`;
    md += `7. Do not overfill - leave room for expansion\n`;
    md += `8. Replace and secure fuel cap\n`;
    md += `9. Clean up any spills immediately\n`;
    md += `10. Ventilate engine compartment before starting\n\n`;

    if (spec.fuel_system.fuel_shutoff_valve) {
      md += `## 8.3 Fuel Shut-off Valve\n\n`;
      md += `A fuel shut-off valve is installed for emergency use.\n\n`;
      md += `**Location:** ________________\n\n`;
      md += `Turn the valve to CLOSED position in case of:\n`;
      md += `- Fuel leak detected\n`;
      md += `- Fire emergency\n`;
      md += `- Extended storage\n\n`;
    }

    md += `## 8.4 Fuel System Maintenance\n\n`;
    md += `| Interval | Task |\n`;
    md += `|----------|------|\n`;
    md += `| Before each use | Check for leaks, fuel level |\n`;
    md += `| Monthly | Inspect fuel lines and connections |\n`;
    md += `| Annually | Replace fuel filter |\n`;
    md += `| Annually | Inspect tank for corrosion |\n`;
    md += `| As needed | Drain water separator |\n\n`;

    // Add fuel system diagram placeholder
    if (includeDiagrams) {
      md += `## 8.5 Fuel System Diagram\n\n`;
      md += diagramPlaceholder('Fuel System Layout', 'Tank location, fuel lines, filter, and shut-off valve positions', 5);
    }
  }

  md += pageBreak(printOptimized);

  // ============================================
  // CHAPTER 9: GAS INSTALLATION
  // ============================================
  md += `<a id="chapter-9"></a>\n\n`;
  md += `# Chapter 9: Gas Installation\n\n`;

  if (!spec.gas_installation.has_gas_system) {
    md += `This vessel is not equipped with an LPG gas system.\n\n`;
    md += `*Not applicable to this vessel.*\n\n`;
  } else {
    md += `> **DANGER:** LPG is highly flammable. Read all safety instructions carefully.\n\n`;

    md += `## 9.1 Gas System Specifications\n\n`;
    md += `| Parameter | Value |\n`;
    md += `|-----------|-------|\n`;
    md += `| Number of Cylinders | ${val(spec.gas_installation.number_of_cylinders)} |\n`;
    md += `| Gas Locker Location | ${capitalize(spec.gas_installation.gas_locker_location)} |\n`;
    md += `| Pipe Material | ${capitalize(spec.gas_installation.pipe_material)} |\n`;
    md += `| Regulator Present | ${val(spec.gas_installation.regulator_present)} |\n`;
    md += `| Gas Detector | ${val(spec.gas_installation.gas_detector_installed)} |\n`;
    md += `| Appliances | ${spec.gas_installation.appliances.length > 0 ? spec.gas_installation.appliances.join(', ') : 'None specified'} |\n\n`;

    md += `## 9.2 Safe Operation\n\n`;
    md += `### Before Using Gas Appliances\n\n`;
    md += `1. Ensure gas locker ventilation is not blocked\n`;
    md += `2. Check gas detector is operational (if fitted)\n`;
    md += `3. Open cylinder valve slowly\n`;
    md += `4. Check regulator gauge shows correct pressure\n`;
    md += `5. Light appliance according to manufacturer's instructions\n\n`;

    md += `### After Using Gas Appliances\n\n`;
    md += `1. Turn off appliance\n`;
    md += `2. Close cylinder valve when leaving vessel or sleeping\n`;
    md += `3. Check all connections periodically\n\n`;

    md += `## 9.3 Gas Leak Detection\n\n`;
    md += `If you suspect a gas leak:\n\n`;
    md += `1. **DO NOT** use any electrical switches\n`;
    md += `2. **DO NOT** strike matches or use lighters\n`;
    md += `3. Close gas cylinder valve immediately\n`;
    md += `4. Open all hatches and doors to ventilate\n`;
    md += `5. Check connections with soapy water solution\n`;
    md += `6. Do not use system until leak is repaired\n\n`;

    if (spec.gas_installation.gas_detector_installed) {
      md += `## 9.4 Gas Detector\n\n`;
      md += `A gas detector is installed to warn of LPG accumulation.\n\n`;
      md += `- Test detector monthly\n`;
      md += `- If alarm sounds, follow gas leak procedures above\n`;
      md += `- Replace detector as per manufacturer's recommendation\n\n`;
    }

    md += `## 9.5 Gas System Maintenance\n\n`;
    md += `| Interval | Task |\n`;
    md += `|----------|------|\n`;
    md += `| Before each use | Check cylinder valve is closed when not in use |\n`;
    md += `| Monthly | Visual inspection of hoses and connections |\n`;
    md += `| Annually | Professional inspection and testing |\n`;
    md += `| As marked | Replace flexible hoses (check date stamp) |\n\n`;
  }

  md += `---\n\n`;

  // ============================================
  // CHAPTER 10: WATER AND WASTE SYSTEMS
  // ============================================
  md += `<a id="chapter-10"></a>\n\n`;
  md += `# Chapter 10: Water and Waste Systems\n\n`;

  const hasWaterSystem = spec.water_waste.fresh_water_tank || spec.water_waste.water_pump;
  const hasWasteSystem = spec.water_waste.toilet_type !== 'none' && spec.water_waste.toilet_type !== '' || spec.water_waste.holding_tank;

  if (!hasWaterSystem && !hasWasteSystem) {
    md += `This vessel is not equipped with water or waste systems.\n\n`;
    md += `*Not applicable to this vessel.*\n\n`;
  } else {
    md += `## 10.1 System Overview\n\n`;
    md += `| System | Installed | Capacity |\n`;
    md += `|--------|-----------|----------|\n`;
    md += `| Fresh Water Tank | ${val(spec.water_waste.fresh_water_tank)} | ${numUnit(spec.water_waste.fresh_water_capacity_l, 'L')} |\n`;
    md += `| Water Pump | ${val(spec.water_waste.water_pump)} | - |\n`;
    md += `| Pressure System | ${val(spec.water_waste.pressure_water_system)} | - |\n`;
    md += `| Hot Water Boiler | ${val(spec.water_waste.boiler)} | ${numUnit(spec.water_waste.boiler_capacity_l, 'L')} |\n`;
    md += `| Toilet Type | ${capitalize(spec.water_waste.toilet_type)} | - |\n`;
    md += `| Holding Tank | ${val(spec.water_waste.holding_tank)} | ${numUnit(spec.water_waste.holding_tank_capacity_l, 'L')} |\n`;
    md += `| Waste Water Tank | ${val(spec.water_waste.waste_water_tank)} | ${numUnit(spec.water_waste.waste_water_capacity_l, 'L')} |\n\n`;

    if (spec.water_waste.fresh_water_tank) {
      md += `## 10.2 Fresh Water System\n\n`;
      md += `### Filling the Fresh Water Tank\n\n`;
      md += `1. Locate fresh water deck fill\n`;
      md += `2. Use potable water hose only\n`;
      md += `3. Fill until water overflows from vent\n`;
      md += `4. Secure cap\n\n`;

      md += `### Water Conservation\n\n`;
      md += `- Monitor tank level regularly\n`;
      md += `- Use water sparingly when away from facilities\n`;
      md += `- Fix any leaks promptly\n\n`;

      md += `### Winterization\n\n`;
      md += `- Drain all water tanks and lines before freezing weather\n`;
      md += `- Use non-toxic antifreeze in water system if required\n`;
      md += `- Leave taps open after draining\n\n`;
    }

    if (spec.water_waste.toilet_type && spec.water_waste.toilet_type !== 'none') {
      md += `## 10.3 Marine Toilet\n\n`;
      md += `**Toilet Type:** ${capitalize(spec.water_waste.toilet_type)}\n\n`;

      if (spec.water_waste.toilet_type === 'manual_marine') {
        md += `### Operation\n\n`;
        md += `1. Add water to bowl before use\n`;
        md += `2. After use, pump handle to flush\n`;
        md += `3. Use marine-grade toilet paper only\n`;
        md += `4. Never dispose of foreign objects\n\n`;
      } else if (spec.water_waste.toilet_type === 'electric_marine') {
        md += `### Operation\n\n`;
        md += `1. Press flush button briefly for rinse\n`;
        md += `2. Press and hold for full flush\n`;
        md += `3. Use marine-grade toilet paper only\n`;
        md += `4. Monitor holding tank level\n\n`;
      }

      md += `> **IMPORTANT:** Discharge of untreated sewage is prohibited in most waters. Use pump-out facilities.\n\n`;
    }

    if (spec.water_waste.holding_tank) {
      md += `## 10.4 Holding Tank\n\n`;
      md += `**Capacity:** ${numUnit(spec.water_waste.holding_tank_capacity_l, 'L')}\n\n`;
      md += `### Pump-out Procedure\n\n`;
      md += `1. Locate marina pump-out station\n`;
      md += `2. Connect pump-out hose to deck fitting\n`;
      md += `3. Operate pump-out equipment\n`;
      md += `4. Rinse tank if facility allows\n`;
      md += `5. Add holding tank treatment chemical\n\n`;
    }

    md += `## 10.5 Maintenance\n\n`;
    md += `| System | Interval | Task |\n`;
    md += `|--------|----------|------|\n`;
    if (spec.water_waste.fresh_water_tank) {
      md += `| Fresh Water | Annually | Sanitize tank |\n`;
      md += `| Water Pump | As needed | Check for leaks |\n`;
    }
    if (spec.water_waste.holding_tank) {
      md += `| Holding Tank | Each use | Add treatment chemical |\n`;
      md += `| Holding Tank | Annually | Professional cleaning |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;

  // ============================================
  // CHAPTER 11: OPERATION OF THE VESSEL
  // ============================================
  md += `<a id="chapter-11"></a>\n\n`;
  md += `# Chapter 11: Operation of the Vessel\n\n`;

  md += `## 11.1 Pre-Departure Checklist\n\n`;
  md += `Complete this checklist before each trip:\n\n`;
  md += `| Item | Check |\n`;
  md += `|------|-------|\n`;
  md += `| Weather forecast reviewed | [ ] |\n`;
  md += `| Float plan filed with someone ashore | [ ] |\n`;
  md += `| Fuel/battery level adequate | [ ] |\n`;
  md += `| Engine oil level checked | [ ] |\n`;
  md += `| Coolant level checked | [ ] |\n`;
  md += `| Bilge checked and pumped if necessary | [ ] |\n`;
  md += `| Navigation lights operational | [ ] |\n`;
  md += `| Safety equipment aboard and accessible | [ ] |\n`;
  md += `| VHF radio operational | [ ] |\n`;
  md += `| Mooring lines and fenders ready | [ ] |\n`;
  md += `| All hatches and seacocks secured | [ ] |\n`;
  md += `| Passengers briefed on safety | [ ] |\n`;
  md += `| Life jackets available for all | [ ] |\n\n`;

  md += `## 11.2 Departure Procedure\n\n`;
  md += `1. Complete pre-departure checklist\n`;
  md += `2. Brief all passengers on safety procedures\n`;
  md += `3. Ensure all persons are seated\n`;
  md += `4. Start engine and check gauges\n`;
  md += `5. Check steering response\n`;
  md += `6. Remove dock lines in correct order\n`;
  md += `7. Depart slowly, watching for other vessels and obstacles\n`;
  md += `8. Stow fenders once clear of dock\n\n`;

  md += `## 11.3 Underway Operations\n\n`;
  md += `### Navigation\n\n`;
  md += `- Maintain a proper lookout at all times\n`;
  md += `- Follow COLREG (International Rules for Prevention of Collision at Sea)\n`;
  md += `- Keep to starboard in channels\n`;
  md += `- Give way to sailing vessels (when under power)\n`;
  md += `- Reduce speed in congested areas\n\n`;

  md += `### Speed Limits\n\n`;
  md += `- Observe local speed limits\n`;
  md += `- Reduce speed near swimmers, divers, and small craft\n`;
  md += `- Create minimum wash near moored vessels\n`;
  md += `- Adjust speed for visibility and sea conditions\n\n`;

  md += `## 11.4 Anchoring\n\n`;
  if (spec.additional.anchor_windlass) {
    md += `This vessel is equipped with an electric anchor windlass.\n\n`;
  }
  md += `### Anchoring Procedure\n\n`;
  md += `1. Select suitable anchorage with good holding\n`;
  md += `2. Approach into wind or current\n`;
  md += `3. Stop vessel at desired position\n`;
  md += `4. Lower anchor to seabed\n`;
  md += `5. Pay out scope (5:1 minimum in normal conditions)\n`;
  md += `6. Set anchor by backing down gently\n`;
  md += `7. Take bearings to monitor position\n`;
  md += `8. Display anchor ball/light as required\n\n`;

  md += `### Weighing Anchor\n\n`;
  md += `1. Motor slowly toward anchor\n`;
  md += `2. Retrieve rode, keeping tension\n`;
  md += `3. Break anchor free when directly above\n`;
  md += `4. Raise anchor and secure\n`;
  md += `5. Check anchor and rode for debris\n\n`;

  md += `## 11.5 Mooring and Docking\n\n`;
  md += `### Approaching a Dock\n\n`;
  md += `1. Prepare fenders and dock lines\n`;
  md += `2. Approach slowly, into wind/current if possible\n`;
  md += `3. Use short bursts of power for control\n`;
  if (spec.additional.bow_thruster) {
    md += `4. Use bow thruster for final positioning\n`;
  }
  md += `5. Secure bow line first, then stern\n`;
  md += `6. Adjust spring lines as needed\n\n`;

  md += `## 11.6 Return and Shutdown\n\n`;
  md += `1. Approach berth slowly\n`;
  md += `2. Secure mooring lines\n`;
  md += `3. Shut down engine\n`;
  md += `4. Turn off electronics\n`;
  md += `5. Turn off battery switch (if leaving vessel)\n`;
  md += `6. Check bilge\n`;
  md += `7. Secure vessel cover if fitted\n`;
  md += `8. Lock cabin if applicable\n\n`;

  md += `---\n\n`;

  // ============================================
  // CHAPTER 12: EMERGENCIES
  // ============================================
  md += `<a id="chapter-12"></a>\n\n`;
  md += `# Chapter 12: Emergencies\n\n`;

  md += `## 12.1 Emergency Contacts\n\n`;
  md += `| Service | Contact |\n`;
  md += `|---------|--------|\n`;
  md += `| Coast Guard / Maritime Rescue | VHF Channel 16 |\n`;
  md += `| Emergency Services | 112 (EU) / 911 (US) |\n`;
  md += `| Manufacturer | ${settings.company_phone} |\n`;
  md += `| Local Marina | ________________ |\n`;
  md += `| Towing Service | ________________ |\n\n`;

  md += `## 12.2 Distress Signals\n\n`;
  md += `Use the following distress signals only in genuine emergency:\n\n`;
  md += `- **VHF Radio:** Channel 16 - "MAYDAY, MAYDAY, MAYDAY"\n`;
  md += `- **Red Flares:** Hand-held or parachute\n`;
  md += `- **Orange Smoke:** Daytime only\n`;
  md += `- **Sound Signal:** Continuous sounding of fog horn\n`;
  md += `- **Visual Signal:** Arms raised and lowered repeatedly\n`;
  if (spec.safety.epirb) {
    md += `- **EPIRB:** Activate and leave deployed\n`;
  }
  md += `\n`;

  md += `## 12.3 Fire Emergency\n\n`;
  md += `> **In case of fire, act quickly but calmly.**\n\n`;
  md += `1. Alert all persons aboard - shout "FIRE!"\n`;
  md += `2. If possible, turn off fuel supply\n`;
  md += `3. If possible, turn off electrical power\n`;
  md += `4. Direct persons away from fire and prepare to abandon\n`;
  md += `5. Fight fire with extinguisher if safe to do so:\n`;
  md += `   - Aim at base of flames\n`;
  md += `   - Sweep from side to side\n`;
  md += `   - Maintain escape route\n`;
  md += `6. If fire cannot be controlled, abandon vessel\n`;
  md += `7. Call for assistance (VHF Ch 16)\n\n`;

  md += `**Fire Extinguisher Locations:** ________________\n\n`;

  md += `## 12.4 Flooding / Taking on Water\n\n`;
  md += `1. Alert all persons aboard\n`;
  md += `2. Identify source of water ingress\n`;
  md += `3. Attempt to stop or slow leak:\n`;
  md += `   - Wooden plugs for through-hull failures\n`;
  md += `   - Rags, cushions for hull damage\n`;
  md += `4. Activate all bilge pumps\n`;
  md += `5. Reduce speed and head for nearest safe harbor\n`;
  md += `6. Prepare life jackets and safety equipment\n`;
  md += `7. Call for assistance if situation worsens\n\n`;

  md += `## 12.5 Man Overboard (MOB)\n\n`;
  md += `> **Immediate action is critical - every second counts.**\n\n`;
  md += `1. Shout "MAN OVERBOARD" and point continuously\n`;
  md += `2. Throw lifebuoy/throwable device toward person\n`;
  md += `3. Press MOB button on GPS if equipped\n`;
  md += `4. Assign crew to keep visual contact\n`;
  md += `5. Maneuver to recover - approach from downwind\n`;
  md += `6. Stop propeller before person is alongside\n`;
  md += `7. Recover person using ladder or rescue sling\n`;
  md += `8. Treat for hypothermia/shock\n`;
  md += `9. Seek medical attention if needed\n\n`;

  md += `## 12.6 Engine Failure\n\n`;
  md += `1. Attempt to restart engine\n`;
  md += `2. Check fuel level and battery charge\n`;
  md += `3. Check for obvious problems (loose wires, blocked fuel)\n`;
  md += `4. Deploy anchor if drifting toward danger\n`;
  md += `5. Call for assistance if unable to restart\n`;
  md += `6. Display "Not Under Command" shapes/lights if required\n\n`;

  md += `## 12.7 Grounding\n\n`;
  md += `1. Stop engine immediately\n`;
  md += `2. Check for injuries to persons\n`;
  md += `3. Check bilge for water ingress\n`;
  md += `4. Assess situation - rising or falling tide?\n`;
  md += `5. If safe, attempt to back off gently\n`;
  md += `6. Do NOT use high power - may cause more damage\n`;
  md += `7. If stuck, call for assistance\n`;
  md += `8. Inspect vessel thoroughly before continuing\n\n`;

  md += `## 12.8 Collision\n\n`;
  md += `1. Stop vessel and assess damage\n`;
  md += `2. Check for injuries to all persons\n`;
  md += `3. Check for water ingress\n`;
  md += `4. Render assistance to other vessel if needed\n`;
  md += `5. Exchange details with other party\n`;
  md += `6. Report to authorities as required\n`;
  md += `7. Document with photos if possible\n\n`;

  md += `## 12.9 Abandon Ship\n\n`;
  md += `> **Abandon ship only as a last resort.**\n\n`;
  md += `1. Send distress call with position\n`;
  md += `2. Ensure all persons have life jackets\n`;
  md += `3. Prepare liferaft if equipped\n`;
  md += `4. Grab emergency grab bag (water, flares, radio)\n`;
  md += `5. Step UP into liferaft if possible (stay dry)\n`;
  md += `6. Stay near vessel unless danger of sinking\n`;
  md += `7. Deploy EPIRB if equipped\n`;
  md += `8. Conserve energy and stay together\n\n`;

  md += `---\n\n`;

  // ============================================
  // CHAPTER 13: MAINTENANCE
  // ============================================
  md += `<a id="chapter-13"></a>\n\n`;
  md += `# Chapter 13: Maintenance\n\n`;

  md += `## 13.1 Maintenance Schedule Overview\n\n`;
  md += `| Frequency | Tasks |\n`;
  md += `|-----------|-------|\n`;
  md += `| Before each use | Visual inspection, check bilge, fluid levels |\n`;
  md += `| After each use | Rinse with fresh water (salt water use), check mooring |\n`;
  md += `| Weekly | Clean vessel, check battery, inspect lines |\n`;
  md += `| Monthly | Check all fluid levels, inspect anodes, lubricate |\n`;
  md += `| Seasonally | Detailed inspection, service as needed |\n`;
  md += `| Annually | Full professional service, antifouling, haul out |\n\n`;

  md += `## 13.2 Hull and Exterior\n\n`;
  md += `### Hull Care\n\n`;
  md += `- Rinse hull with fresh water after each use in salt water\n`;
  md += `- Clean waterline regularly to prevent growth\n`;
  md += `- Inspect hull for damage, blisters, or corrosion\n`;
  md += `- Touch up gel coat or paint as needed\n\n`;

  md += `### Antifouling\n\n`;
  md += `- Inspect antifouling coating annually\n`;
  md += `- Reapply as recommended by paint manufacturer\n`;
  md += `- Clean hull bottom before repainting\n\n`;

  md += `### Anodes (Sacrificial)\n\n`;
  md += `- Inspect anodes monthly\n`;
  md += `- Replace when 50% depleted\n`;
  md += `- Ensure good electrical contact\n\n`;

  md += `## 13.3 Deck and Cockpit\n\n`;
  md += `- Clean with appropriate marine cleaners\n`;
  md += `- Inspect hatches and portlights for leaks\n`;
  md += `- Check and lubricate hinges and latches\n`;
  md += `- Inspect deck hardware for security\n`;
  md += `- Check drain holes are clear\n\n`;

  md += `## 13.4 Engine and Propulsion\n\n`;
  if (spec.propulsion.propulsion_type === 'electric' || spec.propulsion.propulsion_type === 'hybrid') {
    md += `### Electric Motor\n\n`;
    md += `- Visual inspection of motor and connections\n`;
    md += `- Check for unusual sounds or vibration\n`;
    md += `- Service by authorized dealer only\n\n`;

    md += `### Battery System\n\n`;
    md += `- Check connections are clean and tight\n`;
    md += `- Monitor battery health on display\n`;
    md += `- Maintain charge level between 20-80%\n`;
    md += `- Service by authorized dealer only\n\n`;
  }

  if (spec.propulsion.fuel_type === 'diesel' || spec.propulsion.propulsion_type === 'inboard') {
    md += `### Diesel Engine\n\n`;
    md += `| Interval | Task |\n`;
    md += `|----------|------|\n`;
    md += `| Before each use | Check oil, coolant, belt tension |\n`;
    md += `| Every 50 hours | Inspect hoses and connections |\n`;
    md += `| Every 100 hours | Change oil and filter |\n`;
    md += `| Every 200 hours | Replace fuel filter, coolant service |\n`;
    md += `| Annually | Professional service |\n\n`;
  }

  md += `### Propeller and Shaft\n\n`;
  md += `- Inspect propeller for damage and fouling\n`;
  md += `- Check shaft seal for leaks\n`;
  md += `- Lubricate steering/shaft bearings as specified\n`;
  md += `- Check rope cutter if fitted\n\n`;

  md += `## 13.5 Electrical System\n\n`;
  md += `- Check battery terminals for corrosion\n`;
  md += `- Test battery charge state\n`;
  md += `- Inspect wiring for damage or chafe\n`;
  md += `- Test all lights and electronics\n`;
  md += `- Check fuses and breakers\n\n`;

  md += `## 13.6 Safety Equipment\n\n`;
  md += `| Equipment | Maintenance |\n`;
  md += `|-----------|-------------|\n`;
  md += `| Fire Extinguishers | Check gauge, service annually |\n`;
  md += `| Life Jackets | Inspect for damage, check inflation (if auto) |\n`;
  md += `| Flares | Check expiry date, replace when expired |\n`;
  md += `| First Aid Kit | Check contents and expiry dates |\n`;
  md += `| EPIRB | Test and register, replace battery as required |\n\n`;

  md += `## 13.7 Winterization\n\n`;
  md += `Before winter storage:\n\n`;
  md += `1. Clean vessel thoroughly inside and out\n`;
  md += `2. Drain all water systems\n`;
  md += `3. Add antifreeze to water system if required\n`;
  md += `4. Change engine oil (diesel engines)\n`;
  md += `5. Fog engine cylinders (diesel engines)\n`;
  md += `6. Fill fuel tank and add stabilizer\n`;
  md += `7. Charge batteries fully, disconnect if possible\n`;
  md += `8. Lubricate all moving parts\n`;
  md += `9. Open lockers and drawers for ventilation\n`;
  md += `10. Apply protective covers\n`;
  md += `11. Store in dry, ventilated area\n\n`;

  md += `---\n\n`;

  // ============================================
  // CHAPTER 14: ENVIRONMENT AND WASTE
  // ============================================
  md += `<a id="chapter-14"></a>\n\n`;
  md += `# Chapter 14: Environment and Waste\n\n`;

  md += `## 14.1 Environmental Responsibility\n\n`;
  md += `As a vessel owner, you have a responsibility to protect the marine environment.\n\n`;
  md += `### General Principles\n\n`;
  md += `- Leave no trace - take all waste ashore\n`;
  md += `- Respect marine life and habitats\n`;
  md += `- Anchor responsibly to avoid damaging seabed\n`;
  md += `- Use environmentally friendly cleaning products\n`;
  md += `- Report pollution incidents to authorities\n\n`;

  md += `## 14.2 Sewage Discharge Regulations\n\n`;
  md += `> **Discharge of untreated sewage is prohibited in most waters.**\n\n`;
  md += `- Use marina pump-out facilities\n`;
  md += `- Never discharge holding tank in harbors or anchorages\n`;
  md += `- Follow local regulations regarding discharge distances\n`;
  md += `- Use only marine-grade, biodegradable toilet chemicals\n\n`;

  md += `## 14.3 Waste Management\n\n`;
  md += `| Waste Type | Disposal Method |\n`;
  md += `|------------|----------------|\n`;
  md += `| Household garbage | Take ashore to appropriate bins |\n`;
  md += `| Recyclables | Separate and recycle ashore |\n`;
  md += `| Engine oil | Collect in container, dispose at recycling facility |\n`;
  md += `| Fuel/Oil filters | Dispose at hazardous waste facility |\n`;
  md += `| Batteries | Return to supplier or recycling center |\n`;
  md += `| Antifouling residue | Collect during haul-out, dispose properly |\n`;
  md += `| Flares (expired) | Return to supplier or Coast Guard |\n\n`;

  md += `## 14.4 Fuel and Oil Spills\n\n`;
  md += `### Prevention\n\n`;
  md += `- Use absorbent pads when refueling\n`;
  md += `- Check fuel system regularly for leaks\n`;
  md += `- Maintain engines to prevent leaks\n`;
  md += `- Use drip pans under engines\n\n`;

  md += `### In Case of Spill\n\n`;
  md += `1. Stop source of leak if possible\n`;
  md += `2. Contain spill with absorbent materials\n`;
  md += `3. Do NOT use detergents or dispersants\n`;
  md += `4. Report significant spills to authorities\n`;
  md += `5. Dispose of contaminated materials properly\n\n`;

  md += `## 14.5 Anti-Fouling and Cleaning\n\n`;
  md += `- Use approved anti-fouling paints\n`;
  md += `- Avoid copper-based paints in sensitive areas\n`;
  md += `- Wash vessel above waterline when possible\n`;
  md += `- Use phosphate-free, biodegradable cleaners\n`;
  md += `- Minimize runoff into water\n\n`;

  md += `## 14.6 Wildlife Protection\n\n`;
  md += `- Maintain safe distance from marine mammals\n`;
  md += `- Reduce speed near wildlife\n`;
  md += `- Do not feed or disturb wildlife\n`;
  md += `- Avoid anchoring on coral or seagrass\n`;
  md += `- Report injured wildlife to authorities\n\n`;

  md += `---\n\n`;

  // ============================================
  // CHAPTER 15: ANNEXES
  // ============================================
  md += `<a id="chapter-15"></a>\n\n`;
  md += `# Chapter 15: Annexes\n\n`;

  md += `## Annex A: Declaration of Conformity\n\n`;
  md += `*A copy of the EU Declaration of Conformity is provided separately.*\n\n`;
  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| Directive | 2013/53/EU (Recreational Craft) |\n`;
  md += `| Manufacturer | ${spec.general.manufacturer || settings.company_name} |\n`;
  md += `| Model | ${spec.general.model_name || config.boat_model} |\n`;
  md += `| CIN/WIN | ${spec.general.cin_win || '________________'} |\n`;
  md += `| Design Category | ${spec.general.design_category || 'C'} |\n`;
  md += `| Year | ${spec.general.year_of_build || year} |\n\n`;

  md += `## Annex B: Installed Equipment List\n\n`;
  const grouped = groupByCategory(includedItems);
  if (grouped.size > 0) {
    for (const [category, items] of grouped) {
      md += `### ${category}\n\n`;
      md += `| Equipment | Brand | Article No. | Qty |\n`;
      md += `|-----------|-------|-------------|-----|\n`;
      for (const item of items) {
        md += `| ${item.article.part_name} | ${item.article.brand || '-'} | ${item.article.manufacturer_article_no || '-'} | ${item.quantity} |\n`;
      }
      md += `\n`;
    }
  } else {
    md += `*Equipment list to be completed upon delivery.*\n\n`;
  }

  md += `## Annex C: Wiring Diagram\n\n`;
  md += `*Electrical wiring diagram provided separately.*\n\n`;
  md += `Location of diagram: ________________\n\n`;

  md += `## Annex D: General Arrangement Drawing\n\n`;
  md += `*General arrangement drawing provided separately.*\n\n`;

  md += `## Annex E: Warranty Information\n\n`;
  md += `### Warranty Coverage\n\n`;
  md += `${spec.general.manufacturer || settings.company_name} provides the following warranty coverage:\n\n`;
  md += `| Component | Warranty Period |\n`;
  md += `|-----------|----------------|\n`;
  md += `| Hull structure | 5 years |\n`;
  md += `| Deck and superstructure | 5 years |\n`;
  md += `| Propulsion system | 2 years |\n`;
  md += `| Electrical systems | 2 years |\n`;
  md += `| Equipment and accessories | 1 year or per manufacturer |\n\n`;

  md += `### Warranty Conditions\n\n`;
  md += `Warranty is valid under the following conditions:\n\n`;
  md += `- Vessel used for private recreational purposes only\n`;
  md += `- Regular maintenance performed as specified in this manual\n`;
  md += `- No unauthorized modifications made\n`;
  md += `- Original purchase documentation available\n`;
  md += `- Warranty registration completed\n\n`;

  md += `### Warranty Registration\n\n`;
  md += `| Owner Name | ________________ |\n`;
  md += `|------------|------------------|\n`;
  md += `| Purchase Date | ________________ |\n`;
  md += `| Dealer | ________________ |\n`;
  md += `| CIN/WIN | ${spec.general.cin_win || '________________'} |\n\n`;

  md += `## Annex F: Service Log\n\n`;
  md += `| Date | Hours/km | Service Performed | Technician |\n`;
  md += `|------|----------|-------------------|------------|\n`;
  md += `| | | | |\n`;
  md += `| | | | |\n`;
  md += `| | | | |\n`;
  md += `| | | | |\n`;
  md += `| | | | |\n\n`;

  md += `---\n\n`;
  md += `<div class="manual-footer">\n\n`;
  md += `*© ${year} ${spec.general.manufacturer || settings.company_name}. All rights reserved.*\n\n`;
  md += `*This Owner's Manual was generated in accordance with the requirements of Directive 2013/53/EU.*\n\n`;
  md += `*Document generated on ${generatedDate}*\n\n`;
  md += `**${settings.company_name}**\n`;
  md += `${settings.company_address}\n`;
  md += `${settings.company_phone} | ${settings.company_email}\n\n`;
  md += `</div>\n`;

  return md;
}

/**
 * Generate Technical File Summary (Enhanced)
 * @param config - The boat configuration with items
 * @param settings - Global company settings
 * @param vesselSpec - Optional vessel specification from ClientBoat (takes priority)
 */
export function generateEnhancedTechnicalFile(
  config: BoatConfiguration,
  settings: GlobalSettings,
  vesselSpec?: VesselSpecification
): string {
  const spec = getSpec(config, vesselSpec);
  const year = new Date().getFullYear();
  const generatedDate = formatEuroDate(new Date());
  const includedItems = config.items.filter(i => i.included);

  let md = '';

  md += `# TECHNICAL FILE\n\n`;
  md += `## (Technical Dossier per RCD 2013/53/EU)\n\n`;
  md += `---\n\n`;

  md += `## Document Control\n\n`;
  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| Document Number | TF-${(spec.general.model_name || config.boat_model).replace(/\s+/g, '')}-${year}-${Date.now().toString().slice(-6)} |\n`;
  md += `| Revision | 1.0 |\n`;
  md += `| Date | ${generatedDate} |\n`;
  md += `| Status | Draft |\n`;
  md += `| Prepared By | ${settings.company_name} |\n\n`;

  md += `---\n\n`;

  md += `## 1. Vessel Identification\n\n`;
  md += `| Parameter | Value |\n`;
  md += `|-----------|-------|\n`;
  md += `| Manufacturer | ${spec.general.manufacturer || settings.company_name} |\n`;
  md += `| Model Name | ${spec.general.model_name || config.boat_model} |\n`;
  md += `| CIN/WIN | ${spec.general.cin_win || '[TO BE ASSIGNED]'} |\n`;
  md += `| Year of Build | ${spec.general.year_of_build || year} |\n`;
  md += `| Design Category | ${spec.general.design_category || 'C'} |\n`;
  md += `| Vessel Type | ${capitalize(spec.general.vessel_type) || config.propulsion_type} |\n`;
  md += `| Intended Use | ${capitalize(spec.general.intended_use) || 'Leisure'} |\n\n`;

  md += `## 2. Principal Dimensions\n\n`;
  md += `| Parameter | Value |\n`;
  md += `|-----------|-------|\n`;
  md += `| Length Overall (LOA) | ${numUnit(spec.dimensions.length_overall_m, 'm')} |\n`;
  md += `| Beam | ${numUnit(spec.dimensions.beam_m, 'm')} |\n`;
  md += `| Draft | ${numUnit(spec.dimensions.draft_m, 'm')} |\n`;
  md += `| Light Craft Mass | ${numUnit(spec.dimensions.light_craft_mass_kg, 'kg')} |\n`;
  md += `| Maximum Load | ${numUnit(spec.dimensions.max_load_kg, 'kg')} |\n`;
  md += `| Maximum Persons | ${val(spec.safety.max_persons)} |\n`;
  md += `| Hull Material | ${val(spec.dimensions.hull_material)} |\n`;
  md += `| Deck Material | ${val(spec.dimensions.deck_material)} |\n`;
  md += `| Hull Type | ${capitalize(spec.dimensions.hull_type)} |\n\n`;

  md += `## 3. Propulsion System\n\n`;
  md += `| Parameter | Value |\n`;
  md += `|-----------|-------|\n`;
  md += `| Propulsion Type | ${capitalize(spec.propulsion.propulsion_type)} |\n`;
  md += `| Number of Motors | ${val(spec.propulsion.number_of_motors)} |\n`;
  md += `| Power per Motor | ${numUnit(spec.propulsion.power_per_motor_kw, 'kW')} |\n`;
  md += `| Fuel Type | ${capitalize(spec.propulsion.fuel_type)} |\n`;
  md += `| Max Speed | ${numUnit(spec.propulsion.max_speed_knots, 'knots')} |\n`;
  md += `| Cruising Speed | ${numUnit(spec.propulsion.cruising_speed_knots, 'knots')} |\n`;
  md += `| Range | ${numUnit(spec.propulsion.range_nm, 'nm')} |\n`;

  if (spec.propulsion.propulsion_type === 'electric' || spec.propulsion.propulsion_type === 'hybrid') {
    md += `\n### Electric System\n\n`;
    md += `| Parameter | Value |\n`;
    md += `|-----------|-------|\n`;
    md += `| Battery Capacity | ${numUnit(spec.propulsion.electric.battery_capacity_kwh, 'kWh')} |\n`;
    md += `| Battery Voltage | ${numUnit(spec.propulsion.electric.battery_voltage_v, 'V')} |\n`;
    md += `| Battery Chemistry | ${val(spec.propulsion.electric.battery_chemistry)} |\n`;
    md += `| Charging Methods | ${listItems(spec.propulsion.electric.charging_methods as string[])} |\n`;
    md += `| Max Charging Power | ${numUnit(spec.propulsion.electric.max_charging_power_kw, 'kW')} |\n`;
  }
  md += `\n`;

  md += `## 4. Systems Summary\n\n`;
  md += `| System | Installed | Notes |\n`;
  md += `|--------|-----------|-------|\n`;
  md += `| DC Electrical | ${val(spec.electrical_system.dc_system)} | ${spec.electrical_system.dc_voltage ? spec.electrical_system.dc_voltage + 'V' : ''} |\n`;
  md += `| AC Electrical | ${val(spec.electrical_system.ac_system)} | ${spec.electrical_system.ac_voltage ? spec.electrical_system.ac_voltage + 'V' : ''} |\n`;
  md += `| Shore Power | ${val(spec.electrical_system.shore_power_inlet)} | |\n`;
  md += `| Fuel System | ${val(spec.fuel_system.has_fuel_tank)} | ${spec.fuel_system.tank_capacity_l ? spec.fuel_system.tank_capacity_l + 'L' : ''} |\n`;
  md += `| Gas System | ${val(spec.gas_installation.has_gas_system)} | |\n`;
  md += `| Fresh Water | ${val(spec.water_waste.fresh_water_tank)} | ${spec.water_waste.fresh_water_capacity_l ? spec.water_waste.fresh_water_capacity_l + 'L' : ''} |\n`;
  md += `| Holding Tank | ${val(spec.water_waste.holding_tank)} | ${spec.water_waste.holding_tank_capacity_l ? spec.water_waste.holding_tank_capacity_l + 'L' : ''} |\n`;
  md += `| Toilet | ${capitalize(spec.water_waste.toilet_type) || 'None'} | |\n\n`;

  md += `## 5. Components List\n\n`;
  const grouped = groupByCategory(includedItems);
  if (grouped.size > 0) {
    for (const [category, items] of grouped) {
      md += `### ${category}\n\n`;
      md += `| Component | Brand | Article No. | Qty |\n`;
      md += `|-----------|-------|-------------|-----|\n`;
      for (const item of items) {
        md += `| ${item.article.part_name} | ${item.article.brand || '-'} | ${item.article.manufacturer_article_no || '-'} | ${item.quantity} |\n`;
      }
      md += `\n`;
    }
  }

  md += `## 6. Essential Requirements Checklist\n\n`;
  md += `| Requirement | Standard | Status | Evidence |\n`;
  md += `|-------------|----------|--------|----------|\n`;
  md += `| Hull construction | EN ISO 12215 | [ ] Verified | Design calculations |\n`;
  md += `| Stability & buoyancy | EN ISO 12217 | [ ] Verified | Stability assessment |\n`;
  md += `| Flooding & swamping | EN ISO 12217 | [ ] Verified | Flotation calculation |\n`;
  md += `| Structural openings | EN ISO 12216 | [ ] Verified | Component certificates |\n`;
  md += `| Cockpit draining | EN ISO 11812 | [ ] Verified | Design review |\n`;
  md += `| Electrical systems | EN ISO 13297 | [ ] Verified | Wiring diagram |\n`;
  if (spec.propulsion.propulsion_type === 'electric' || spec.propulsion.propulsion_type === 'hybrid') {
    md += `| Electric propulsion | EN ISO 16315 | [ ] Verified | System design |\n`;
  }
  if (spec.fuel_system.has_fuel_tank) {
    md += `| Fuel system | EN ISO 10088 | [ ] Verified | Installation inspection |\n`;
  }
  if (spec.gas_installation.has_gas_system) {
    md += `| LPG system | EN ISO 10239 | [ ] Verified | Gas test certificate |\n`;
  }
  md += `| Fire protection | EN ISO 9094 | [ ] Verified | Fire risk assessment |\n`;
  md += `| Navigation lights | COLREG | [ ] Verified | Light test |\n`;
  md += `| Anchor equipment | EN ISO 15085 | [ ] Verified | Installation check |\n`;
  md += `| Owner's manual | RCD Annex I.2.5 | [ ] Verified | Manual review |\n\n`;

  md += `## 7. Risk Assessment Summary\n\n`;
  md += `A full risk assessment has been conducted covering:\n\n`;
  md += `- [ ] Structural risks\n`;
  md += `- [ ] Stability and buoyancy\n`;
  md += `- [ ] Fire and explosion\n`;
  md += `- [ ] Electrical hazards\n`;
  if (spec.propulsion.propulsion_type === 'electric' || spec.propulsion.propulsion_type === 'hybrid') {
    md += `- [ ] High voltage hazards\n`;
  }
  if (spec.fuel_system.has_fuel_tank) {
    md += `- [ ] Fuel system hazards\n`;
  }
  if (spec.gas_installation.has_gas_system) {
    md += `- [ ] LPG hazards\n`;
  }
  md += `- [ ] Carbon monoxide\n`;
  md += `- [ ] Man overboard\n`;
  md += `- [ ] Collision\n`;
  md += `- [ ] Environmental impact\n\n`;
  md += `*Full risk assessment document available separately.*\n\n`;

  md += `## 8. Technical File Contents\n\n`;
  md += `The complete Technical File contains:\n\n`;
  md += `- [ ] This Technical File summary\n`;
  md += `- [ ] General arrangement drawings\n`;
  md += `- [ ] Lines plan\n`;
  md += `- [ ] Structural drawings\n`;
  md += `- [ ] Stability calculations\n`;
  md += `- [ ] Electrical schematics\n`;
  md += `- [ ] Component certificates\n`;
  md += `- [ ] Test reports\n`;
  md += `- [ ] Risk assessment\n`;
  md += `- [ ] Owner's manual\n`;
  md += `- [ ] Declaration of conformity\n`;
  md += `- [ ] Builder's plate design\n\n`;

  md += `---\n\n`;
  md += `*${settings.company_name} • ${settings.company_address}*\n`;
  md += `*Generated: ${generatedDate}*\n`;

  return md;
}
