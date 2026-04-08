/**
 * Chat API Proxy Route
 * Proxies requests server-side to Anthropic API to solve CORS issues
 *
 * Usage from client:
 * const response = await fetch('/api/chat', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     system: 'You are a helpful assistant',
 *     messages: [{ role: 'user', content: 'Hello' }],
 *     model: 'claude-3-5-sonnet-20241022'
 *   })
 * });
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { system, messages, model, max_tokens = 4096, temperature = 1.0 } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { error: 'model is required' },
        { status: 400 }
      );
    }

    // Build Anthropic API request
    const anthropicRequest: Record<string, any> = {
      model,
      messages,
      max_tokens,
      temperature,
    };

    // Add system prompt if provided
    if (system) {
      anthropicRequest.system = system;
    }

    // Forward request to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicRequest),
    });

    // Parse response
    const data = await response.json();

    // Check for errors from Anthropic
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Anthropic API error', details: data },
        { status: response.status }
      );
    }

    // Return successful response
    return NextResponse.json(data);

  } catch (error) {
    console.error('Chat API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Disable body size limit for large conversations
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout
