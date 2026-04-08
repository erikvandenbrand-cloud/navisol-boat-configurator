# AI Assistant Setup Guide

## Overview

Navisol OS now includes server-side integration with Anthropic's Claude API, enabling AI-powered features like:
- **Vloer Assistent** (Floor Assistant) - Helps production workers on the shop floor
- **Director Agent** - Provides project management insights and recommendations
- **AI Suggestions** - Throughout the app for configuration, quotes, and documentation

## Architecture

```
Client (Browser)
    ↓
Next.js API Route (/api/chat)
    ↓
Anthropic API (https://api.anthropic.com/v1/messages)
```

**Why use a proxy route?**
- ✅ Solves CORS issues (browser cannot call Anthropic API directly)
- ✅ Keeps API key secret (server-side only)
- ✅ Adds request logging and error handling
- ✅ Enables rate limiting and caching (future)

## Setup Instructions

### 1. Get an Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy your API key (starts with `sk-ant-`)

### 2. Add to Environment Variables

**Option A: Local Development**

Edit `.env.local`:

```bash
# Anthropic API Configuration
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**Option B: Production Deployment**

Add the environment variable in your deployment platform:

- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- **Docker**: Pass via `-e ANTHROPIC_API_KEY=...`

### 3. Restart the Dev Server

```bash
# Stop the current server (Ctrl+C)
bun run dev

# Or for production:
bun run build
bun run start
```

### 4. Verify It Works

**Test the API route directly:**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {"role": "user", "content": "Hello, Claude!"}
    ]
  }'
```

**Expected response:**

```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "model": "claude-3-5-sonnet-20241022",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 15
  }
}
```

## Usage in Code

### Simple Example

```typescript
import { callClaude } from '@/lib/anthropic';

const response = await callClaude({
  system: 'You are a helpful boat configuration assistant',
  messages: [
    { role: 'user', content: 'What propulsion system should I choose?' }
  ],
});

if (response.ok) {
  console.log(response.data.content[0].text);
} else {
  console.error(response.error);
}
```

### Conversation Example

```typescript
import { ClaudeConversation } from '@/lib/anthropic';

const conversation = new ClaudeConversation({
  system: 'You are a helpful assistant',
  model: 'claude-3-5-sonnet-20241022',
});

// Send first message
const response1 = await conversation.send('Hello, what can you do?');
if (response1.ok) {
  console.log(response1.response);
}

// Continue conversation
const response2 = await conversation.send('Tell me more about boats');
if (response2.ok) {
  console.log(response2.response);
}

// Get full history
console.log(conversation.getHistory());
```

### Floor Assistant Example

```typescript
import { askFloorAssistant } from '@/lib/anthropic';

const answer = await askFloorAssistant(
  'Where can I find the battery pack for Eagle 32?'
);
console.log(answer);
```

### Director Agent Example

```typescript
import { askDirectorAgent } from '@/lib/anthropic';

const advice = await askDirectorAgent(
  {
    projectTitle: 'Eagle 32 - Johan Bakker',
    projectType: 'NEW_BUILD',
    currentStatus: 'IN_PRODUCTION',
    openTasks: 12,
  },
  'What should I prioritize this week?'
);
console.log(advice);
```

## API Route Details

### Endpoint

```
POST /api/chat
```

### Request Body

```typescript
{
  system?: string;           // System prompt (optional)
  messages: Array<{          // Conversation messages (required)
    role: 'user' | 'assistant';
    content: string;
  }>;
  model?: string;            // Claude model (default: claude-3-5-sonnet-20241022)
  max_tokens?: number;       // Max response tokens (default: 4096)
  temperature?: number;      // Randomness 0-1 (default: 1.0)
}
```

### Response (Success)

```typescript
{
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

### Response (Error)

```typescript
{
  error: string;
  message?: string;
  details?: any;
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad request (missing required fields)
- `500` - Server error or Anthropic API error

## Available Models

| Model | Description | Max Tokens | Use Case |
|-------|-------------|------------|----------|
| `claude-3-5-sonnet-20241022` | Latest, most capable | 200K | Complex reasoning, long documents |
| `claude-3-5-haiku-20241022` | Fast, efficient | 200K | Quick responses, simple tasks |
| `claude-3-opus-20240229` | Most powerful (older) | 200K | Very complex tasks |

**Recommended**: Use `claude-3-5-sonnet-20241022` for most features.

## Cost Considerations

**Pricing (as of 2024):**

- **Claude 3.5 Sonnet**:
  - Input: $3 per million tokens
  - Output: $15 per million tokens

- **Claude 3.5 Haiku**:
  - Input: $0.80 per million tokens
  - Output: $4 per million tokens

**Example costs:**

- **Floor Assistant** (100 words question + 200 words answer):
  - ~150 input tokens + 300 output tokens
  - Cost: ~$0.005 (half a cent)

- **Director Agent** (500 words context + 500 words response):
  - ~750 input tokens + 750 output tokens
  - Cost: ~$0.013 (1.3 cents)

**Budget planning:**
- 1,000 assistant queries/month ≈ $5-20 depending on usage
- Monitor usage in Anthropic Console
- Set budget alerts in console settings

## Security Best Practices

### ✅ DO

- ✅ Keep `ANTHROPIC_API_KEY` in `.env.local` (never commit to git)
- ✅ Use the `/api/chat` proxy route (never call Anthropic API from client)
- ✅ Validate user input before sending to Claude
- ✅ Implement rate limiting for user requests
- ✅ Log requests for monitoring and debugging

### ❌ DON'T

- ❌ Never expose API key in client-side code
- ❌ Never commit `.env.local` to git
- ❌ Never allow unlimited requests (add rate limits)
- ❌ Never send sensitive customer data without consent
- ❌ Never trust AI responses without validation

## Rate Limiting (TODO)

Future enhancement: Add rate limiting to `/api/chat` to prevent abuse:

```typescript
// Example: 10 requests per minute per user
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests
});
```

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"

**Solution**: Make sure `.env.local` exists and contains:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

Then restart the dev server.

### "CORS error"

**Solution**: Make sure you're calling `/api/chat`, NOT the Anthropic API directly:

❌ Wrong:
```typescript
fetch('https://api.anthropic.com/v1/messages', ...)
```

✅ Correct:
```typescript
fetch('/api/chat', ...)
```

### "Rate limit exceeded"

**Solution**: You've hit Anthropic's rate limits. Wait a moment or:
1. Check your Anthropic Console for rate limits
2. Upgrade your Anthropic plan
3. Implement caching to reduce requests

### "Invalid API key"

**Solution**:
1. Verify your API key in Anthropic Console
2. Make sure there are no extra spaces in `.env.local`
3. Regenerate a new API key if needed

## Next Steps

1. ✅ Set up `ANTHROPIC_API_KEY` in `.env.local`
2. ✅ Test the `/api/chat` endpoint
3. ✅ Implement Floor Assistant UI
4. ✅ Implement Director Agent UI
5. ⏳ Add AI suggestions to Quote screen
6. ⏳ Add AI suggestions to Configuration screen
7. ⏳ Add streaming support for real-time responses
8. ⏳ Add rate limiting and caching
9. ⏳ Add usage monitoring dashboard

## References

- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Claude Model Comparison](https://docs.anthropic.com/claude/docs/models-overview)
- [Anthropic Console](https://console.anthropic.com/)
- [Pricing](https://www.anthropic.com/pricing)

---

*Last Updated: April 3, 2026*
*Version: 1.0*
