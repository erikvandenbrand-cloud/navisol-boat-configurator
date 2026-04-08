/**
 * Navigation Helper - v4
 * URL query param-based navigation and filtering
 */

import type { ProjectStatus, QuoteStatus } from '@/domain/models';

// ============================================
// FILTER TYPES
// ============================================

export interface ProjectFilters {
  status?: ProjectStatus;
  quoteStatus?: QuoteStatus;
  clientId?: string;
}

export interface NavigationParams {
  screen: 'dashboard' | 'projects' | 'project-detail' | 'clients' | 'library' | 'settings' | 'timesheets';
  projectId?: string;
  filters?: ProjectFilters;
}

// ============================================
// URL BUILDING
// ============================================

/**
 * Build URL query string from filters
 */
export function buildQueryString(filters: ProjectFilters): string {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.quoteStatus) {
    params.set('quoteStatus', filters.quoteStatus);
  }
  if (filters.clientId) {
    params.set('clientId', filters.clientId);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Build full path with query params
 */
export function buildPath(screen: string, filters?: ProjectFilters): string {
  const basePath = `/${screen}`;
  if (!filters) return basePath;
  return `${basePath}${buildQueryString(filters)}`;
}

/**
 * Build hash path for SPA routing
 * Returns format: #/screen or #/screen?param=value
 */
export function buildHashPath(screen: string, filters?: ProjectFilters): string {
  const path = buildPath(screen, filters);
  return `#${path}`;
}

// ============================================
// URL PARSING
// ============================================

/**
 * Parse filters from URL query string
 */
export function parseQueryString(queryString: string): ProjectFilters {
  const params = new URLSearchParams(queryString);
  const filters: ProjectFilters = {};

  const status = params.get('status');
  if (status && isValidProjectStatus(status)) {
    filters.status = status;
  }

  const quoteStatus = params.get('quoteStatus');
  if (quoteStatus && isValidQuoteStatus(quoteStatus)) {
    filters.quoteStatus = quoteStatus;
  }

  const clientId = params.get('clientId');
  if (clientId) {
    filters.clientId = clientId;
  }

  return filters;
}

/**
 * Parse navigation from current window location
 */
export function parseCurrentLocation(): NavigationParams {
  if (typeof window === 'undefined') {
    return { screen: 'dashboard' };
  }

  const path = window.location.pathname;
  const queryString = window.location.search;
  const filters = parseQueryString(queryString);

  // Parse screen from path
  if (path.includes('/projects/')) {
    const projectId = path.split('/projects/')[1]?.split('/')[0];
    return { screen: 'project-detail', projectId, filters };
  }

  if (path.includes('/projects')) {
    return { screen: 'projects', filters };
  }

  if (path.includes('/clients')) {
    return { screen: 'clients', filters };
  }

  if (path.includes('/library')) {
    return { screen: 'library', filters };
  }

  if (path.includes('/settings')) {
    return { screen: 'settings', filters };
  }

  return { screen: 'dashboard', filters };
}

// ============================================
// VALIDATION
// ============================================

const VALID_PROJECT_STATUSES: ProjectStatus[] = [
  'DRAFT',
  'QUOTED',
  'OFFER_SENT',
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'CLOSED',
];

const VALID_QUOTE_STATUSES: QuoteStatus[] = [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'SUPERSEDED',
];

export function isValidProjectStatus(status: string): status is ProjectStatus {
  return VALID_PROJECT_STATUSES.includes(status as ProjectStatus);
}

export function isValidQuoteStatus(status: string): status is QuoteStatus {
  return VALID_QUOTE_STATUSES.includes(status as QuoteStatus);
}

// ============================================
// ACTIVITY LINK RESOLUTION
// ============================================

/**
 * Resolve an audit entry to a navigation target
 * Returns null if the entry cannot be linked to a project
 */
export function resolveActivityLink(
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
): { projectId: string } | null {
  // Direct project references
  if (entityType === 'Project' || entityType === 'ProjectConfiguration') {
    return { projectId: entityId };
  }

  // Entities that contain projectId in metadata
  const projectEntities = [
    'ProjectQuote',
    'ProjectDocument',
    'ProjectAmendment',
    'ProjectTask',
    'ConfigurationItem',
    'DeliveryPack',
  ];

  if (projectEntities.includes(entityType)) {
    // Check metadata for projectId
    if (metadata?.projectId && typeof metadata.projectId === 'string') {
      return { projectId: metadata.projectId };
    }
    // For some entities, entityId might be in format "projectId-..." or we need to lookup
    // For now, if we can't resolve, return null
  }

  return null;
}

// ============================================
// FILTER DESCRIPTION
// ============================================

/**
 * Get human-readable description of active filters
 */
export function describeFilters(filters: ProjectFilters): string {
  const parts: string[] = [];

  if (filters.status) {
    const statusLabels: Record<ProjectStatus, string> = {
      DRAFT: 'Draft',
      QUOTED: 'Quoted',
      OFFER_SENT: 'Offer Sent',
      ORDER_CONFIRMED: 'Order Confirmed',
      IN_PRODUCTION: 'In Production',
      READY_FOR_DELIVERY: 'Ready for Delivery',
      DELIVERED: 'Delivered',
      CLOSED: 'Closed',
    };
    parts.push(`Status: ${statusLabels[filters.status]}`);
  }

  if (filters.quoteStatus) {
    parts.push(`Quote Status: ${filters.quoteStatus}`);
  }

  return parts.join(', ') || 'All Projects';
}
