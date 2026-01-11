/**
 * Sample Data for v4
 * Initializes sample clients and projects for demonstration
 */

import { ClientRepository, ProjectRepository } from '@/data/repositories';
import { getAuditContext } from '@/domain/auth';
import { LibrarySeedService } from '@/domain/services';

export async function initializeSampleData() {
  const context = getAuditContext();

  // Initialize library taxonomy (idempotent)
  await LibrarySeedService.initializeTaxonomy(context);
  await LibrarySeedService.seedSampleArticles(context);

  // Check if data already exists
  const existingClients = await ClientRepository.getAll();
  if (existingClients.length > 0) {
    console.log('Sample data already exists, skipping initialization');
    return;
  }

  console.log('Initializing sample data...');

  // Create sample clients
  const clients = await Promise.all([
    ClientRepository.create({
      name: 'De Vries Watersport B.V.',
      type: 'company',
      email: 'info@devries-watersport.nl',
      phone: '+31 6 12345678',
      street: 'Havenstraat 15',
      postalCode: '1234 AB',
      city: 'Amsterdam',
      country: 'Netherlands',
      vatNumber: 'NL123456789B01',
      status: 'active',
    }),
    ClientRepository.create({
      name: 'Jan Bakker',
      type: 'private',
      email: 'jan.bakker@email.nl',
      phone: '+31 6 87654321',
      city: 'Rotterdam',
      country: 'Netherlands',
      status: 'active',
    }),
    ClientRepository.create({
      name: 'Marina Rotterdam B.V.',
      type: 'company',
      email: 'sales@marinarotterdam.nl',
      phone: '+31 10 1234567',
      street: 'Europoort 100',
      postalCode: '3000 AA',
      city: 'Rotterdam',
      country: 'Netherlands',
      vatNumber: 'NL987654321B01',
      status: 'active',
    }),
  ]);

  console.log(`Created ${clients.length} sample clients`);

  // Create sample projects
  const projects = await Promise.all([
    ProjectRepository.create(
      {
        title: 'De Vries - Eagle 40 Electric',
        type: 'NEW_BUILD',
        clientId: clients[0].id,
        propulsionType: 'Electric',
      },
      context.userId
    ),
    ProjectRepository.create(
      {
        title: 'Bakker - Eagle 32 Hybrid',
        type: 'NEW_BUILD',
        clientId: clients[1].id,
        propulsionType: 'Hybrid',
      },
      context.userId
    ),
    ProjectRepository.create(
      {
        title: 'Marina Rotterdam Fleet Refit',
        type: 'REFIT',
        clientId: clients[2].id,
        propulsionType: 'Electric',
      },
      context.userId
    ),
  ]);

  console.log(`Created ${projects.length} sample projects`);

  // Add some sample equipment to the first project
  const project = projects[0];
  const sampleItems = [
    {
      category: 'Hull',
      name: 'Eagle 40 Hull & Deck Assembly',
      unitPriceExclVat: 125000,
      quantity: 1,
      unit: 'set',
      ceRelevant: true,
    },
    {
      category: 'Propulsion',
      name: 'Electric Motor System 40kW',
      unitPriceExclVat: 35000,
      quantity: 1,
      unit: 'set',
      ceRelevant: true,
      safetyCritical: true,
    },
    {
      category: 'Propulsion',
      name: 'Battery Pack 80kWh',
      unitPriceExclVat: 45000,
      quantity: 1,
      unit: 'set',
      ceRelevant: true,
      safetyCritical: true,
    },
    {
      category: 'Navigation',
      name: 'Raymarine Navigation Package',
      unitPriceExclVat: 8500,
      quantity: 1,
      unit: 'set',
    },
    {
      category: 'Comfort',
      name: 'Luxury Interior Package',
      unitPriceExclVat: 22000,
      quantity: 1,
      unit: 'set',
    },
    {
      category: 'Safety',
      name: 'Safety Equipment Package',
      unitPriceExclVat: 3500,
      quantity: 1,
      unit: 'set',
      ceRelevant: true,
      safetyCritical: true,
    },
  ];

  // Calculate totals
  let items = sampleItems.map((item, index) => ({
    id: `item-${index}`,
    itemType: 'LEGACY' as const, // Mark as legacy for sample data
    catalogItemId: undefined,
    catalogVersionId: undefined,
    articleId: undefined,
    articleVersionId: undefined,
    kitId: undefined,
    kitVersionId: undefined,
    isCustom: true,
    category: item.category,
    subcategory: undefined,
    articleNumber: undefined,
    name: item.name,
    description: undefined,
    quantity: item.quantity,
    unit: item.unit,
    unitPriceExclVat: item.unitPriceExclVat,
    lineTotalExclVat: item.quantity * item.unitPriceExclVat,
    isIncluded: true,
    ceRelevant: item.ceRelevant || false,
    safetyCritical: item.safetyCritical || false,
    sortOrder: index,
  }));

  const subtotalExclVat = items.reduce((sum, item) => sum + item.lineTotalExclVat, 0);
  const vatRate = 21;
  const vatAmount = Math.round(subtotalExclVat * (vatRate / 100) * 100) / 100;
  const totalInclVat = subtotalExclVat + vatAmount;

  await ProjectRepository.update(project.id, {
    configuration: {
      boatModelVersionId: undefined,
      propulsionType: 'Electric',
      items,
      subtotalExclVat,
      discountPercent: undefined,
      discountAmount: undefined,
      totalExclVat: subtotalExclVat,
      vatRate,
      vatAmount,
      totalInclVat,
      isFrozen: false,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: context.userId,
    },
  });

  console.log('Added sample equipment to first project');
  console.log('Sample data initialization complete');
}
