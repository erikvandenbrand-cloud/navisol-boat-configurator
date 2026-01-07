// Internationalization for Navisol System

export type Language = 'en' | 'nl';

export interface Translations {
  // Navigation
  nav: {
    dashboard: string;
    clients: string;
    clientManagement: string;
    partsDatabase: string;
    boatConfigurator: string;
    savedConfigs: string;
    partsList: string;
    equipmentList: string;
    quotation: string;
    costComparison: string;
    ceDocuments: string;
    technicalFile: string;
    settings: string;
    overview: string;
    database: string;
    configuration: string;
    documents: string;
    ceTechnical: string;
  };
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    filter: string;
    export: string;
    import: string;
    print: string;
    download: string;
    send: string;
    close: string;
    yes: string;
    no: string;
    confirm: string;
    back: string;
    next: string;
    previous: string;
    loading: string;
    noData: string;
    total: string;
    subtotal: string;
    vat: string;
    quantity: string;
    price: string;
    status: string;
    date: string;
    notes: string;
    actions: string;
  };
  // Dashboard
  dashboard: {
    title: string;
    subtitle: string;
    totalParts: string;
    configurations: string;
    inventoryValue: string;
    stockAlerts: string;
    salesPotential: string;
    standard: string;
    optional: string;
    partsByCategory: string;
    modelCompatibility: string;
    quickActions: string;
    recentConfigurations: string;
    noConfigurationsYet: string;
    allStockLevelsOk: string;
    itemsNeedReordering: string;
    newConfiguration: string;
    addNewPart: string;
    manageClients: string;
    createQuotation: string;
    generateCeDocs: string;
    avgConfigValue: string;
    ceDocuments: string;
    quotations: string;
  };
  // Clients
  clients: {
    title: string;
    subtitle: string;
    addClient: string;
    editClient: string;
    totalClients: string;
    activeClients: string;
    prospects: string;
    totalBoats: string;
    clientList: string;
    selectClient: string;
    contactInfo: string;
    address: string;
    businessDetails: string;
    boats: string;
    documents: string;
    addBoat: string;
    editBoat: string;
    noBoats: string;
    noQuotations: string;
    noConfigurations: string;
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
    clientSince: string;
    boatName: string;
    boatModel: string;
    propulsion: string;
    hin: string;
    yearBuilt: string;
    homePort: string;
    registrationNumber: string;
    deliveryDate: string;
    ordered: string;
    inProduction: string;
    delivered: string;
    warranty: string;
    active: string;
    prospect: string;
    inactive: string;
  };
  // Quotation
  quotation: {
    title: string;
    quotationNumber: string;
    quotationDate: string;
    expiryDate: string;
    seller: string;
    debtorNumber: string;
    yourReference: string;
    deliveryMethod: string;
    page: string;
    description: string;
    amount: string;
    unitPrice: string;
    totalAmount: string;
    subtotalExclVat: string;
    vatPercent: string;
    totalInclVat: string;
    paymentTerms: string;
    deliveryTerms: string;
    validityNote: string;
    sendByEmail: string;
    emailSent: string;
    emailSubject: string;
    emailBody: string;
  };
  // Production
  production: {
    title: string;
    subtitle: string;
    timeline: string;
    milestones: string;
    addMilestone: string;
    orderReceived: string;
    designApproved: string;
    materialsOrdered: string;
    hullConstruction: string;
    systemsInstallation: string;
    finishing: string;
    seaTrial: string;
    delivery: string;
    completed: string;
    inProgress: string;
    pending: string;
    delayed: string;
    estimatedDate: string;
    actualDate: string;
    progressPercent: string;
    daysRemaining: string;
    daysOverdue: string;
  };
  // CE Documents
  ce: {
    declarationOfConformity: string;
    technicalFile: string;
    riskAssessment: string;
    testReport: string;
    ownersManual: string;
    applicableStandards: string;
    required: string;
    conditional: string;
  };
  // Settings
  settings: {
    title: string;
    subtitle: string;
    companyInfo: string;
    pricingTax: string;
    deliverySettings: string;
    localeFormatting: string;
    dataManagement: string;
    language: string;
    exportAll: string;
    importBackup: string;
    clearAllData: string;
    dangerZone: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      clients: 'Clients',
      clientManagement: 'Client Management',
      partsDatabase: 'Parts Database',
      boatConfigurator: 'Boat Configurator',
      savedConfigs: 'Saved Configs',
      partsList: 'Parts List',
      equipmentList: 'Equipment List',
      quotation: 'Quotation',
      costComparison: 'Cost Comparison',
      ceDocuments: 'CE Documents',
      technicalFile: 'Technical File',
      settings: 'Settings',
      overview: 'Overview',
      database: 'Database',
      configuration: 'Configuration',
      documents: 'Documents',
      ceTechnical: 'CE & Technical',
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      print: 'Print',
      download: 'Download',
      send: 'Send',
      close: 'Close',
      yes: 'Yes',
      no: 'No',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      loading: 'Loading...',
      noData: 'No data available',
      total: 'Total',
      subtotal: 'Subtotal',
      vat: 'VAT',
      quantity: 'Quantity',
      price: 'Price',
      status: 'Status',
      date: 'Date',
      notes: 'Notes',
      actions: 'Actions',
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Overview of your Navisol boat manufacturing system',
      totalParts: 'Total Parts',
      configurations: 'Configurations',
      inventoryValue: 'Inventory Value',
      stockAlerts: 'Stock Alerts',
      salesPotential: 'Sales potential',
      standard: 'Standard',
      optional: 'Optional',
      partsByCategory: 'Parts by Category',
      modelCompatibility: 'Model Compatibility',
      quickActions: 'Quick Actions',
      recentConfigurations: 'Recent Configurations',
      noConfigurationsYet: 'No configurations yet',
      allStockLevelsOk: 'All stock levels OK',
      itemsNeedReordering: 'Items need reordering',
      newConfiguration: 'New Configuration',
      addNewPart: 'Add New Part',
      manageClients: 'Manage Clients',
      createQuotation: 'Create Quotation',
      generateCeDocs: 'Generate CE Docs',
      avgConfigValue: 'Avg Config Value',
      ceDocuments: 'CE Documents',
      quotations: 'Quotations',
    },
    clients: {
      title: 'Clients',
      subtitle: 'Manage clients, their boats, and related documents',
      addClient: 'Add Client',
      editClient: 'Edit Client',
      totalClients: 'Total Clients',
      activeClients: 'Active Clients',
      prospects: 'Prospects',
      totalBoats: 'Total Boats',
      clientList: 'Client List',
      selectClient: 'Select a Client',
      contactInfo: 'Contact Information',
      address: 'Address',
      businessDetails: 'Business Details',
      boats: 'Boats',
      documents: 'Documents',
      addBoat: 'Add Boat',
      editBoat: 'Edit Boat',
      noBoats: 'No boats registered for this client',
      noQuotations: 'No quotations for this client',
      noConfigurations: 'No configurations for this client',
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
      clientSince: 'Client since',
      boatName: 'Boat Name',
      boatModel: 'Boat Model',
      propulsion: 'Propulsion',
      hin: 'Hull Identification Number (HIN)',
      yearBuilt: 'Year Built',
      homePort: 'Home Port',
      registrationNumber: 'Registration Number',
      deliveryDate: 'Delivery Date',
      ordered: 'Ordered',
      inProduction: 'In Production',
      delivered: 'Delivered',
      warranty: 'Warranty',
      active: 'Active',
      prospect: 'Prospect',
      inactive: 'Inactive',
    },
    quotation: {
      title: 'Quotation',
      quotationNumber: 'Quotation Number',
      quotationDate: 'Quotation Date',
      expiryDate: 'Expiry Date',
      seller: 'Seller',
      debtorNumber: 'Debtor Number',
      yourReference: 'Your Reference',
      deliveryMethod: 'Delivery Method',
      page: 'Page',
      description: 'Description',
      amount: 'Amount',
      unitPrice: 'Unit Price',
      totalAmount: 'Total Amount',
      subtotalExclVat: 'Subtotal excl. VAT',
      vatPercent: 'VAT',
      totalInclVat: 'Total incl. VAT',
      paymentTerms: 'Payment terms: 14 days after invoice date',
      deliveryTerms: 'Delivery terms',
      validityNote: 'This quotation is valid for',
      sendByEmail: 'Send by Email',
      emailSent: 'Email sent successfully',
      emailSubject: 'Quotation from Navisol',
      emailBody: 'Please find attached the quotation for your boat configuration.',
    },
    production: {
      title: 'Production Tracking',
      subtitle: 'Track production progress for boats',
      timeline: 'Production Timeline',
      milestones: 'Milestones',
      addMilestone: 'Add Milestone',
      orderReceived: 'Order Received',
      designApproved: 'Design Approved',
      materialsOrdered: 'Materials Ordered',
      hullConstruction: 'Hull Construction',
      systemsInstallation: 'Systems Installation',
      finishing: 'Finishing',
      seaTrial: 'Sea Trial',
      delivery: 'Delivery',
      completed: 'Completed',
      inProgress: 'In Progress',
      pending: 'Pending',
      delayed: 'Delayed',
      estimatedDate: 'Estimated Date',
      actualDate: 'Actual Date',
      progressPercent: 'Progress',
      daysRemaining: 'days remaining',
      daysOverdue: 'days overdue',
    },
    ce: {
      declarationOfConformity: 'Declaration of Conformity',
      technicalFile: 'Technical File',
      riskAssessment: 'Risk Assessment',
      testReport: 'Test Report',
      ownersManual: "Owner's Manual",
      applicableStandards: 'Applicable Standards',
      required: 'Required',
      conditional: 'Conditional',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Configure global settings for the Navisol system',
      companyInfo: 'Company Information',
      pricingTax: 'Pricing & Tax',
      deliverySettings: 'Delivery Settings',
      localeFormatting: 'Locale & Formatting',
      dataManagement: 'Data Management',
      language: 'Language',
      exportAll: 'Export All',
      importBackup: 'Import Backup',
      clearAllData: 'Clear All Data',
      dangerZone: 'Danger Zone',
    },
  },
  nl: {
    nav: {
      dashboard: 'Dashboard',
      clients: 'Klanten',
      clientManagement: 'Klantenbeheer',
      partsDatabase: 'Onderdelendatabase',
      boatConfigurator: 'Bootconfigurator',
      savedConfigs: 'Opgeslagen Configs',
      partsList: 'Onderdelenlijst',
      equipmentList: 'Uitrustingslijst',
      quotation: 'Offerte',
      costComparison: 'Kostenvergelijking',
      ceDocuments: 'CE Documenten',
      technicalFile: 'Technisch Dossier',
      settings: 'Instellingen',
      overview: 'Overzicht',
      database: 'Database',
      configuration: 'Configuratie',
      documents: 'Documenten',
      ceTechnical: 'CE & Technisch',
    },
    common: {
      save: 'Opslaan',
      cancel: 'Annuleren',
      delete: 'Verwijderen',
      edit: 'Bewerken',
      add: 'Toevoegen',
      search: 'Zoeken',
      filter: 'Filteren',
      export: 'Exporteren',
      import: 'Importeren',
      print: 'Afdrukken',
      download: 'Downloaden',
      send: 'Versturen',
      close: 'Sluiten',
      yes: 'Ja',
      no: 'Nee',
      confirm: 'Bevestigen',
      back: 'Terug',
      next: 'Volgende',
      previous: 'Vorige',
      loading: 'Laden...',
      noData: 'Geen gegevens beschikbaar',
      total: 'Totaal',
      subtotal: 'Subtotaal',
      vat: 'BTW',
      quantity: 'Aantal',
      price: 'Prijs',
      status: 'Status',
      date: 'Datum',
      notes: 'Notities',
      actions: 'Acties',
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Overzicht van uw Navisol bootproductiesysteem',
      totalParts: 'Totaal Onderdelen',
      configurations: 'Configuraties',
      inventoryValue: 'Voorraadwaarde',
      stockAlerts: 'Voorraadwaarschuwingen',
      salesPotential: 'Verkooppotentieel',
      standard: 'Standaard',
      optional: 'Optioneel',
      partsByCategory: 'Onderdelen per Categorie',
      modelCompatibility: 'Modelcompatibiliteit',
      quickActions: 'Snelle Acties',
      recentConfigurations: 'Recente Configuraties',
      noConfigurationsYet: 'Nog geen configuraties',
      allStockLevelsOk: 'Alle voorraadniveaus OK',
      itemsNeedReordering: 'Artikelen moeten worden bijbesteld',
      newConfiguration: 'Nieuwe Configuratie',
      addNewPart: 'Nieuw Onderdeel',
      manageClients: 'Klanten Beheren',
      createQuotation: 'Offerte Maken',
      generateCeDocs: 'CE Docs Genereren',
      avgConfigValue: 'Gem. Config Waarde',
      ceDocuments: 'CE Documenten',
      quotations: 'Offertes',
    },
    clients: {
      title: 'Klanten',
      subtitle: 'Beheer klanten, hun boten en gerelateerde documenten',
      addClient: 'Klant Toevoegen',
      editClient: 'Klant Bewerken',
      totalClients: 'Totaal Klanten',
      activeClients: 'Actieve Klanten',
      prospects: 'Prospects',
      totalBoats: 'Totaal Boten',
      clientList: 'Klantenlijst',
      selectClient: 'Selecteer een Klant',
      contactInfo: 'Contactgegevens',
      address: 'Adres',
      businessDetails: 'Bedrijfsgegevens',
      boats: 'Boten',
      documents: 'Documenten',
      addBoat: 'Boot Toevoegen',
      editBoat: 'Boot Bewerken',
      noBoats: 'Geen boten geregistreerd voor deze klant',
      noQuotations: 'Geen offertes voor deze klant',
      noConfigurations: 'Geen configuraties voor deze klant',
      companyName: 'Bedrijfsnaam',
      firstName: 'Voornaam',
      lastName: 'Achternaam',
      email: 'E-mail',
      phone: 'Telefoon',
      mobile: 'Mobiel',
      streetAddress: 'Straatnaam',
      postalCode: 'Postcode',
      city: 'Plaats',
      country: 'Land',
      vatNumber: 'BTW-nummer',
      chamberOfCommerce: 'KvK-nummer',
      clientSince: 'Klant sinds',
      boatName: 'Bootnaam',
      boatModel: 'Bootmodel',
      propulsion: 'Voortstuwing',
      hin: 'Casco-identificatienummer (HIN)',
      yearBuilt: 'Bouwjaar',
      homePort: 'Thuishaven',
      registrationNumber: 'Registratienummer',
      deliveryDate: 'Leveringsdatum',
      ordered: 'Besteld',
      inProduction: 'In Productie',
      delivered: 'Geleverd',
      warranty: 'Garantie',
      active: 'Actief',
      prospect: 'Prospect',
      inactive: 'Inactief',
    },
    quotation: {
      title: 'Offerte',
      quotationNumber: 'Offertenummer',
      quotationDate: 'Offertedatum',
      expiryDate: 'Vervaldatum',
      seller: 'Verkoper',
      debtorNumber: 'Debiteurennummer',
      yourReference: 'Uw referentie',
      deliveryMethod: 'Leveringswijze',
      page: 'Pagina',
      description: 'Omschrijving',
      amount: 'Aantal',
      unitPrice: 'Stukprijs',
      totalAmount: 'Totaalbedrag',
      subtotalExclVat: 'Subtotaal excl. BTW',
      vatPercent: 'BTW',
      totalInclVat: 'Totaal incl. BTW',
      paymentTerms: 'Betalingstermijn: 14 dagen na factuurdatum',
      deliveryTerms: 'Leveringsvoorwaarden',
      validityNote: 'Deze offerte is geldig voor',
      sendByEmail: 'Verstuur per E-mail',
      emailSent: 'E-mail succesvol verzonden',
      emailSubject: 'Offerte van Navisol',
      emailBody: 'Hierbij ontvangt u de offerte voor uw bootconfiguratie.',
    },
    production: {
      title: 'Productievolging',
      subtitle: 'Volg de productievoortgang van boten',
      timeline: 'Productietijdlijn',
      milestones: 'Mijlpalen',
      addMilestone: 'Mijlpaal Toevoegen',
      orderReceived: 'Order Ontvangen',
      designApproved: 'Ontwerp Goedgekeurd',
      materialsOrdered: 'Materialen Besteld',
      hullConstruction: 'Cascobouw',
      systemsInstallation: 'Systeeminstallatie',
      finishing: 'Afwerking',
      seaTrial: 'Proefvaart',
      delivery: 'Levering',
      completed: 'Voltooid',
      inProgress: 'In Uitvoering',
      pending: 'In Afwachting',
      delayed: 'Vertraagd',
      estimatedDate: 'Geschatte Datum',
      actualDate: 'Werkelijke Datum',
      progressPercent: 'Voortgang',
      daysRemaining: 'dagen resterend',
      daysOverdue: 'dagen te laat',
    },
    ce: {
      declarationOfConformity: 'Conformiteitsverklaring',
      technicalFile: 'Technisch Dossier',
      riskAssessment: 'Risicobeoordeling',
      testReport: 'Testrapport',
      ownersManual: 'Gebruikershandleiding',
      applicableStandards: 'Toepasselijke Normen',
      required: 'Vereist',
      conditional: 'Voorwaardelijk',
    },
    settings: {
      title: 'Instellingen',
      subtitle: 'Configureer globale instellingen voor het Navisol systeem',
      companyInfo: 'Bedrijfsinformatie',
      pricingTax: 'Prijzen & Belasting',
      deliverySettings: 'Leveringsinstellingen',
      localeFormatting: 'Taal & Opmaak',
      dataManagement: 'Gegevensbeheer',
      language: 'Taal',
      exportAll: 'Alles Exporteren',
      importBackup: 'Backup Importeren',
      clearAllData: 'Alle Gegevens Wissen',
      dangerZone: 'Gevarenzone',
    },
  },
};

// Hook to get current translations
export function getTranslations(language: Language): Translations {
  return translations[language];
}
