/**
 * Document Generators for Navisol System
 */

import type { BoatConfiguration, ConfigurationItem, GlobalSettings, Quotation } from './types';
import {
  formatEuroCurrency,
  formatEuroDate,
  formatPercent,
  calculateLineTotal,
  calculateVAT,
  calculateTotalInclVAT,
  getDatePlusDays,
  generateQuotationNumber,
  generateId
} from './formatting';
import { CATEGORIES } from './categories';

// Group items by category
function groupItemsByCategory(items: ConfigurationItem[]): Map<string, ConfigurationItem[]> {
  const grouped = new Map<string, ConfigurationItem[]>();

  for (const item of items) {
    const category = item.article.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(item);
  }

  return grouped;
}

// Group items by category and subcategory
function groupItemsByCategoryAndSubcategory(items: ConfigurationItem[]): Map<string, Map<string, ConfigurationItem[]>> {
  const grouped = new Map<string, Map<string, ConfigurationItem[]>>();

  for (const item of items) {
    const category = item.article.category;
    const subcategory = item.article.subcategory;

    if (!grouped.has(category)) {
      grouped.set(category, new Map());
    }

    const catMap = grouped.get(category)!;
    if (!catMap.has(subcategory)) {
      catMap.set(subcategory, []);
    }
    catMap.get(subcategory)!.push(item);
  }

  return grouped;
}

/**
 * Generate Parts List (Internal) - Technical + pricing overview
 */
export function generatePartsList(config: BoatConfiguration, settings: GlobalSettings): string {
  const grouped = groupItemsByCategoryAndSubcategory(config.items.filter(i => i.included));

  let markdown = `# Parts List - ${config.name}\n\n`;
  markdown += `**Boat Model:** ${config.boat_model}  \n`;
  markdown += `**Propulsion:** ${config.propulsion_type}  \n`;
  markdown += `**Steering:** ${config.steering_type}  \n`;
  markdown += `**Date:** ${formatEuroDate(new Date())}  \n\n`;
  markdown += `---\n\n`;

  let grandTotal = 0;

  // Sort categories by their numeric prefix
  const sortedCategories = Array.from(grouped.keys()).sort();

  for (const category of sortedCategories) {
    const subcategories = grouped.get(category)!;
    let categoryTotal = 0;

    markdown += `## ${category}\n\n`;
    markdown += `| Subcategory | Part | Qty | Purchase € | Sales € | Margin % | Total € |\n`;
    markdown += `|-------------|------|-----|------------|---------|----------|--------|\n`;

    const sortedSubcategories = Array.from(subcategories.keys()).sort();

    for (const subcategory of sortedSubcategories) {
      const items = subcategories.get(subcategory)!;

      for (const item of items) {
        const { article, quantity } = item;
        const lineTotal = calculateLineTotal(article.sales_price_excl_vat, quantity, article.discount_percent);
        const margin = article.purchase_price_excl_vat > 0
          ? ((article.sales_price_excl_vat - article.purchase_price_excl_vat) / article.purchase_price_excl_vat) * 100
          : 0;

        categoryTotal += lineTotal;

        markdown += `| ${subcategory.replace(category.split(' ')[0] + ' ', '')} | ${article.part_name} | ${quantity} | ${formatEuroCurrency(article.purchase_price_excl_vat)} | ${formatEuroCurrency(article.sales_price_excl_vat)} | ${formatPercent(margin)} | ${formatEuroCurrency(lineTotal)} |\n`;
      }
    }

    markdown += `| **${category} Subtotal** | | | | | | **${formatEuroCurrency(categoryTotal)}** |\n\n`;
    grandTotal += categoryTotal;
  }

  markdown += `---\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `| Description | Amount |\n`;
  markdown += `|-------------|--------|\n`;
  markdown += `| **Subtotal (excl. VAT)** | **${formatEuroCurrency(grandTotal)}** |\n`;
  markdown += `| VAT ${formatPercent(settings.vat_rate * 100)} | ${formatEuroCurrency(calculateVAT(grandTotal, settings.vat_rate))} |\n`;
  markdown += `| **Total (incl. VAT)** | **${formatEuroCurrency(calculateTotalInclVAT(grandTotal, settings.vat_rate))}** |\n`;

  return markdown;
}

/**
 * Generate Equipment List (Customer) - Simplified overview without prices
 */
export function generateEquipmentList(config: BoatConfiguration): string {
  const standardItems = config.items.filter(i => i.article.standard_or_optional === 'Standard' && i.included);
  const optionalItems = config.items.filter(i => i.article.standard_or_optional === 'Optional' && i.included);

  let markdown = `# Equipment List\n\n`;
  markdown += `Thank you for considering Navisol. Below is the proposed equipment for the **${config.boat_model} ${config.propulsion_type}** configuration.\n\n`;
  markdown += `---\n\n`;

  // Standard Equipment
  if (standardItems.length > 0) {
    markdown += `## Standard Equipment\n\n`;
    const grouped = groupItemsByCategoryAndSubcategory(standardItems);

    for (const [category, subcategories] of grouped) {
      markdown += `### ${category}\n\n`;

      for (const [subcategory, items] of subcategories) {
        markdown += `**${subcategory.replace(category.split(' ')[0] + ' ', '')}**\n`;
        for (const item of items) {
          const qty = item.quantity > 1 ? ` (${item.quantity}x)` : '';
          const power = item.article.voltage_power ? ` - ${item.article.voltage_power}` : '';
          markdown += `- ${item.article.part_name}${power}${qty}\n`;
        }
        markdown += '\n';
      }
    }
  }

  // Optional Equipment
  if (optionalItems.length > 0) {
    markdown += `## Optional Equipment\n\n`;
    const grouped = groupItemsByCategoryAndSubcategory(optionalItems);

    for (const [category, subcategories] of grouped) {
      markdown += `### ${category}\n\n`;

      for (const [subcategory, items] of subcategories) {
        markdown += `**${subcategory.replace(category.split(' ')[0] + ' ', '')}**\n`;
        for (const item of items) {
          const qty = item.quantity > 1 ? ` (${item.quantity}x)` : '';
          markdown += `- ${item.article.part_name}${qty}\n`;
        }
        markdown += '\n';
      }
    }
  }

  markdown += `---\n\n`;
  markdown += `*For more information about specifications and options, please contact Navisol B.V.*\n`;

  return markdown;
}

/**
 * Generate Quotation (Sales / PDF-ready)
 */
export function generateQuotation(
  config: BoatConfiguration,
  settings: GlobalSettings,
  customerName?: string,
  customerAddress?: string,
  notes?: string
): { quotation: Quotation; markdown: string } {
  const includedItems = config.items.filter(i => i.included);

  let subtotal = 0;
  for (const item of includedItems) {
    subtotal += calculateLineTotal(item.article.sales_price_excl_vat, item.quantity, item.article.discount_percent);
  }

  const vatAmount = calculateVAT(subtotal, settings.vat_rate);
  const total = subtotal + vatAmount;

  const quotation: Quotation = {
    id: generateId(),
    quotation_number: generateQuotationNumber(),
    date: formatEuroDate(new Date()),
    valid_until: formatEuroDate(getDatePlusDays(settings.quotation_validity_days)),
    customer_name: customerName,
    customer_address: customerAddress,
    configuration: config,
    vat_rate: settings.vat_rate,
    delivery_terms: settings.delivery_terms,
    payment_terms: 'To be agreed',
    notes,
    subtotal_excl_vat: subtotal,
    vat_amount: vatAmount,
    total_incl_vat: total,
    status: 'draft',
  };

  // Generate Markdown
  let markdown = `# QUOTATION\n\n`;
  markdown += `---\n\n`;

  // Header
  markdown += `**${settings.company_name}**  \n`;
  markdown += `${settings.company_address}  \n`;
  markdown += `Tel: ${settings.company_phone}  \n\n`;

  markdown += `**Quotation Number:** ${quotation.quotation_number}  \n`;
  markdown += `**Date:** ${quotation.date}  \n`;
  markdown += `**Valid Until:** ${quotation.valid_until}  \n\n`;

  if (customerName) {
    markdown += `**Customer:** ${customerName}  \n`;
    if (customerAddress) {
      markdown += `${customerAddress}  \n`;
    }
    markdown += '\n';
  }

  markdown += `---\n\n`;
  markdown += `## ${config.boat_model} - ${config.propulsion_type} Configuration\n\n`;

  // Items table
  markdown += `| Description | Qty | Unit Price € | Total € |\n`;
  markdown += `|-------------|-----|--------------|--------|\n`;

  const grouped = groupItemsByCategory(includedItems);

  for (const [category, items] of grouped) {
    // Category header row
    markdown += `| **${category}** | | | |\n`;

    for (const item of items) {
      const lineTotal = calculateLineTotal(item.article.sales_price_excl_vat, item.quantity, item.article.discount_percent);
      markdown += `| ${item.article.part_name} | ${item.quantity} | ${formatEuroCurrency(item.article.sales_price_excl_vat)} | ${formatEuroCurrency(lineTotal)} |\n`;
    }
  }

  markdown += `\n---\n\n`;

  // Summary
  markdown += `## Summary\n\n`;
  markdown += `| | |\n`;
  markdown += `|---|---|\n`;
  markdown += `| **Subtotal (excl. VAT)** | **${formatEuroCurrency(subtotal)}** |\n`;
  markdown += `| VAT ${formatPercent(settings.vat_rate * 100)} | ${formatEuroCurrency(vatAmount)} |\n`;
  markdown += `| **Total Due (incl. VAT)** | **${formatEuroCurrency(total)}** |\n\n`;

  // Footer
  markdown += `---\n\n`;
  markdown += `**Terms and Conditions:**\n\n`;
  markdown += `- This quotation is valid until ${quotation.valid_until}.\n`;
  markdown += `- Delivery terms: ${settings.delivery_terms}.\n`;
  markdown += `- Payment terms: To be agreed.\n`;
  markdown += `- Warranty: According to Navisol conditions.\n`;

  if (notes) {
    markdown += `\n**Additional Notes:**\n\n${notes}\n`;
  }

  markdown += `\n---\n\n`;
  markdown += `*${settings.company_name} • ${settings.company_address} • ${settings.company_phone}*\n`;

  return { quotation, markdown };
}

/**
 * Compare two configurations
 */
export function compareConfigurations(
  configA: BoatConfiguration,
  configB: BoatConfiguration,
  settings: GlobalSettings
): string {
  const calcTotal = (config: BoatConfiguration) => {
    let total = 0;
    for (const item of config.items.filter(i => i.included)) {
      total += calculateLineTotal(item.article.sales_price_excl_vat, item.quantity, item.article.discount_percent);
    }
    return total;
  };

  const totalA = calcTotal(configA);
  const totalB = calcTotal(configB);
  const totalAIncl = calculateTotalInclVAT(totalA, settings.vat_rate);
  const totalBIncl = calculateTotalInclVAT(totalB, settings.vat_rate);

  const delta = totalB - totalA;
  const deltaPercent = totalA > 0 ? (delta / totalA) * 100 : 0;

  // Find key differences
  const itemsA = new Set(configA.items.filter(i => i.included).map(i => i.article.id));
  const itemsB = new Set(configB.items.filter(i => i.included).map(i => i.article.id));

  const onlyInA = configA.items.filter(i => i.included && !itemsB.has(i.article.id));
  const onlyInB = configB.items.filter(i => i.included && !itemsA.has(i.article.id));

  let markdown = `# Configuration Comparison\n\n`;
  markdown += `**${configA.name}** vs **${configB.name}**\n\n`;
  markdown += `---\n\n`;

  markdown += `## Cost Summary\n\n`;
  markdown += `| | ${configA.name} | ${configB.name} | Difference |\n`;
  markdown += `|---|---|---|---|\n`;
  markdown += `| Subtotal (excl. VAT) | ${formatEuroCurrency(totalA)} | ${formatEuroCurrency(totalB)} | ${formatEuroCurrency(delta)} |\n`;
  markdown += `| Total (incl. VAT) | ${formatEuroCurrency(totalAIncl)} | ${formatEuroCurrency(totalBIncl)} | ${formatEuroCurrency(totalBIncl - totalAIncl)} |\n`;
  markdown += `| Percentage Difference | | | ${delta >= 0 ? '+' : ''}${formatPercent(deltaPercent)} |\n\n`;

  markdown += `## Key Differences\n\n`;

  if (onlyInA.length > 0) {
    markdown += `### Only in ${configA.name}:\n`;
    for (const item of onlyInA) {
      markdown += `- ${item.article.part_name} (${formatEuroCurrency(item.article.sales_price_excl_vat)})\n`;
    }
    markdown += '\n';
  }

  if (onlyInB.length > 0) {
    markdown += `### Only in ${configB.name}:\n`;
    for (const item of onlyInB) {
      markdown += `- ${item.article.part_name} (${formatEuroCurrency(item.article.sales_price_excl_vat)})\n`;
    }
    markdown += '\n';
  }

  markdown += `---\n\n`;
  markdown += `*Comparison generated on ${formatEuroDate(new Date())}*\n`;

  return markdown;
}

/**
 * Generate CE Declaration of Conformity
 */
export function generateCEDeclaration(config: BoatConfiguration, settings: GlobalSettings): string {
  let markdown = `# EU DECLARATION OF CONFORMITY\n\n`;
  markdown += `## (Recreational Craft Directive 2013/53/EU)\n\n`;
  markdown += `---\n\n`;

  markdown += `### 1. Manufacturer\n\n`;
  markdown += `**${settings.company_name}**  \n`;
  markdown += `${settings.company_address}  \n`;
  markdown += `Tel: ${settings.company_phone}  \n\n`;

  markdown += `### 2. Product Identification\n\n`;
  markdown += `| Field | Value |\n`;
  markdown += `|-------|-------|\n`;
  markdown += `| Boat Model | ${config.boat_model} |\n`;
  markdown += `| Configuration | ${config.propulsion_type} |\n`;
  markdown += `| Hull Identification Number | [HIN TO BE ASSIGNED] |\n`;
  markdown += `| Year of Build | ${new Date().getFullYear()} |\n`;
  markdown += `| Design Category | C (Inshore) |\n\n`;

  markdown += `### 3. Applicable Directives\n\n`;
  markdown += `This declaration of conformity is issued under the sole responsibility of the manufacturer for the following directives:\n\n`;
  markdown += `- **2013/53/EU** - Recreational Craft Directive (RCD)\n`;
  markdown += `- **2014/30/EU** - Electromagnetic Compatibility (EMC)\n`;
  if (config.propulsion_type === 'Electric' || config.propulsion_type === 'Hybrid') {
    markdown += `- **2014/35/EU** - Low Voltage Directive (LVD)\n`;
  }
  markdown += `\n`;

  markdown += `### 4. Applied Standards\n\n`;
  markdown += `The following harmonised standards have been applied:\n\n`;
  markdown += `- EN ISO 12217-1 - Stability and buoyancy assessment\n`;
  markdown += `- EN ISO 12216 - Windows, portlights, hatches\n`;
  markdown += `- EN ISO 8849 - Direct current electrical systems\n`;
  if (config.propulsion_type === 'Electric' || config.propulsion_type === 'Hybrid') {
    markdown += `- EN ISO 16315 - Electric propulsion system\n`;
  }
  if (config.propulsion_type === 'Diesel' || config.propulsion_type === 'Hybrid') {
    markdown += `- EN ISO 10088 - Permanently installed fuel systems\n`;
  }
  markdown += `- EN ISO 11812 - Watertight cockpits and recesses\n`;
  markdown += `- EN ISO 15085 - Anchor equipment\n\n`;

  markdown += `### 5. Notified Body (if applicable)\n\n`;
  markdown += `Post-construction assessment performed by:  \n`;
  markdown += `[NOTIFIED BODY NAME]  \n`;
  markdown += `Notified Body Number: [XXXX]  \n\n`;

  markdown += `### 6. Declaration\n\n`;
  markdown += `We hereby declare that the recreational craft described above is in conformity with the relevant Union harmonisation legislation.\n\n`;

  markdown += `---\n\n`;
  markdown += `**Signed for and on behalf of:**  \n`;
  markdown += `${settings.company_name}  \n\n`;
  markdown += `**Name:** _________________________  \n`;
  markdown += `**Position:** _________________________  \n`;
  markdown += `**Date:** ${formatEuroDate(new Date())}  \n`;
  markdown += `**Place:** Elburg, The Netherlands  \n\n`;
  markdown += `**Signature:** _________________________  \n\n`;

  markdown += `---\n\n`;
  markdown += `*Document Reference: CE-${config.boat_model.replace(' ', '')}-${new Date().getFullYear()}-XXXX*\n`;

  return markdown;
}

/**
 * Generate Technical File Summary
 */
export function generateTechnicalFileSummary(config: BoatConfiguration, settings: GlobalSettings): string {
  let markdown = `# TECHNICAL FILE\n\n`;
  markdown += `## ${config.boat_model} - ${config.propulsion_type}\n\n`;
  markdown += `---\n\n`;

  markdown += `### Document Control\n\n`;
  markdown += `| Field | Value |\n`;
  markdown += `|-------|-------|\n`;
  markdown += `| Document Number | TF-${config.boat_model.replace(' ', '')}-${Date.now()} |\n`;
  markdown += `| Revision | 1.0 |\n`;
  markdown += `| Date | ${formatEuroDate(new Date())} |\n`;
  markdown += `| Status | Draft |\n`;
  markdown += `| Prepared By | ${settings.company_name} |\n\n`;

  markdown += `---\n\n`;

  markdown += `### 1. General Description\n\n`;
  markdown += `This technical file documents the design, construction, and conformity assessment of the ${config.boat_model} recreational craft with ${config.propulsion_type.toLowerCase()} propulsion system.\n\n`;

  markdown += `#### 1.1 Principal Dimensions\n\n`;
  markdown += `| Parameter | Value |\n`;
  markdown += `|-----------|-------|\n`;
  const modelSize = config.boat_model.match(/\d+/)?.[0] || '850';
  markdown += `| Length Overall (LOA) | ${(Number.parseInt(modelSize) / 100).toFixed(2)} m |\n`;
  markdown += `| Beam | [TO BE SPECIFIED] m |\n`;
  markdown += `| Draft | [TO BE SPECIFIED] m |\n`;
  markdown += `| Displacement | [TO BE SPECIFIED] kg |\n`;
  markdown += `| Design Category | C (Inshore) |\n`;
  markdown += `| Max Persons | [TO BE SPECIFIED] |\n\n`;

  markdown += `#### 1.2 Propulsion System\n\n`;
  markdown += `| Parameter | Value |\n`;
  markdown += `|-----------|-------|\n`;
  markdown += `| Type | ${config.propulsion_type} |\n`;

  const motors = config.items.filter(i => i.article.subcategory.includes('Motorisation') && i.included);
  for (const motor of motors) {
    markdown += `| Motor | ${motor.article.part_name} |\n`;
    if (motor.article.voltage_power) {
      markdown += `| Power/Voltage | ${motor.article.voltage_power} |\n`;
    }
  }
  markdown += `\n`;

  markdown += `---\n\n`;

  markdown += `### 2. Components List\n\n`;
  markdown += `The following certified components are installed:\n\n`;

  const grouped = groupItemsByCategory(config.items.filter(i => i.included));

  for (const [category, items] of grouped) {
    markdown += `#### ${category}\n\n`;
    markdown += `| Component | Brand | Article No. | Qty |\n`;
    markdown += `|-----------|-------|-------------|-----|\n`;

    for (const item of items) {
      markdown += `| ${item.article.part_name} | ${item.article.brand || '-'} | ${item.article.manufacturer_article_no || '-'} | ${item.quantity} |\n`;
    }
    markdown += '\n';
  }

  markdown += `---\n\n`;

  markdown += `### 3. Essential Requirements Checklist\n\n`;
  markdown += `| Requirement | Status | Evidence |\n`;
  markdown += `|-------------|--------|----------|\n`;
  markdown += `| Hull construction | [ ] Verified | Design calculations |\n`;
  markdown += `| Stability | [ ] Verified | ISO 12217-1 assessment |\n`;
  markdown += `| Buoyancy | [ ] Verified | Flotation calculation |\n`;
  markdown += `| Electrical systems | [ ] Verified | Wiring diagram |\n`;
  if (config.propulsion_type === 'Electric' || config.propulsion_type === 'Hybrid') {
    markdown += `| HV safety | [ ] Verified | HV system design |\n`;
  }
  if (config.propulsion_type === 'Diesel' || config.propulsion_type === 'Hybrid') {
    markdown += `| Fuel system | [ ] Verified | ISO 10088 compliance |\n`;
  }
  markdown += `| Fire protection | [ ] Verified | Fire risk assessment |\n`;
  markdown += `| Navigation lights | [ ] Verified | COLREG compliance |\n\n`;

  markdown += `---\n\n`;

  markdown += `### 4. Attachments\n\n`;
  markdown += `- [ ] General arrangement drawings\n`;
  markdown += `- [ ] Lines plan\n`;
  markdown += `- [ ] Stability calculations\n`;
  markdown += `- [ ] Electrical schematics\n`;
  markdown += `- [ ] Component certificates\n`;
  markdown += `- [ ] Owner's manual\n`;
  markdown += `- [ ] Declaration of conformity\n\n`;

  markdown += `---\n\n`;
  markdown += `*${settings.company_name} • ${settings.company_address}*\n`;

  return markdown;
}

/**
 * Generate Owner's Manual
 */
export function generateOwnersManual(config: BoatConfiguration, settings: GlobalSettings): string {
  const year = new Date().getFullYear();
  const modelSize = config.boat_model.match(/\d+/)?.[0] || '850';
  const lengthMeters = (Number.parseInt(modelSize) / 100).toFixed(2);

  let markdown = `# OWNER'S MANUAL\n\n`;
  markdown += `## ${config.boat_model} - ${config.propulsion_type}\n\n`;
  markdown += `---\n\n`;

  // Chapter 1: Introduction
  markdown += `# Chapter 1: Introduction\n\n`;
  markdown += `## 1.1 Welcome\n\n`;
  markdown += `Congratulations on your purchase of the **${config.boat_model}** from ${settings.company_name}. `;
  markdown += `This owner's manual contains important information about the safe operation, maintenance, and care of your vessel.\n\n`;
  markdown += `Please read this manual thoroughly before operating your boat for the first time. `;
  markdown += `Keep this manual aboard your vessel at all times for quick reference.\n\n`;

  markdown += `## 1.2 Manufacturer Information\n\n`;
  markdown += `| | |\n`;
  markdown += `|---|---|\n`;
  markdown += `| **Manufacturer** | ${settings.company_name} |\n`;
  markdown += `| **Address** | ${settings.company_address} |\n`;
  markdown += `| **Phone** | ${settings.company_phone} |\n`;
  markdown += `| **Website** | www.navisol.nl |\n\n`;

  markdown += `## 1.3 Vessel Identification\n\n`;
  markdown += `| Field | Value |\n`;
  markdown += `|-------|-------|\n`;
  markdown += `| Model | ${config.boat_model} |\n`;
  markdown += `| Propulsion Type | ${config.propulsion_type} |\n`;
  markdown += `| Steering System | ${config.steering_type} |\n`;
  markdown += `| Hull Identification Number (HIN) | _________________ |\n`;
  markdown += `| Year of Build | ${year} |\n`;
  markdown += `| CE Design Category | C (Inshore) |\n\n`;

  markdown += `---\n\n`;

  // Chapter 2: Specifications
  markdown += `# Chapter 2: Technical Specifications\n\n`;
  markdown += `## 2.1 Principal Dimensions\n\n`;
  markdown += `| Parameter | Value |\n`;
  markdown += `|-----------|-------|\n`;
  markdown += `| Length Overall (LOA) | ${lengthMeters} m |\n`;
  markdown += `| Beam | [See specification sheet] |\n`;
  markdown += `| Draft | [See specification sheet] |\n`;
  markdown += `| Displacement | [See specification sheet] |\n`;
  markdown += `| Fuel Capacity | ${config.propulsion_type === 'Diesel' || config.propulsion_type === 'Hybrid' ? '[See specification sheet]' : 'N/A (Electric)'} |\n`;
  markdown += `| Fresh Water Capacity | [See specification sheet] |\n`;
  markdown += `| Maximum Persons | [See Builder's Plate] |\n`;
  markdown += `| Maximum Load | [See Builder's Plate] |\n\n`;

  markdown += `## 2.2 Propulsion System\n\n`;
  if (config.propulsion_type === 'Electric') {
    markdown += `Your vessel is equipped with an **electric propulsion system**.\n\n`;
    markdown += `| Parameter | Value |\n`;
    markdown += `|-----------|-------|\n`;
    const motors = config.items.filter(i => i.included && i.article.subcategory.includes('Motorisation'));
    for (const motor of motors) {
      markdown += `| Motor | ${motor.article.part_name} |\n`;
      if (motor.article.voltage_power) {
        markdown += `| Power/Voltage | ${motor.article.voltage_power} |\n`;
      }
    }
    const batteries = config.items.filter(i => i.included && i.article.part_name.toLowerCase().includes('battery'));
    for (const battery of batteries) {
      markdown += `| Battery | ${battery.article.part_name} |\n`;
    }
    markdown += '\n';
  } else if (config.propulsion_type === 'Diesel') {
    markdown += `Your vessel is equipped with a **diesel propulsion system**.\n\n`;
    const motors = config.items.filter(i => i.included && i.article.subcategory.includes('Motorisation'));
    markdown += `| Parameter | Value |\n`;
    markdown += `|-----------|-------|\n`;
    for (const motor of motors) {
      markdown += `| Engine | ${motor.article.part_name} |\n`;
      if (motor.article.voltage_power) {
        markdown += `| Power | ${motor.article.voltage_power} |\n`;
      }
    }
    markdown += '\n';
  } else if (config.propulsion_type === 'Hybrid') {
    markdown += `Your vessel is equipped with a **hybrid propulsion system** combining electric and diesel power.\n\n`;
  }

  markdown += `---\n\n`;

  // Chapter 3: Safety
  markdown += `# Chapter 3: Safety Information\n\n`;
  markdown += `## 3.1 Important Safety Warnings\n\n`;
  markdown += `**WARNING:** Read all safety instructions before operating this vessel.\n\n`;
  markdown += `- Always wear a personal flotation device (PFD) when aboard\n`;
  markdown += `- Never operate the vessel under the influence of alcohol or drugs\n`;
  markdown += `- Check weather conditions before departure\n`;
  markdown += `- Inform someone of your travel plans\n`;
  markdown += `- Carry required safety equipment at all times\n`;
  markdown += `- Follow all local navigation rules and regulations\n\n`;

  if (config.propulsion_type === 'Electric' || config.propulsion_type === 'Hybrid') {
    markdown += `## 3.2 High Voltage Safety\n\n`;
    markdown += `**DANGER:** This vessel contains high voltage electrical systems.\n\n`;
    markdown += `- Never open battery compartments while underway\n`;
    markdown += `- Do not attempt repairs on the HV system yourself\n`;
    markdown += `- In case of HV system damage, activate emergency disconnect\n`;
    markdown += `- Contact authorized service personnel for all HV system maintenance\n\n`;
  }

  if (config.propulsion_type === 'Diesel' || config.propulsion_type === 'Hybrid') {
    markdown += `## 3.2 Fuel Safety\n\n`;
    markdown += `**WARNING:** Diesel fuel is flammable.\n\n`;
    markdown += `- Turn off engine before refueling\n`;
    markdown += `- No smoking during refueling\n`;
    markdown += `- Clean up any fuel spills immediately\n`;
    markdown += `- Check fuel lines regularly for leaks\n`;
    markdown += `- Ensure proper ventilation in engine compartment\n\n`;
  }

  markdown += `## 3.3 Required Safety Equipment\n\n`;
  const safetyItems = config.items.filter(i => i.included && i.article.category.includes('Safety'));
  if (safetyItems.length > 0) {
    markdown += `Your vessel is equipped with the following safety equipment:\n\n`;
    for (const item of safetyItems) {
      markdown += `- ${item.article.part_name} (${item.quantity}x)\n`;
    }
    markdown += '\n';
  }
  markdown += `Additionally, you should carry:\n\n`;
  markdown += `- Life jackets for all persons aboard\n`;
  markdown += `- First aid kit\n`;
  markdown += `- Signaling devices (whistle, flares)\n`;
  markdown += `- Navigation lights (operational)\n`;
  markdown += `- Anchor and anchor line\n`;
  markdown += `- VHF radio or means of communication\n\n`;

  markdown += `---\n\n`;

  // Chapter 4: Operation
  markdown += `# Chapter 4: Operation\n\n`;
  markdown += `## 4.1 Pre-Departure Checklist\n\n`;
  markdown += `Before each trip, verify the following:\n\n`;
  markdown += `- [ ] Check weather forecast\n`;
  markdown += `- [ ] Verify fuel/battery level\n`;
  markdown += `- [ ] Check engine oil level (diesel/hybrid)\n`;
  markdown += `- [ ] Inspect hull for damage\n`;
  markdown += `- [ ] Test navigation lights\n`;
  markdown += `- [ ] Check bilge pump operation\n`;
  markdown += `- [ ] Verify all safety equipment is aboard\n`;
  markdown += `- [ ] Check mooring lines and fenders\n`;
  markdown += `- [ ] Test steering response\n`;
  markdown += `- [ ] Check battery charge status\n\n`;

  markdown += `## 4.2 Starting the Engine\n\n`;
  if (config.propulsion_type === 'Electric') {
    markdown += `1. Turn on main battery switch\n`;
    markdown += `2. Check battery charge level on display\n`;
    markdown += `3. Turn ignition key to ON position\n`;
    markdown += `4. Verify all system indicators are normal\n`;
    markdown += `5. Engage forward or reverse gear\n`;
    markdown += `6. Increase throttle gradually\n\n`;
  } else if (config.propulsion_type === 'Diesel') {
    markdown += `1. Check engine oil and coolant levels\n`;
    markdown += `2. Turn on battery switch\n`;
    markdown += `3. Check fuel level\n`;
    markdown += `4. Turn ignition key to START position\n`;
    markdown += `5. Allow engine to warm up at idle\n`;
    markdown += `6. Check gauges for normal readings\n`;
    markdown += `7. Engage gear and proceed\n\n`;
  } else {
    markdown += `Refer to the hybrid system manual for specific starting procedures.\n\n`;
  }

  markdown += `## 4.3 Steering\n\n`;
  markdown += `Your vessel is equipped with **${config.steering_type} steering**.\n\n`;
  if (config.steering_type === 'Hydraulic') {
    markdown += `- Hydraulic steering provides smooth, responsive control\n`;
    markdown += `- Check hydraulic fluid level periodically\n`;
    markdown += `- Report any unusual resistance or noise\n\n`;
  }

  const bowThruster = config.items.find(i => i.included && i.article.part_name.toLowerCase().includes('bow thruster'));
  if (bowThruster) {
    markdown += `## 4.4 Bow Thruster Operation\n\n`;
    markdown += `Your vessel is equipped with: **${bowThruster.article.part_name}**\n\n`;
    markdown += `- Use bow thruster for low-speed maneuvering only\n`;
    markdown += `- Do not operate continuously for more than 30 seconds\n`;
    markdown += `- Allow cooling period between operations\n\n`;
  }

  markdown += `---\n\n`;

  // Chapter 5: Maintenance
  markdown += `# Chapter 5: Maintenance\n\n`;
  markdown += `## 5.1 Maintenance Schedule\n\n`;
  markdown += `| Interval | Task |\n`;
  markdown += `|----------|------|\n`;
  markdown += `| Before each use | Visual inspection, check bilge |\n`;
  markdown += `| Weekly | Clean vessel, check battery levels |\n`;
  markdown += `| Monthly | Check all fluid levels, inspect anodes |\n`;
  markdown += `| Annually | Full service, antifouling, winterization |\n\n`;

  markdown += `## 5.2 Hull Care\n\n`;
  markdown += `- Rinse hull with fresh water after each use in salt water\n`;
  markdown += `- Clean waterline regularly to prevent growth\n`;
  markdown += `- Inspect antifouling coating annually\n`;
  markdown += `- Check and replace sacrificial anodes as needed\n\n`;

  if (config.propulsion_type === 'Electric' || config.propulsion_type === 'Hybrid') {
    markdown += `## 5.3 Battery Care\n\n`;
    markdown += `- Keep batteries charged between 20% and 80% for optimal life\n`;
    markdown += `- Do not leave batteries fully discharged\n`;
    markdown += `- Use only approved chargers\n`;
    markdown += `- Check battery connections periodically\n`;
    markdown += `- Battery service: Contact authorized dealer only\n\n`;
  }

  markdown += `## 5.4 Winterization\n\n`;
  markdown += `Before winter storage:\n\n`;
  markdown += `- Clean and dry vessel thoroughly\n`;
  markdown += `- Drain water systems\n`;
  markdown += `- Charge batteries fully\n`;
  markdown += `- Disconnect battery switches\n`;
  markdown += `- Apply protective covers\n`;
  markdown += `- Store in dry, ventilated area\n\n`;

  markdown += `---\n\n`;

  // Chapter 6: Equipment List
  markdown += `# Chapter 6: Installed Equipment\n\n`;
  const grouped = groupItemsByCategoryAndSubcategory(config.items.filter(i => i.included));

  for (const [category, subcategories] of grouped) {
    markdown += `## ${category}\n\n`;
    for (const [subcategory, items] of subcategories) {
      markdown += `### ${subcategory}\n\n`;
      for (const item of items) {
        const brand = item.article.brand ? ` (${item.article.brand})` : '';
        markdown += `- ${item.article.part_name}${brand}${item.quantity > 1 ? ` - ${item.quantity}x` : ''}\n`;
      }
      markdown += '\n';
    }
  }

  markdown += `---\n\n`;

  // Chapter 7: Troubleshooting
  markdown += `# Chapter 7: Troubleshooting\n\n`;
  markdown += `| Problem | Possible Cause | Solution |\n`;
  markdown += `|---------|----------------|----------|\n`;
  markdown += `| Engine won't start | Low battery | Charge battery or check connections |\n`;
  markdown += `| Engine won't start | Main switch off | Turn on main battery switch |\n`;
  markdown += `| Poor performance | Fouled propeller | Clean propeller |\n`;
  markdown += `| Poor performance | Fouled hull | Clean hull bottom |\n`;
  markdown += `| Bilge alarm | Water ingress | Check seacocks and hose connections |\n`;
  markdown += `| Steering heavy | Low hydraulic fluid | Check and refill hydraulic fluid |\n`;
  markdown += `| Navigation lights out | Blown fuse | Check and replace fuse |\n\n`;

  markdown += `For problems not listed here, contact ${settings.company_name} or your authorized dealer.\n\n`;

  markdown += `---\n\n`;

  // Chapter 8: Warranty
  markdown += `# Chapter 8: Warranty Information\n\n`;
  markdown += `## 8.1 Warranty Coverage\n\n`;
  markdown += `${settings.company_name} provides the following warranty coverage:\n\n`;
  markdown += `| Component | Warranty Period |\n`;
  markdown += `|-----------|----------------|\n`;
  markdown += `| Hull structure | 5 years |\n`;
  markdown += `| Deck and superstructure | 5 years |\n`;
  markdown += `| Propulsion system | 2 years |\n`;
  markdown += `| Electrical systems | 2 years |\n`;
  markdown += `| Equipment and accessories | 1 year |\n\n`;

  markdown += `## 8.2 Warranty Conditions\n\n`;
  markdown += `Warranty is valid under the following conditions:\n\n`;
  markdown += `- Vessel used for private recreational purposes only\n`;
  markdown += `- Regular maintenance performed as specified\n`;
  markdown += `- No unauthorized modifications made\n`;
  markdown += `- Original purchase documentation available\n\n`;

  markdown += `## 8.3 Contact Information\n\n`;
  markdown += `For warranty claims or service inquiries:\n\n`;
  markdown += `**${settings.company_name}**  \n`;
  markdown += `${settings.company_address}  \n`;
  markdown += `Tel: ${settings.company_phone}  \n\n`;

  markdown += `---\n\n`;
  markdown += `*© ${year} ${settings.company_name}. All rights reserved.*  \n`;
  markdown += `*Document generated on ${formatEuroDate(new Date())}*\n`;

  return markdown;
}
