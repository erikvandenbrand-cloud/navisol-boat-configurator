// LocalStorage Persistence for Navisol System

import type { Article, BoatConfiguration, CEDocument, GlobalSettings } from './types';

const STORAGE_KEYS = {
  ARTICLES: 'navisol_articles',
  CONFIGURATIONS: 'navisol_configurations',
  CE_DOCUMENTS: 'navisol_ce_documents',
  SETTINGS: 'navisol_settings',
  QUOTATION_COUNTER: 'navisol_quotation_counter',
};

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

// Save articles to localStorage
export function saveArticles(articles: Article[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
  } catch (error) {
    console.error('Failed to save articles:', error);
  }
}

// Load articles from localStorage
export function loadArticles(): Article[] | null {
  if (!isBrowser) return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ARTICLES);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load articles:', error);
    return null;
  }
}

// Save configurations to localStorage
export function saveConfigurations(configurations: BoatConfiguration[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIGURATIONS, JSON.stringify(configurations));
  } catch (error) {
    console.error('Failed to save configurations:', error);
  }
}

// Load configurations from localStorage
export function loadConfigurations(): BoatConfiguration[] | null {
  if (!isBrowser) return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIGURATIONS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load configurations:', error);
    return null;
  }
}

// Save CE documents to localStorage
export function saveCEDocuments(documents: CEDocument[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.CE_DOCUMENTS, JSON.stringify(documents));
  } catch (error) {
    console.error('Failed to save CE documents:', error);
  }
}

// Load CE documents from localStorage
export function loadCEDocuments(): CEDocument[] | null {
  if (!isBrowser) return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CE_DOCUMENTS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load CE documents:', error);
    return null;
  }
}

// Save settings to localStorage
export function saveSettings(settings: GlobalSettings): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Load settings from localStorage
export function loadSettings(): GlobalSettings | null {
  if (!isBrowser) return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return null;
  }
}

// Get and increment quotation counter
export function getNextQuotationNumber(): string {
  if (!isBrowser) return `QT-${new Date().getFullYear()}-0001`;

  try {
    const year = new Date().getFullYear();
    const key = `${STORAGE_KEYS.QUOTATION_COUNTER}_${year}`;
    const current = Number.parseInt(localStorage.getItem(key) || '0', 10);
    const next = current + 1;
    localStorage.setItem(key, next.toString());
    return `QT-${year}-${next.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Failed to get quotation number:', error);
    return `QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }
}

// Export data to JSON file
export function exportData(): string {
  if (!isBrowser) return '';

  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    articles: loadArticles() || [],
    configurations: loadConfigurations() || [],
    ceDocuments: loadCEDocuments() || [],
    settings: loadSettings(),
  };

  return JSON.stringify(data, null, 2);
}

// Import data from JSON
export function importData(jsonString: string): {
  articles?: Article[];
  configurations?: BoatConfiguration[];
  ceDocuments?: CEDocument[];
  settings?: GlobalSettings;
} | null {
  try {
    const data = JSON.parse(jsonString);
    return {
      articles: data.articles,
      configurations: data.configurations,
      ceDocuments: data.ceDocuments,
      settings: data.settings,
    };
  } catch (error) {
    console.error('Failed to import data:', error);
    return null;
  }
}

// Export articles to CSV
export function exportArticlesToCSV(articles: Article[]): string {
  const headers = [
    'part_name',
    'category',
    'subcategory',
    'brand',
    'manufacturer_article_no',
    'supplier',
    'purchase_price_excl_vat',
    'sales_price_excl_vat',
    'quantity_unit',
    'stock_qty',
    'min_stock_level',
    'electric_compatible',
    'diesel_compatible',
    'hybrid_compatible',
    'standard_or_optional',
    'boat_model_compat',
  ];

  const rows = articles.map(article => [
    article.part_name,
    article.category,
    article.subcategory,
    article.brand || '',
    article.manufacturer_article_no || '',
    article.supplier || '',
    article.purchase_price_excl_vat.toString(),
    article.sales_price_excl_vat.toString(),
    article.quantity_unit,
    article.stock_qty.toString(),
    article.min_stock_level.toString(),
    article.electric_compatible ? 'true' : 'false',
    article.diesel_compatible ? 'true' : 'false',
    article.hybrid_compatible ? 'true' : 'false',
    article.standard_or_optional,
    article.boat_model_compat.join(';'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

// Parse CSV to articles
export function parseCSVToArticles(csv: string): Partial<Article>[] {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const articles: Partial<Article>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const article: Partial<Article> = {};

    headers.forEach((header, index) => {
      const value = values[index]?.replace(/"/g, '').trim() || '';

      switch (header) {
        case 'part_name':
          article.part_name = value;
          break;
        case 'category':
          article.category = value;
          article.parts_list_category = value;
          break;
        case 'subcategory':
          article.subcategory = value;
          article.parts_list_subcategory = value;
          break;
        case 'brand':
          article.brand = value;
          break;
        case 'manufacturer_article_no':
          article.manufacturer_article_no = value;
          break;
        case 'supplier':
          article.supplier = value;
          break;
        case 'purchase_price_excl_vat':
          article.purchase_price_excl_vat = Number.parseFloat(value) || 0;
          break;
        case 'sales_price_excl_vat':
          article.sales_price_excl_vat = Number.parseFloat(value) || 0;
          break;
        case 'quantity_unit':
          article.quantity_unit = value as Article['quantity_unit'];
          break;
        case 'stock_qty':
          article.stock_qty = Number.parseInt(value) || 0;
          break;
        case 'min_stock_level':
          article.min_stock_level = Number.parseInt(value) || 0;
          break;
        case 'electric_compatible':
          article.electric_compatible = value.toLowerCase() === 'true';
          break;
        case 'diesel_compatible':
          article.diesel_compatible = value.toLowerCase() === 'true';
          break;
        case 'hybrid_compatible':
          article.hybrid_compatible = value.toLowerCase() === 'true';
          break;
        case 'standard_or_optional':
          article.standard_or_optional = value as Article['standard_or_optional'];
          break;
        case 'boat_model_compat':
          article.boat_model_compat = value.split(';').filter(Boolean) as Article['boat_model_compat'];
          break;
      }
    });

    article.currency = 'EUR';
    if (article.part_name) {
      articles.push(article);
    }
  }

  return articles;
}

// Helper to parse CSV line with proper quote handling
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// Clear all stored data
export function clearAllData(): void {
  if (!isBrowser) return;

  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
