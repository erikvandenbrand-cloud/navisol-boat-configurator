/**
 * Settings Service - v4
 * Manages application settings including company info, VAT defaults, and terms
 */

import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { getAdapter } from '@/data/persistence';

// ============================================
// TYPES
// ============================================

export interface CompanyInfo {
  name: string;
  legalName?: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  vatNumber: string;
  chamberOfCommerce: string; // KvK number
  iban?: string;
  bic?: string;
  logoUrl?: string;
}

export interface VATSettings {
  defaultRate: number; // 21% in Netherlands
  reducedRate: number; // 9% for certain goods
  zeroRate: boolean; // For exports
}

export interface CostEstimationSettings {
  defaultRatio: number; // Default 0.6 (60% of sell price)
  warnThreshold: number; // Warn if estimated costs exceed this % of total (e.g., 0.3 = 30%)
}

export interface PaymentTerms {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

export interface DeliveryTerms {
  id: string;
  name: string;
  description: string;
  estimatedWeeks?: number;
  isDefault: boolean;
}

export interface AppSettings {
  id: string;
  company: CompanyInfo;
  vat: VATSettings;
  costEstimation: CostEstimationSettings;
  paymentTerms: PaymentTerms[];
  deliveryTerms: DeliveryTerms[];
  quoteValidityDays: number;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// DEFAULTS
// ============================================

const DEFAULT_COMPANY: CompanyInfo = {
  name: 'Eagle Boats',
  legalName: 'Eagle Boats B.V.',
  street: 'Industriestraat 25',
  postalCode: '8081HH',
  city: 'Elburg',
  country: 'Netherlands',
  phone: '+31 (0)85 0600 139',
  email: 'info@eagleboats.nl',
  website: 'www.eagleboats.nl',
  vatNumber: 'NL123456789B01',
  chamberOfCommerce: '12345678',
  iban: 'NL00ABNA0123456789',
  bic: 'ABNANL2A',
};

const DEFAULT_VAT: VATSettings = {
  defaultRate: 21,
  reducedRate: 9,
  zeroRate: true,
};

const DEFAULT_COST_ESTIMATION: CostEstimationSettings = {
  defaultRatio: 0.6, // 60% of sell price
  warnThreshold: 0.3, // Warn if >30% of BOM is estimated
};

const DEFAULT_PAYMENT_TERMS: PaymentTerms[] = [
  {
    id: 'pt-1',
    name: '30% / 40% / 30%',
    description: '30% upon order confirmation, 40% upon hull completion, 30% upon delivery',
    isDefault: true,
  },
  {
    id: 'pt-2',
    name: '50% / 50%',
    description: '50% upon order confirmation, 50% upon delivery',
    isDefault: false,
  },
  {
    id: 'pt-3',
    name: '100% upon delivery',
    description: 'Full payment upon delivery',
    isDefault: false,
  },
  {
    id: 'pt-4',
    name: 'Net 30',
    description: 'Payment due within 30 days of invoice date',
    isDefault: false,
  },
];

const DEFAULT_DELIVERY_TERMS: DeliveryTerms[] = [
  {
    id: 'dt-1',
    name: 'Ex Works Elburg',
    description: 'Ex Works (EXW) - Buyer arranges collection from our facility in Elburg',
    isDefault: true,
  },
  {
    id: 'dt-2',
    name: 'Delivered to Marina',
    description: 'Delivery to designated marina within Netherlands (additional fee may apply)',
    estimatedWeeks: 1,
    isDefault: false,
  },
  {
    id: 'dt-3',
    name: 'Sea Trial Included',
    description: 'Delivery includes sea trial with owner at our facility',
    isDefault: false,
  },
  {
    id: 'dt-4',
    name: 'International Shipping',
    description: 'FOB Rotterdam - International shipping arrangement',
    estimatedWeeks: 2,
    isDefault: false,
  },
];

// ============================================
// REPOSITORY
// ============================================

const NAMESPACE = 'settings';
const SETTINGS_ID = 'app-settings';

const SettingsRepository = {
  async get(): Promise<AppSettings | null> {
    const adapter = getAdapter();
    return adapter.getById<AppSettings>(NAMESPACE, SETTINGS_ID);
  },

  async save(settings: AppSettings): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NAMESPACE, settings);
  },
};

// ============================================
// SERVICE
// ============================================

export const SettingsService = {
  /**
   * Get current settings, initializing defaults if none exist
   */
  async getSettings(): Promise<AppSettings> {
    let settings = await SettingsRepository.get();

    if (!settings) {
      settings = await this.initializeDefaults();
    }

    return settings;
  },

  /**
   * Initialize settings with defaults
   */
  async initializeDefaults(): Promise<AppSettings> {
    const settings: AppSettings = {
      id: SETTINGS_ID,
      company: DEFAULT_COMPANY,
      vat: DEFAULT_VAT,
      costEstimation: DEFAULT_COST_ESTIMATION,
      paymentTerms: DEFAULT_PAYMENT_TERMS,
      deliveryTerms: DEFAULT_DELIVERY_TERMS,
      quoteValidityDays: 30,
      defaultCurrency: 'EUR',
      createdAt: now(),
      updatedAt: now(),
    };

    await SettingsRepository.save(settings);
    return settings;
  },

  /**
   * Update company info
   */
  async updateCompany(company: Partial<CompanyInfo>): Promise<Result<AppSettings, string>> {
    const settings = await this.getSettings();

    const updated: AppSettings = {
      ...settings,
      company: { ...settings.company, ...company },
      updatedAt: now(),
    };

    await SettingsRepository.save(updated);
    return Ok(updated);
  },

  /**
   * Update VAT settings
   */
  async updateVAT(vat: Partial<VATSettings>): Promise<Result<AppSettings, string>> {
    const settings = await this.getSettings();

    const updated: AppSettings = {
      ...settings,
      vat: { ...settings.vat, ...vat },
      updatedAt: now(),
    };

    await SettingsRepository.save(updated);
    return Ok(updated);
  },

  /**
   * Add a payment term
   */
  async addPaymentTerm(term: Omit<PaymentTerms, 'id'>): Promise<Result<PaymentTerms, string>> {
    const settings = await this.getSettings();

    const newTerm: PaymentTerms = {
      ...term,
      id: generateUUID(),
    };

    // If this is set as default, unset others
    const updatedTerms = term.isDefault
      ? settings.paymentTerms.map((t) => ({ ...t, isDefault: false }))
      : [...settings.paymentTerms];

    updatedTerms.push(newTerm);

    await SettingsRepository.save({
      ...settings,
      paymentTerms: updatedTerms,
      updatedAt: now(),
    });

    return Ok(newTerm);
  },

  /**
   * Update a payment term
   */
  async updatePaymentTerm(
    id: string,
    updates: Partial<Omit<PaymentTerms, 'id'>>
  ): Promise<Result<PaymentTerms, string>> {
    const settings = await this.getSettings();
    const termIndex = settings.paymentTerms.findIndex((t) => t.id === id);

    if (termIndex === -1) {
      return Err('Payment term not found');
    }

    const updatedTerm: PaymentTerms = {
      ...settings.paymentTerms[termIndex],
      ...updates,
    };

    // If this is set as default, unset others
    let updatedTerms = [...settings.paymentTerms];
    if (updates.isDefault) {
      updatedTerms = updatedTerms.map((t) => ({ ...t, isDefault: false }));
    }
    updatedTerms[termIndex] = updatedTerm;

    await SettingsRepository.save({
      ...settings,
      paymentTerms: updatedTerms,
      updatedAt: now(),
    });

    return Ok(updatedTerm);
  },

  /**
   * Delete a payment term
   */
  async deletePaymentTerm(id: string): Promise<Result<void, string>> {
    const settings = await this.getSettings();
    const term = settings.paymentTerms.find((t) => t.id === id);

    if (!term) {
      return Err('Payment term not found');
    }

    if (term.isDefault && settings.paymentTerms.length > 1) {
      return Err('Cannot delete the default payment term. Set another term as default first.');
    }

    await SettingsRepository.save({
      ...settings,
      paymentTerms: settings.paymentTerms.filter((t) => t.id !== id),
      updatedAt: now(),
    });

    return Ok(undefined);
  },

  /**
   * Add a delivery term
   */
  async addDeliveryTerm(term: Omit<DeliveryTerms, 'id'>): Promise<Result<DeliveryTerms, string>> {
    const settings = await this.getSettings();

    const newTerm: DeliveryTerms = {
      ...term,
      id: generateUUID(),
    };

    // If this is set as default, unset others
    const updatedTerms = term.isDefault
      ? settings.deliveryTerms.map((t) => ({ ...t, isDefault: false }))
      : [...settings.deliveryTerms];

    updatedTerms.push(newTerm);

    await SettingsRepository.save({
      ...settings,
      deliveryTerms: updatedTerms,
      updatedAt: now(),
    });

    return Ok(newTerm);
  },

  /**
   * Update a delivery term
   */
  async updateDeliveryTerm(
    id: string,
    updates: Partial<Omit<DeliveryTerms, 'id'>>
  ): Promise<Result<DeliveryTerms, string>> {
    const settings = await this.getSettings();
    const termIndex = settings.deliveryTerms.findIndex((t) => t.id === id);

    if (termIndex === -1) {
      return Err('Delivery term not found');
    }

    const updatedTerm: DeliveryTerms = {
      ...settings.deliveryTerms[termIndex],
      ...updates,
    };

    // If this is set as default, unset others
    let updatedTerms = [...settings.deliveryTerms];
    if (updates.isDefault) {
      updatedTerms = updatedTerms.map((t) => ({ ...t, isDefault: false }));
    }
    updatedTerms[termIndex] = updatedTerm;

    await SettingsRepository.save({
      ...settings,
      deliveryTerms: updatedTerms,
      updatedAt: now(),
    });

    return Ok(updatedTerm);
  },

  /**
   * Delete a delivery term
   */
  async deleteDeliveryTerm(id: string): Promise<Result<void, string>> {
    const settings = await this.getSettings();
    const term = settings.deliveryTerms.find((t) => t.id === id);

    if (!term) {
      return Err('Delivery term not found');
    }

    if (term.isDefault && settings.deliveryTerms.length > 1) {
      return Err('Cannot delete the default delivery term. Set another term as default first.');
    }

    await SettingsRepository.save({
      ...settings,
      deliveryTerms: settings.deliveryTerms.filter((t) => t.id !== id),
      updatedAt: now(),
    });

    return Ok(undefined);
  },

  /**
   * Update quote validity days
   */
  async updateQuoteValidityDays(days: number): Promise<Result<AppSettings, string>> {
    if (days < 1 || days > 365) {
      return Err('Quote validity must be between 1 and 365 days');
    }

    const settings = await this.getSettings();

    const updated: AppSettings = {
      ...settings,
      quoteValidityDays: days,
      updatedAt: now(),
    };

    await SettingsRepository.save(updated);
    return Ok(updated);
  },

  /**
   * Get default payment terms text
   */
  async getDefaultPaymentTerms(): Promise<string> {
    const settings = await this.getSettings();
    const defaultTerm = settings.paymentTerms.find((t) => t.isDefault);
    return defaultTerm?.description || settings.paymentTerms[0]?.description || 'Payment upon delivery';
  },

  /**
   * Get default delivery terms text
   */
  async getDefaultDeliveryTerms(): Promise<string> {
    const settings = await this.getSettings();
    const defaultTerm = settings.deliveryTerms.find((t) => t.isDefault);
    return defaultTerm?.description || settings.deliveryTerms[0]?.description || 'Ex Works';
  },

  /**
   * Get company info for document generation
   */
  async getCompanyInfo(): Promise<CompanyInfo> {
    const settings = await this.getSettings();
    return settings.company;
  },

  /**
   * Get default VAT rate
   */
  async getDefaultVATRate(): Promise<number> {
    const settings = await this.getSettings();
    return settings.vat.defaultRate;
  },

  /**
   * Get cost estimation settings
   */
  async getCostEstimationSettings(): Promise<CostEstimationSettings> {
    const settings = await this.getSettings();
    // Provide defaults for legacy settings without this field
    return settings.costEstimation || DEFAULT_COST_ESTIMATION;
  },

  /**
   * Get cost estimation ratio
   */
  async getCostEstimationRatio(): Promise<number> {
    const costSettings = await this.getCostEstimationSettings();
    return costSettings.defaultRatio;
  },

  /**
   * Update cost estimation settings
   */
  async updateCostEstimation(updates: Partial<CostEstimationSettings>): Promise<Result<AppSettings, string>> {
    const settings = await this.getSettings();

    // Validate ratio is between 0 and 1
    if (updates.defaultRatio !== undefined && (updates.defaultRatio < 0 || updates.defaultRatio > 1)) {
      return Err('Cost estimation ratio must be between 0 and 1');
    }

    if (updates.warnThreshold !== undefined && (updates.warnThreshold < 0 || updates.warnThreshold > 1)) {
      return Err('Warning threshold must be between 0 and 1');
    }

    const currentCostEstimation = settings.costEstimation || DEFAULT_COST_ESTIMATION;

    const updated: AppSettings = {
      ...settings,
      costEstimation: { ...currentCostEstimation, ...updates },
      updatedAt: now(),
    };

    await SettingsRepository.save(updated);
    return Ok(updated);
  },
};
