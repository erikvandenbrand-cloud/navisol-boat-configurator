/**
 * Eagleboats Model Import Service - v326 (Sales Track)
 *
 * Fetches and parses Eagle Boats model pages for one-time import.
 * This is an explicit user action - no background sync, no crawling.
 *
 * GOVERNANCE:
 * - Single URL fetch only, no link following
 * - No scheduled refresh or sync
 * - User must preview and confirm before import
 * - Imported content becomes internal editable truth
 * - Provenance metadata stored for reference only
 */

import { Result, Ok, Err, now } from '@/domain/models';

// ============================================
// TYPES
// ============================================

/**
 * Key facts extracted from the model page header
 */
export interface EagleboatsKeyFacts {
  lengthM?: number;
  lengthFt?: number;
  beamM?: number;
  beamFt?: number;
  passengers?: number;
  maxSpeedElectricKmh?: number;
  maxSpeedHybridKmh?: number;
}

/**
 * Technical data row from the TECHNICAL DATA section
 */
export interface EagleboatsTechnicalDataRow {
  label: string;
  value: string;
  /** Parsed numeric value if applicable */
  numericValue?: number;
  /** Unit if detected (m, ft, kg, lbs, kW, km/h, etc.) */
  unit?: string;
}

/**
 * Image extracted from the page
 */
export interface EagleboatsImage {
  url: string;
  captionGuess?: string;
  sourceNote: string;
}

/**
 * Source metadata for provenance tracking
 */
export interface EagleboatsImportSource {
  url: string;
  fetchedAt: string;
  pageTitle?: string;
}

/**
 * Complete import candidate from a parsed page
 */
export interface EagleboatsImportCandidate {
  modelName: string;
  range?: string;
  marketingIntro: string;
  tagline?: string;
  keyFacts: EagleboatsKeyFacts;
  technicalData: EagleboatsTechnicalDataRow[];
  images: EagleboatsImage[];
  source: EagleboatsImportSource;
  parseConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rawTextFallback?: string;
}

// ============================================
// PARSING HELPERS
// ============================================

/**
 * Parse a dimension string like "7.5 m | 24.6 ft" into metric value
 */
function parseMetricValue(str: string): { metric?: number; imperial?: number } {
  const result: { metric?: number; imperial?: number } = {};

  // Try to match "X.X m | X.X ft" format
  const dualMatch = str.match(/(\d+(?:\.\d+)?)\s*m?\s*\|\s*(\d+(?:\.\d+)?)\s*ft/i);
  if (dualMatch) {
    result.metric = parseFloat(dualMatch[1]);
    result.imperial = parseFloat(dualMatch[2]);
    return result;
  }

  // Try to match just meters
  const mMatch = str.match(/(\d+(?:\.\d+)?)\s*m(?:\s|$)/i);
  if (mMatch) {
    result.metric = parseFloat(mMatch[1]);
  }

  // Try to match just feet
  const ftMatch = str.match(/(\d+(?:\.\d+)?)\s*ft/i);
  if (ftMatch) {
    result.imperial = parseFloat(ftMatch[1]);
  }

  return result;
}

/**
 * Parse a weight string like "1,600 kg | 3,527 lbs"
 */
function parseWeight(str: string): { kg?: number; lbs?: number } {
  const result: { kg?: number; lbs?: number } = {};

  // Match kg
  const kgMatch = str.match(/([\d,]+(?:\.\d+)?)\s*kg/i);
  if (kgMatch) {
    result.kg = parseFloat(kgMatch[1].replace(/,/g, ''));
  }

  // Match lbs
  const lbsMatch = str.match(/([\d,]+(?:\.\d+)?)\s*lbs?/i);
  if (lbsMatch) {
    result.lbs = parseFloat(lbsMatch[1].replace(/,/g, ''));
  }

  return result;
}

/**
 * Parse a speed string like "40 km/h (electric) | 65 km/h (hybrid)"
 */
function parseSpeed(str: string): { electric?: number; hybrid?: number } {
  const result: { electric?: number; hybrid?: number } = {};

  // Look for patterns like "40 km/h (electric)"
  const electricMatch = str.match(/(\d+)\s*km\/h\s*\(?electric\)?/i);
  if (electricMatch) {
    result.electric = parseInt(electricMatch[1]);
  }

  // Look for patterns like "65 km/h (hybrid)"
  const hybridMatch = str.match(/(\d+)\s*km\/h\s*\(?hybrid\)?/i);
  if (hybridMatch) {
    result.hybrid = parseInt(hybridMatch[1]);
  }

  // If no explicit type, try to extract any speed
  if (!result.electric && !result.hybrid) {
    const speedMatch = str.match(/(\d+)\s*km\/h/i);
    if (speedMatch) {
      // Assume it's electric if not specified
      result.electric = parseInt(speedMatch[1]);
    }
  }

  return result;
}

/**
 * Parse passengers count from string like "10 persons"
 */
function parsePassengers(str: string): number | undefined {
  const match = str.match(/(\d+)\s*person/i);
  return match ? parseInt(match[1]) : undefined;
}

/**
 * Extract range from page title or URL (e.g., "TS Range", "FORCE Range")
 */
function extractRange(title: string, url: string): string | undefined {
  // Check page title for range indicator
  const titleRangeMatch = title.match(/(\w+)\s*Range/i);
  if (titleRangeMatch) {
    return titleRangeMatch[1].toUpperCase();
  }

  // Check URL for range indicator
  if (url.includes('force')) return 'FORCE';
  if (url.includes('25ts') || url.includes('ts')) return 'TS';
  if (url.includes('cruiser')) return 'Cruiser';

  return undefined;
}

/**
 * Validate that URL is a valid Eagle Boats model page
 */
function validateUrl(url: string): Result<URL, string> {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('eagleboats.nl')) {
      return Err('URL must be from eagleboats.nl');
    }
    if (!parsed.pathname.includes('/models/')) {
      return Err('URL must be a model page (should contain /models/)');
    }
    return Ok(parsed);
  } catch {
    return Err('Invalid URL format');
  }
}

// ============================================
// SERVICE
// ============================================

export const EagleboatsModelImportService = {
  /**
   * Validate a URL before fetching
   */
  validateUrl(url: string): Result<URL, string> {
    return validateUrl(url);
  },

  /**
   * Fetch and parse a single Eagle Boats model page.
   * This is an EXPLICIT user action - no background sync.
   * Uses server-side API route to avoid CORS issues.
   *
   * @param url - The URL of the model page to fetch
   * @returns ImportCandidate with extracted data
   */
  async fetchAndParse(url: string): Promise<Result<EagleboatsImportCandidate, string>> {
    // Validate URL first
    const urlValidation = validateUrl(url);
    if (!urlValidation.ok) {
      return Err(urlValidation.error);
    }

    try {
      // Use the API route to fetch server-side (avoids CORS)
      const response = await fetch('/api/import-eagleboats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        return Err(data.error || `Failed to fetch page: HTTP ${response.status}`);
      }

      // Decode the base64-encoded HTML (with proper UTF-8 handling)
      const binaryString = atob(data.htmlBase64);
      const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
      const html = new TextDecoder('utf-8').decode(bytes);

      // Parse the HTML
      return this.parseHtml(html, url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Err(`Failed to fetch page: ${message}`);
    }
  },

  /**
   * Parse HTML content from an Eagle Boats model page.
   * Robust parsing with graceful fallback.
   */
  parseHtml(html: string, sourceUrl: string): Result<EagleboatsImportCandidate, string> {
    try {
      // Create a DOM parser
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      let parseConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';

      // Extract page title
      const pageTitle = doc.querySelector('title')?.textContent?.trim() || '';

      // Extract model name from h1
      const h1 = doc.querySelector('h1');
      const modelName = h1?.textContent?.trim() || '';

      if (!modelName) {
        parseConfidence = 'LOW';
      }

      // Extract range from title
      const range = extractRange(pageTitle, sourceUrl);

      // Extract marketing intro - look for the main description paragraph
      let marketingIntro = '';
      let tagline = '';

      // Look for paragraphs with substantial content
      const paragraphs = doc.querySelectorAll('p');
      for (const p of paragraphs) {
        const text = p.textContent?.trim() || '';
        // Skip short paragraphs and navigation elements
        if (text.length > 80 && !text.includes('Cookie') && !text.includes('Privacy')) {
          if (!marketingIntro) {
            marketingIntro = text;
          }
          break;
        }
      }

      // Look for tagline badge text (e.g., "HISWA Electric Boat of the Year 2025", "Professional Workboat")
      const badges = doc.querySelectorAll('span, div');
      for (const badge of badges) {
        const text = badge.textContent?.trim() || '';
        if (text.length > 10 && text.length < 60 &&
            (text.includes('Boat') || text.includes('Professional') || text.includes('Award') || text.includes('Year'))) {
          tagline = text;
          break;
        }
      }

      // Extract key facts from the stats display
      const keyFacts: EagleboatsKeyFacts = {};

      // Look for the key facts section - typically has Length, Beam, Passengers, Max Speed
      const allText = doc.body?.textContent || '';

      // Extract Length
      const lengthMatch = allText.match(/Length(?:\s+Overall\s*\(LOA\))?\s*[:\s]*(\d+(?:\.\d+)?)\s*m\s*\|\s*(\d+(?:\.\d+)?)\s*ft/i);
      if (lengthMatch) {
        keyFacts.lengthM = parseFloat(lengthMatch[1]);
        keyFacts.lengthFt = parseFloat(lengthMatch[2]);
      }

      // Extract Beam
      const beamMatch = allText.match(/Beam(?:\s+Overall\s*\(BOA\))?\s*[:\s]*(\d+(?:\.\d+)?)\s*m\s*\|\s*(\d+(?:\.\d+)?)\s*ft/i);
      if (beamMatch) {
        keyFacts.beamM = parseFloat(beamMatch[1]);
        keyFacts.beamFt = parseFloat(beamMatch[2]);
      }

      // Extract Passengers
      const passengersMatch = allText.match(/Passengers?\s*[:\s]*(\d+)\s*person/i);
      if (passengersMatch) {
        keyFacts.passengers = parseInt(passengersMatch[1]);
      }

      // Extract Max Speed
      const speedElectricMatch = allText.match(/Max Speed.*?(\d+)\s*km\/h\s*\(?electric\)?/i);
      if (speedElectricMatch) {
        keyFacts.maxSpeedElectricKmh = parseInt(speedElectricMatch[1]);
      }

      const speedHybridMatch = allText.match(/(\d+)\s*km\/h\s*\(?hybrid\)?/i);
      if (speedHybridMatch) {
        keyFacts.maxSpeedHybridKmh = parseInt(speedHybridMatch[1]);
      }

      // Extract technical data rows
      const technicalData: EagleboatsTechnicalDataRow[] = [];

      // Common technical data labels
      const techLabels = [
        'Length Overall (LOA)',
        'Beam Overall (BOA)',
        'Draft',
        'Clearance Height',
        'Weight (Ready)',
        'Electric Drive',
        'Hybrid Option',
        'Max Speed (Electric)',
        'Max Speed (Hybrid)',
        'Passengers',
      ];

      for (const label of techLabels) {
        // Create regex to find label and its value
        const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${escapedLabel}\\s*([\\d.,]+\\s*(?:m|ft|kg|lbs|kW|pk|km\\/h|persons?|Available)[^\\n]*?)(?=(?:${techLabels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})|$)`, 'i');
        const match = allText.match(regex);

        if (match) {
          const value = match[1].trim();
          const row: EagleboatsTechnicalDataRow = { label, value };

          // Try to extract numeric value
          const numMatch = value.match(/([\d,.]+)/);
          if (numMatch) {
            row.numericValue = parseFloat(numMatch[1].replace(/,/g, ''));
          }

          // Detect unit
          if (value.includes('m |') || value.match(/\d\s*m\b/)) row.unit = 'm';
          else if (value.includes('kg')) row.unit = 'kg';
          else if (value.includes('kW')) row.unit = 'kW';
          else if (value.includes('km/h')) row.unit = 'km/h';
          else if (value.includes('person')) row.unit = 'persons';

          technicalData.push(row);
        }
      }

      // Extract images
      const images: EagleboatsImage[] = [];
      const imgElements = doc.querySelectorAll('img');
      const seenUrls = new Set<string>();

      for (const img of imgElements) {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';

        // Skip small icons, logos, and duplicates
        if (src.includes('logo') || src.includes('icon') || src.includes('.svg')) continue;
        if (src.length < 10) continue;

        // Skip duplicates
        if (seenUrls.has(src)) continue;
        seenUrls.add(src);

        // Prefer same-assets URLs or the original R2 URLs
        let imageUrl = src;
        if (src.startsWith('/')) {
          // Relative URL - prepend domain
          imageUrl = `https://eagleboats.nl${src}`;
        }

        // Only include image-like URLs
        if (imageUrl.includes('.jpeg') || imageUrl.includes('.jpg') ||
            imageUrl.includes('.png') || imageUrl.includes('.webp') ||
            imageUrl.includes('same-assets.com') || imageUrl.includes('r2.dev')) {
          images.push({
            url: imageUrl,
            captionGuess: alt || undefined,
            sourceNote: `From ${sourceUrl}`,
          });
        }
      }

      // Also look for background images in style attributes
      const elementsWithStyle = doc.querySelectorAll('[style*="background"]');
      for (const el of elementsWithStyle) {
        const style = el.getAttribute('style') || '';
        const urlMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          const bgUrl = urlMatch[1];
          if (!seenUrls.has(bgUrl) &&
              (bgUrl.includes('.jpeg') || bgUrl.includes('.jpg') ||
               bgUrl.includes('.png') || bgUrl.includes('.webp'))) {
            seenUrls.add(bgUrl);
            images.push({
              url: bgUrl,
              sourceNote: `Background from ${sourceUrl}`,
            });
          }
        }
      }

      // Determine parse confidence
      if (!modelName || !marketingIntro) {
        parseConfidence = 'LOW';
      } else if (Object.keys(keyFacts).length < 3 || technicalData.length < 3) {
        parseConfidence = 'MEDIUM';
      }

      // Create raw text fallback for low confidence parses
      let rawTextFallback: string | undefined;
      if (parseConfidence !== 'HIGH') {
        rawTextFallback = allText
          .replace(/\s+/g, ' ')
          .substring(0, 3000)
          .trim();
      }

      const candidate: EagleboatsImportCandidate = {
        modelName,
        range,
        marketingIntro,
        tagline,
        keyFacts,
        technicalData,
        images,
        source: {
          url: sourceUrl,
          fetchedAt: now(),
          pageTitle,
        },
        parseConfidence,
        rawTextFallback,
      };

      return Ok(candidate);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Err(`Failed to parse page: ${message}`);
    }
  },

  /**
   * Map import candidate to Boat Model fields.
   * Returns suggested values that user can preview and modify.
   */
  mapToBoatModelFields(candidate: EagleboatsImportCandidate): {
    coreFields: {
      name?: string;
      range?: string;
      description?: string;
    };
    specs: {
      lengthM?: number;
      beamM?: number;
      draftM?: number;
      displacementKg?: number;
      maxPassengers?: number;
    };
    salesSections: Array<{ heading: string; bodyText: string }>;
    salesImages: Array<{ sourceUrl: string; caption?: string; sourceNote: string }>;
  } {
    const result = {
      coreFields: {} as { name?: string; range?: string; description?: string },
      specs: {} as { lengthM?: number; beamM?: number; draftM?: number; displacementKg?: number; maxPassengers?: number },
      salesSections: [] as Array<{ heading: string; bodyText: string }>,
      salesImages: [] as Array<{ sourceUrl: string; caption?: string; sourceNote: string }>,
    };

    // Map core fields
    if (candidate.modelName) {
      result.coreFields.name = candidate.modelName;
    }
    if (candidate.range) {
      result.coreFields.range = candidate.range;
    }
    if (candidate.marketingIntro) {
      result.coreFields.description = candidate.marketingIntro;
    }

    // Map specs from key facts
    if (candidate.keyFacts.lengthM) {
      result.specs.lengthM = candidate.keyFacts.lengthM;
    }
    if (candidate.keyFacts.beamM) {
      result.specs.beamM = candidate.keyFacts.beamM;
    }
    if (candidate.keyFacts.passengers) {
      result.specs.maxPassengers = candidate.keyFacts.passengers;
    }

    // Also check technical data for additional specs
    for (const row of candidate.technicalData) {
      if (row.label.toLowerCase().includes('draft') && row.numericValue) {
        result.specs.draftM = row.numericValue;
      }
      if (row.label.toLowerCase().includes('weight') && row.numericValue) {
        result.specs.displacementKg = row.numericValue;
      }
    }

    // Create sales sections
    if (candidate.marketingIntro) {
      result.salesSections.push({
        heading: 'Overview',
        bodyText: candidate.marketingIntro,
      });
    }

    // Add tagline as highlight if present
    if (candidate.tagline) {
      result.salesSections.push({
        heading: 'Highlights',
        bodyText: `**${candidate.tagline}**`,
      });
    }

    // Create technical highlights section from technical data
    if (candidate.technicalData.length > 0) {
      const techLines = candidate.technicalData
        .map(row => `- **${row.label}:** ${row.value}`)
        .join('\n');
      result.salesSections.push({
        heading: 'Technical Specifications',
        bodyText: techLines,
      });
    }

    // Map images
    result.salesImages = candidate.images.slice(0, 10).map((img, idx) => ({
      sourceUrl: img.url,
      caption: img.captionGuess || `Image ${idx + 1}`,
      sourceNote: img.sourceNote,
    }));

    return result;
  },
};
