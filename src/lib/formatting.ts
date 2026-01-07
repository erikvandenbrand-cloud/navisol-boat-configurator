// European Currency and Number Formatting Utilities

/**
 * Format a number as European currency (€ XX.XXX,YY)
 * Uses dot as thousand separator and comma as decimal separator
 */
export function formatEuroCurrency(value: number): string {
  // Round to 2 decimal places (half away from zero)
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;

  // Format with European locale
  const formatted = rounded.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `€ ${formatted}`;
}

/**
 * Format number with European formatting (XX.XXX,YY)
 */
export function formatEuroNumber(value: number, decimals = 2): string {
  const rounded = Math.round((value + Number.EPSILON) * (10 ** decimals)) / (10 ** decimals);

  return rounded.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Parse European formatted number string to number
 */
export function parseEuroNumber(value: string): number {
  // Remove currency symbol and spaces
  const cleaned = value.replace(/[€\s]/g, '');
  // Replace dot (thousand sep) with nothing, comma (decimal) with dot
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  return Number.parseFloat(normalized) || 0;
}

/**
 * Format date as DD-MM-YYYY (European format)
 */
export function formatEuroDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Get date X days from now
 */
export function getDatePlusDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Calculate net unit price after discount
 */
export function calculateNetUnitPrice(salesPrice: number, discountPercent?: number): number {
  const discount = discountPercent || 0;
  return salesPrice * (1 - discount / 100);
}

/**
 * Calculate sales price from purchase price and margin
 */
export function calculateSalesPriceFromMargin(purchasePrice: number, marginPercent: number): number {
  return purchasePrice * (1 + marginPercent / 100);
}

/**
 * Calculate line total
 */
export function calculateLineTotal(unitPrice: number, quantity: number, discountPercent?: number): number {
  const netUnit = calculateNetUnitPrice(unitPrice, discountPercent);
  return netUnit * quantity;
}

/**
 * Calculate VAT amount
 */
export function calculateVAT(subtotal: number, vatRate = 0.21): number {
  return subtotal * vatRate;
}

/**
 * Calculate total including VAT
 */
export function calculateTotalInclVAT(subtotal: number, vatRate = 0.21): number {
  return subtotal + calculateVAT(subtotal, vatRate);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${formatEuroNumber(value, 1)}%`;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate quotation number
 */
export function generateQuotationNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `QT-${year}-${random}`;
}
