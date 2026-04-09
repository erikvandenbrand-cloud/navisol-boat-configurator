# Vercel Serverless Functions

This directory contains Vercel serverless functions for the Navisol application.

## Functions

### `/api/chat.js`

Proxies chat requests to the Anthropic Claude API to avoid CORS issues and keep the API key secure.

**Environment Variables Required:**
- `ANTHROPIC_API_KEY` - Your Anthropic API key

**Request Format:**
```json
{
  "system": "System prompt (optional)",
  "messages": [
    { "role": "user", "content": "Your message" },
    { "role": "assistant", "content": "Assistant response" }
  ],
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 4096,
  "temperature": 1.0
}
```

**Response Format:**
```json
{
  "id": "msg_xxx",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "The assistant's response"
    }
  ],
  "model": "claude-3-5-sonnet-20241022",
  "usage": {
    "input_tokens": 100,
    "output_tokens": 200
  }
}
```

## Configuration

The `vercel.json` file configures these functions:

```json
{
  "functions": {
    "api/chat.js": {
      "maxDuration": 60
    }
  }
}
```

## Used By

- **Floor Assistant (Vloer Assistent)** - AI chat for production workers
- **Director Agent** - Project management insights (future)
- **AI Suggestions** - Context-aware recommendations (future)

## Local Development

When running locally with `bun run dev`, the Next.js API route at `src/app/api/chat/route.ts` is used instead. This Vercel function only runs in production deployments.

## Deployment

These functions are automatically deployed when you push to GitHub and Vercel rebuilds the app. Make sure to set the `ANTHROPIC_API_KEY` environment variable in your Vercel project settings.
