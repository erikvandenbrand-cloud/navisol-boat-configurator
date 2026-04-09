/**
 * Vercel Serverless Function: Chat API Proxy
 * Proxies requests to Anthropic API to avoid CORS issues
 *
 * Environment Variables Required:
 * - ANTHROPIC_API_KEY
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    // Parse request body
    const { system, messages, model, max_tokens = 4096, temperature = 1.0 } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    if (!model) {
      return res.status(400).json({ error: 'model is required' });
    }

    // Build Anthropic API request
    const anthropicRequest = {
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
      console.error('Anthropic API error:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'Anthropic API error',
        details: data,
      });
    }

    console.log('Anthropic API success');

    // Return successful response
    return res.status(200).json(data);

  } catch (error) {
    console.error('Chat API proxy error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
    });
  }
}
