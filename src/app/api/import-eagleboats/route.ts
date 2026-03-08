/**
 * API Route: Import from eagleboats.nl
 *
 * Fetches a single Eagle Boats model page server-side to avoid CORS issues.
 * This is an explicit user action - no crawling, no background sync.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL is from eagleboats.nl
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.includes('eagleboats.nl')) {
        return NextResponse.json(
          { error: 'URL must be from eagleboats.nl' },
          { status: 400 }
        );
      }
      if (!parsed.pathname.includes('/models/')) {
        return NextResponse.json(
          { error: 'URL must be a model page (should contain /models/)' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Navisol/1.0 (Import Tool)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Encode HTML as base64 to avoid JSON serialization issues with special characters
    const htmlBase64 = Buffer.from(html, 'utf-8').toString('base64');

    return NextResponse.json({ htmlBase64, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch page: ${message}` },
      { status: 500 }
    );
  }
}
