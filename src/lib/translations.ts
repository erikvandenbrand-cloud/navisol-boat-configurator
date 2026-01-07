// Navisol Translations - Dutch (nl) and English (en)

export type Language = 'en' | 'nl';

export interface Translations {
  // General
  dashboard: string;
  clients: string;
  articles: string;
  configurator: string;
  configurations: string;
  documents: string;
  settings: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  add: string;
  search: string;
  filter: string;
  export: string;
  import: string;
  print: string;
  download: string;

  // Dashboard
  overview: string;
  totalParts: string;
  totalClients: string;
  totalConfigurations: string;
  inventoryValue: string;
  stockAlerts: string;
  allStockLevelsOk: string;
  partsByCategory: string;
  modelCompatibility: string;
  quickActions: string;
  recentConfigurations: string;
  noConfigurationsYet: string;
  newConfiguration: string;
  addNewPart: string;
  manageClients: string;
  createQuotation: string;
  generateCeDocs: string;

  // Client Management
  clientManagement: string;
  addClient: string;
  editClient: string;
  clientDetails: string;
  contactInformation: string;
  address: string;
  businessDetails: string;
  notes: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
  vatNumber: string;
  chamberOfCommerce: string;
  status: string;
  active: string;
  prospect: string;
  inactive: string;

  // Boats
  boats: string;
  addBoat: string;
  editBoat: string;
  boatName: string;
  boatModel: string;
  propulsion: string;
  propulsionType: string;
  hullIdentificationNumber: string;
  yearBuilt: string;
  registrationNumber: string;
  homePort: string;
  deliveryDate: string;
  ordered: string;
  inProduction: string;
  delivered: string;
  warranty: string;

  // Production
  productionTimeline: string;
  productionTracking: string;
  stage: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string;
  actualEnd: string;
  pending: string;
  completed: string;
  delayed: string;
  orderConfirmed: string;
  hullConstruction: string;
  structuralWork: string;
  propulsionInstallation: string;
  electricalSystems: string;
  interiorFinishing: string;
  deckEquipment: string;
  qualityInspection: string;
  seaTrial: string;
  finalDelivery: string;
  estimatedDelivery: string;
  productionProgress: string;

  // Parts Database
  partsDatabase: string;
  partName: string;
  category: string;
  subcategory: string;
  brand: string;
  supplier: string;
  purchasePrice: string;
  salesPrice: string;
  stockQuantity: string;
  minStockLevel: string;
  standard: string;
  optional: string;
  electricCompatible: string;
  dieselCompatible: string;
  hybridCompatible: string;

  // Configurator
  boatConfigurator: string;
  selectModel: string;
  selectPropulsion: string;
  drivetrain: string;
  steering: string;
  electrical: string;
  deckAndSafety: string;
  interior: string;
  review: string;
  next: string;
  previous: string;
  saveConfiguration: string;
  configurationSummary: string;
  selectedItems: string;
  subtotal: string;
  vat: string;
  total: string;

  // Documents
  partsList: string;
  equipmentList: string;
  quotation: string;
  costComparison: string;
  ceDocuments: string;
  technicalFile: string;
  generateDocument: string;
  documentPreview: string;
  selectConfiguration: string;
  exportPdf: string;

  // Quotation
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  seller: string;
  debtorNumber: string;
  yourReference: string;
  deliveryMethod: string;
  description: string;
  quantity: string;
  price: string;
  totalAmount: string;
  subtotalExclVat: string;
  totalInclVat: string;
  paymentTerms: string;
  deliveryTerms: string;

  // Settings
  companyInformation: string;
  pricingAndTax: string;
  currency: string;
  vatRate: string;
  quotationValidityDays: string;
  dataManagement: string;
  exportAllJson: string;
  exportArticlesCsv: string;
  importJsonBackup: string;
  importArticlesCsv: string;
  clearAllData: string;
  dangerZone: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // General
    dashboard: 'Dashboard',
    clients: 'Clients',
    articles: 'Articles',
    configurator: 'Configurator',
    configurations: 'Configurations',
    documents: 'Documents',
    settings: 'Settings',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    download: 'Download',

    // Dashboard
    overview: 'Overview of your Navisol boat manufacturing system',
    totalParts: 'Total Parts',
    totalClients: 'Clients',
    totalConfigurations: 'Configurations',
    inventoryValue: 'Inventory Value',
    stockAlerts: 'Stock Alerts',
    allStockLevelsOk: 'All stock levels OK',
    partsByCategory: 'Parts by Category',
    modelCompatibility: 'Model Compatibility',
    quickActions: 'Quick Actions',
    recentConfigurations: 'Recent Configurations',
    noConfigurationsYet: 'No configurations yet',
    newConfiguration: 'New Configuration',
    addNewPart: 'Add New Part',
    manageClients: 'Manage Clients',
    createQuotation: 'Create Quotation',
    generateCeDocs: 'Generate CE Docs',

    // Client Management
    clientManagement: 'Client Management',
    addClient: 'Add Client',
    editClient: 'Edit Client',
    clientDetails: 'Client Details',
    contactInformation: 'Contact Information',
    address: 'Address',
    businessDetails: 'Business Details',
    notes: 'Notes',
    companyName: 'Company Name',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    mobile: 'Mobile',
    streetAddress: 'Street Address',
    postalCode: 'Postal Code',
    city: 'City',
    country: 'Country',
    vatNumber: 'VAT Number',
    chamberOfCommerce: 'Chamber of Commerce',
    status: 'Status',
    active: 'Active',
    prospect: 'Prospect',
    inactive: 'Inactive',

    // Boats
    boats: 'Boats',
    addBoat: 'Add Boat',
    editBoat: 'Edit Boat',
    boatName: 'Boat Name',
    boatModel: 'Boat Model',
    propulsion: 'Propulsion',
    propulsionType: 'Propulsion Type',
    hullIdentificationNumber: 'Hull Identification Number (HIN)',
    yearBuilt: 'Year Built',
    registrationNumber: 'Registration Number',
    homePort: 'Home Port',
    deliveryDate: 'Delivery Date',
    ordered: 'Ordered',
    inProduction: 'In Production',
    delivered: 'Delivered',
    warranty: 'Warranty',

    // Production
    productionTimeline: 'Production Timeline',
    productionTracking: 'Production Tracking',
    stage: 'Stage',
    plannedStart: 'Planned Start',
    plannedEnd: 'Planned End',
    actualStart: 'Actual Start',
    actualEnd: 'Actual End',
    pending: 'Pending',
    completed: 'Completed',
    delayed: 'Delayed',
    orderConfirmed: 'Order Confirmed',
    hullConstruction: 'Hull Construction',
    structuralWork: 'Structural Work',
    propulsionInstallation: 'Propulsion Installation',
    electricalSystems: 'Electrical Systems',
    interiorFinishing: 'Interior Finishing',
    deckEquipment: 'Deck Equipment',
    qualityInspection: 'Quality Inspection',
    seaTrial: 'Sea Trial',
    finalDelivery: 'Final Delivery',
    estimatedDelivery: 'Estimated Delivery',
    productionProgress: 'Production Progress',

    // Parts Database
    partsDatabase: 'Parts Database',
    partName: 'Part Name',
    category: 'Category',
    subcategory: 'Subcategory',
    brand: 'Brand',
    supplier: 'Supplier',
    purchasePrice: 'Purchase Price',
    salesPrice: 'Sales Price',
    stockQuantity: 'Stock Quantity',
    minStockLevel: 'Min Stock Level',
    standard: 'Standard',
    optional: 'Optional',
    electricCompatible: 'Electric Compatible',
    dieselCompatible: 'Diesel Compatible',
    hybridCompatible: 'Hybrid Compatible',

    // Configurator
    boatConfigurator: 'Boat Configurator',
    selectModel: 'Select your Eagle model',
    selectPropulsion: 'Choose propulsion type',
    drivetrain: 'Drivetrain',
    steering: 'Steering',
    electrical: 'Electrical',
    deckAndSafety: 'Deck & Safety',
    interior: 'Interior',
    review: 'Review',
    next: 'Next',
    previous: 'Previous',
    saveConfiguration: 'Save Configuration',
    configurationSummary: 'Configuration Summary',
    selectedItems: 'Selected Items',
    subtotal: 'Subtotal',
    vat: 'VAT',
    total: 'Total',

    // Documents
    partsList: 'Parts List',
    equipmentList: 'Equipment List',
    quotation: 'Quotation',
    costComparison: 'Cost Comparison',
    ceDocuments: 'CE Documents',
    technicalFile: 'Technical File',
    generateDocument: 'Generate Document',
    documentPreview: 'Document Preview',
    selectConfiguration: 'Select Configuration',
    exportPdf: 'Export PDF',

    // Quotation
    quotationNumber: 'Quotation Number',
    quotationDate: 'Quotation Date',
    validUntil: 'Valid Until',
    seller: 'Seller',
    debtorNumber: 'Debtor Number',
    yourReference: 'Your Reference',
    deliveryMethod: 'Delivery Method',
    description: 'Description',
    quantity: 'Quantity',
    price: 'Price',
    totalAmount: 'Total Amount',
    subtotalExclVat: 'Subtotal excl. VAT',
    totalInclVat: 'Total incl. VAT',
    paymentTerms: 'Payment Terms',
    deliveryTerms: 'Delivery Terms',

    // Settings
    companyInformation: 'Company Information',
    pricingAndTax: 'Pricing & Tax',
    currency: 'Currency',
    vatRate: 'VAT Rate',
    quotationValidityDays: 'Quotation Validity (days)',
    dataManagement: 'Data Management',
    exportAllJson: 'Export All (JSON)',
    exportArticlesCsv: 'Export Articles (CSV)',
    importJsonBackup: 'Import JSON Backup',
    importArticlesCsv: 'Import Articles (CSV)',
    clearAllData: 'Clear All Data',
    dangerZone: 'Danger Zone',
  },

  nl: {
    // General
    dashboard: 'Dashboard',
    clients: 'Klanten',
    articles: 'Artikelen',
    configurator: 'Configurator',
    configurations: 'Configuraties',
    documents: 'Documenten',
    settings: 'Instellingen',
    save: 'Opslaan',
    cancel: 'Annuleren',
    edit: 'Bewerken',
    delete: 'Verwijderen',
    add: 'Toevoegen',
    search: 'Zoeken',
    filter: 'Filteren',
    export: 'Exporteren',
    import: 'Importeren',
    print: 'Afdrukken',
    download: 'Downloaden',

    // Dashboard
    overview: 'Overzicht van uw Navisol bootproductiesysteem',
    totalParts: 'Totaal Onderdelen',
    totalClients: 'Klanten',
    totalConfigurations: 'Configuraties',
    inventoryValue: 'Voorraadwaarde',
    stockAlerts: 'Voorraadwaarschuwingen',
    allStockLevelsOk: 'Alle voorraadniveaus OK',
    partsByCategory: 'Onderdelen per Categorie',
    modelCompatibility: 'Modelcompatibiliteit',
    quickActions: 'Snelle Acties',
    recentConfigurations: 'Recente Configuraties',
    noConfigurationsYet: 'Nog geen configuraties',
    newConfiguration: 'Nieuwe Configuratie',
    addNewPart: 'Nieuw Onderdeel',
    manageClients: 'Klanten Beheren',
    createQuotation: 'Offerte Maken',
    generateCeDocs: 'CE Documenten',

    // Client Management
    clientManagement: 'Klantenbeheer',
    addClient: 'Klant Toevoegen',
    editClient: 'Klant Bewerken',
    clientDetails: 'Klantgegevens',
    contactInformation: 'Contactinformatie',
    address: 'Adres',
    businessDetails: 'Bedrijfsgegevens',
    notes: 'Notities',
    companyName: 'Bedrijfsnaam',
    firstName: 'Voornaam',
    lastName: 'Achternaam',
    email: 'E-mail',
    phone: 'Telefoon',
    mobile: 'Mobiel',
    streetAddress: 'Straat en Huisnummer',
    postalCode: 'Postcode',
    city: 'Plaats',
    country: 'Land',
    vatNumber: 'BTW-nummer',
    chamberOfCommerce: 'KvK-nummer',
    status: 'Status',
    active: 'Actief',
    prospect: 'Prospect',
    inactive: 'Inactief',

    // Boats
    boats: 'Boten',
    addBoat: 'Boot Toevoegen',
    editBoat: 'Boot Bewerken',
    boatName: 'Bootnaam',
    boatModel: 'Bootmodel',
    propulsion: 'Voortstuwing',
    propulsionType: 'Type Voortstuwing',
    hullIdentificationNumber: 'Rompidentificatienummer (HIN)',
    yearBuilt: 'Bouwjaar',
    registrationNumber: 'Registratienummer',
    homePort: 'Thuishaven',
    deliveryDate: 'Leveringsdatum',
    ordered: 'Besteld',
    inProduction: 'In Productie',
    delivered: 'Geleverd',
    warranty: 'Garantie',

    // Production
    productionTimeline: 'Productietijdlijn',
    productionTracking: 'Productievoortgang',
    stage: 'Fase',
    plannedStart: 'Geplande Start',
    plannedEnd: 'Geplande Eind',
    actualStart: 'Werkelijke Start',
    actualEnd: 'Werkelijke Eind',
    pending: 'In Afwachting',
    completed: 'Voltooid',
    delayed: 'Vertraagd',
    orderConfirmed: 'Order Bevestigd',
    hullConstruction: 'Rompconstructie',
    structuralWork: 'Constructiewerk',
    propulsionInstallation: 'Voortstuwing Installatie',
    electricalSystems: 'Elektrische Systemen',
    interiorFinishing: 'Interieurafwerking',
    deckEquipment: 'Dekuitrusting',
    qualityInspection: 'Kwaliteitsinspectie',
    seaTrial: 'Proefvaart',
    finalDelivery: 'Eindlevering',
    estimatedDelivery: 'Geschatte Levering',
    productionProgress: 'Productievooruitgang',

    // Parts Database
    partsDatabase: 'Onderdelendatabase',
    partName: 'Onderdeelnaam',
    category: 'Categorie',
    subcategory: 'Subcategorie',
    brand: 'Merk',
    supplier: 'Leverancier',
    purchasePrice: 'Inkoopprijs',
    salesPrice: 'Verkoopprijs',
    stockQuantity: 'Voorraad',
    minStockLevel: 'Min. Voorraadniveau',
    standard: 'Standaard',
    optional: 'Optioneel',
    electricCompatible: 'Elektrisch Compatibel',
    dieselCompatible: 'Diesel Compatibel',
    hybridCompatible: 'Hybride Compatibel',

    // Configurator
    boatConfigurator: 'Bootconfigurator',
    selectModel: 'Selecteer uw Eagle model',
    selectPropulsion: 'Kies type voortstuwing',
    drivetrain: 'Aandrijflijn',
    steering: 'Besturing',
    electrical: 'Elektrisch',
    deckAndSafety: 'Dek & Veiligheid',
    interior: 'Interieur',
    review: 'Overzicht',
    next: 'Volgende',
    previous: 'Vorige',
    saveConfiguration: 'Configuratie Opslaan',
    configurationSummary: 'Configuratieoverzicht',
    selectedItems: 'Geselecteerde Items',
    subtotal: 'Subtotaal',
    vat: 'BTW',
    total: 'Totaal',

    // Documents
    partsList: 'Onderdelenlijst',
    equipmentList: 'Uitrustingslijst',
    quotation: 'Offerte',
    costComparison: 'Kostenvergelijking',
    ceDocuments: 'CE Documenten',
    technicalFile: 'Technisch Dossier',
    generateDocument: 'Document Genereren',
    documentPreview: 'Documentvoorbeeld',
    selectConfiguration: 'Selecteer Configuratie',
    exportPdf: 'Exporteer PDF',

    // Quotation
    quotationNumber: 'Offertenummer',
    quotationDate: 'Offertedatum',
    validUntil: 'Geldig tot',
    seller: 'Verkoper',
    debtorNumber: 'Debiteurennummer',
    yourReference: 'Uw Referentie',
    deliveryMethod: 'Leveringswijze',
    description: 'Omschrijving',
    quantity: 'Aantal',
    price: 'Prijs',
    totalAmount: 'Totaalbedrag',
    subtotalExclVat: 'Subtotaal excl. BTW',
    totalInclVat: 'Totaal incl. BTW',
    paymentTerms: 'Betalingsvoorwaarden',
    deliveryTerms: 'Leveringsvoorwaarden',

    // Settings
    companyInformation: 'Bedrijfsinformatie',
    pricingAndTax: 'Prijzen & Belasting',
    currency: 'Valuta',
    vatRate: 'BTW-tarief',
    quotationValidityDays: 'Offerte Geldigheid (dagen)',
    dataManagement: 'Gegevensbeheer',
    exportAllJson: 'Alles Exporteren (JSON)',
    exportArticlesCsv: 'Artikelen Exporteren (CSV)',
    importJsonBackup: 'JSON Backup Importeren',
    importArticlesCsv: 'Artikelen Importeren (CSV)',
    clearAllData: 'Alle Gegevens Wissen',
    dangerZone: 'Gevarenzone',
  },
};

// Helper to get stage name
export function getStageName(stage: string, lang: Language = 'en'): string {
  const stageMap: Record<string, keyof Translations> = {
    order_confirmed: 'orderConfirmed',
    hull_construction: 'hullConstruction',
    structural_work: 'structuralWork',
    propulsion_installation: 'propulsionInstallation',
    electrical_systems: 'electricalSystems',
    interior_finishing: 'interiorFinishing',
    deck_equipment: 'deckEquipment',
    quality_inspection: 'qualityInspection',
    sea_trial: 'seaTrial',
    final_delivery: 'finalDelivery',
  };

  const key = stageMap[stage];
  return key ? translations[lang][key] : stage;
}

// Helper to get status name
export function getStatusName(status: string, lang: Language = 'en'): string {
  const statusMap: Record<string, keyof Translations> = {
    pending: 'pending',
    in_progress: 'inProduction',
    completed: 'completed',
    delayed: 'delayed',
    ordered: 'ordered',
    in_production: 'inProduction',
    delivered: 'delivered',
    warranty: 'warranty',
  };

  const key = statusMap[status];
  return key ? translations[lang][key] : status;
}
