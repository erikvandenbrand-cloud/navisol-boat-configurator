/**
 * Pricing Service - v4
 * Centralized pricing calculations
 */

import type { ConfigurationItem, ProjectConfiguration } from '@/domain/models';

// ============================================
// CONSTANTS
// ============================================

export const VAT_RATES = {
  NETHERLANDS: 21,
  GERMANY: 19,
  BELGIUM: 21,
  FRANCE: 20,
  UK: 20,
} as const;

export const DEFAULT_VAT_RATE = VAT_RATES.NETHERLANDS;

// ============================================
// LINE CALCULATIONS
// ============================================

/**
 * Calculate line total excluding VAT
 */
export function calculateLineTotalExclVat(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * Calculate line total including VAT
 */
export function calculateLineTotalInclVat(
  quantity: number,
  unitPrice: number,
  vatRate: number = DEFAULT_VAT_RATE
): number {
  const exclVat = calculateLineTotalExclVat(quantity, unitPrice);
  return Math.round(exclVat * (1 + vatRate / 100) * 100) / 100;
}

// ============================================
// SUBTOTAL CALCULATIONS
// ============================================

/**
 * Calculate subtotal from configuration items
 */
export function calculateSubtotalExclVat(items: ConfigurationItem[]): number {
  return items
    .filter((item) => item.isIncluded)
    .reduce((sum, item) => sum + item.lineTotalExclVat, 0);
}

/**
 * Calculate discount amount
 */
export function calculateDiscountAmount(subtotal: number, discountPercent?: number): number {
  if (!discountPercent || discountPercent <= 0) return 0;
  return Math.round(subtotal * (discountPercent / 100) * 100) / 100;
}

/**
 * Calculate total excluding VAT (after discount)
 */
export function calculateTotalExclVat(subtotal: number, discountAmount: number): number {
  return Math.round((subtotal - discountAmount) * 100) / 100;
}

/**
 * Calculate VAT amount
 */
export function calculateVatAmount(totalExclVat: number, vatRate: number = DEFAULT_VAT_RATE): number {
  return Math.round(totalExclVat * (vatRate / 100) * 100) / 100;
}

/**
 * Calculate total including VAT
 */
export function calculateTotalInclVat(totalExclVat: number, vatAmount: number): number {
  return Math.round((totalExclVat + vatAmount) * 100) / 100;
}

// ============================================
// FULL CONFIGURATION PRICING
// ============================================

export interface ConfigurationPricing {
  subtotalExclVat: number;
  discountPercent?: number;
  discountAmount?: number;
  totalExclVat: number;
  vatRate: number;
  vatAmount: number;
  totalInclVat: number;
}

/**
 * Calculate all pricing totals for a configuration
 */
export function calculateConfigurationPricing(
  items: ConfigurationItem[],
  discountPercent?: number,
  vatRate: number = DEFAULT_VAT_RATE
): ConfigurationPricing {
  const subtotalExclVat = calculateSubtotalExclVat(items);
  const discountAmount = calculateDiscountAmount(subtotalExclVat, discountPercent);
  const totalExclVat = calculateTotalExclVat(subtotalExclVat, discountAmount);
  const vatAmount = calculateVatAmount(totalExclVat, vatRate);
  const totalInclVat = calculateTotalInclVat(totalExclVat, vatAmount);

  return {
    subtotalExclVat,
    discountPercent,
    discountAmount,
    totalExclVat,
    vatRate,
    vatAmount,
    totalInclVat,
  };
}

/**
 * Recalculate all line totals and configuration totals
 */
export function recalculateConfiguration(
  configuration: ProjectConfiguration
): ProjectConfiguration {
  // Recalculate line totals
  const items = configuration.items.map((item) => ({
    ...item,
    lineTotalExclVat: calculateLineTotalExclVat(item.quantity, item.unitPriceExclVat),
  }));

  // Calculate totals
  const pricing = calculateConfigurationPricing(
    items,
    configuration.discountPercent,
    configuration.vatRate
  );

  return {
    ...configuration,
    items,
    ...pricing,
  };
}

// ============================================
// MARGIN CALCULATIONS
// ============================================

/**
 * Calculate margin percentage
 */
export function calculateMarginPercent(sellingPrice: number, costPrice: number): number {
  if (sellingPrice === 0) return 0;
  return Math.round(((sellingPrice - costPrice) / sellingPrice) * 100 * 100) / 100;
}

/**
 * Calculate markup percentage
 */
export function calculateMarkupPercent(sellingPrice: number, costPrice: number): number {
  if (costPrice === 0) return 0;
  return Math.round(((sellingPrice - costPrice) / costPrice) * 100 * 100) / 100;
}

/**
 * Apply markup to cost price
 */
export function applyMarkup(costPrice: number, markupPercent: number): number {
  return Math.round(costPrice * (1 + markupPercent / 100) * 100) / 100;
}

/**
 * Apply margin to get selling price from cost
 */
export function applyMargin(costPrice: number, marginPercent: number): number {
  if (marginPercent >= 100) return costPrice; // Invalid margin
  return Math.round((costPrice / (1 - marginPercent / 100)) * 100) / 100;
}

// ============================================
// FORMATTING
// ============================================

/**
 * Format currency for display
 */
export function formatCurrency(
  value: number,
  currency: string = 'EUR',
  locale: string = 'nl-NL'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
