/**
 * Vercel Serverless Function: Chat API Proxy
 * Proxies requests to Anthropic API to avoid CORS issues
 *
 * Uses native Node.js https module (no dependencies)
 *
 * Environment Variables Required:
 * - ANTHROPIC_API_KEY
 */

const https = require('https');

/**
 * Make HTTPS request using native Node.js module
 */
function makeHttpsRequest(hostname, path, options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path,
      method: options.method,
      headers: options.headers,
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

module.exports = async function handler(req, res) {
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
          'Content-Length': Buffer.byteLength(postData),
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      },
      postData
    );

    // Parse response
    let data;
    try {
      data = JSON.parse(response.body);
    } catch (parseError) {
      console.error('Failed to parse Anthropic response:', response.body);
      return res.status(500).json({
        error: 'Invalid response from Anthropic API',
        message: parseError.message,
      });
    }

    // Check for errors from Anthropic
    if (response.statusCode !== 200) {
      console.error('Anthropic API error:', data);
      return res.status(response.statusCode).json({
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
};
