/**
 * Chat API Proxy Route (Next.js App Router)
 * Proxies requests server-side to Anthropic API to solve CORS issues
 *
 * Uses native Node.js https module for maximum compatibility
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
import https from 'https';

/**
 * Make HTTPS request using native Node.js module
 */
function makeHttpsRequest(
  hostname: string,
  path: string,
  options: { method: string; headers: Record<string, string> },
  postData: string
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: options.method,
        headers: options.headers,
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 500,
            body: data,
          });
        });
      }
    );

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

// GET handler for testing/health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Chat API is running',
    timestamp: new Date().toISOString(),
    runtime: process.env.VERCEL ? 'vercel' : 'local',
  });
}

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

    console.log('Calling Anthropic API with model:', model);

    // Prepare request data
    const postData = JSON.stringify(anthropicRequest);

    // Forward request to Anthropic API using native https module
    const response = await makeHttpsRequest(
      'api.anthropic.com',
      '/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData).toString(),
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      },
      postData
    );

    // Parse response
    let data: any;
    try {
      data = JSON.parse(response.body);
    } catch (parseError) {
      console.error('Failed to parse Anthropic response:', response.body);
      return NextResponse.json(
        {
          error: 'Invalid response from Anthropic API',
          message: parseError instanceof Error ? parseError.message : 'Parse error',
        },
        { status: 500 }
      );
    }

    // Check for errors from Anthropic
    if (response.statusCode !== 200) {
      console.error('Anthropic API error:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Anthropic API error', details: data },
        { status: response.statusCode }
      );
    }

    console.log('Anthropic API success');

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
