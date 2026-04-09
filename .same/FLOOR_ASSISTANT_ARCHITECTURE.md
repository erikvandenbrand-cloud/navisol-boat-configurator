# Floor Assistant - Final Architecture

## Overview

The Floor Assistant (Vloer Assistent) is now fully operational using **Next.js App Router** architecture with native Node.js modules for API communication.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser (Client)                       │
│                                                              │
│  FloorAssistantScreen.tsx                                   │
│  ↓ fetch('/api/chat', { method: 'POST', ... })             │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Next.js App Router API Route                    │
│                                                              │
│  src/app/api/chat/route.ts                                  │
│  ↓ Native Node.js https.request()                           │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Anthropic Claude API                      │
│                                                              │
│  https://api.anthropic.com/v1/messages                      │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

### Frontend
- **`src/v4/screens/FloorAssistantScreen.tsx`**
  - React component with chat UI
  - Direct fetch() call to `/api/chat`
  - No wrapper functions or external dependencies
  - Mobile-optimized for tablet use

### Backend
- **`src/app/api/chat/route.ts`** (Next.js App Router)
  - Uses native Node.js `https` module
  - Proxies requests to Anthropic API
  - Handles authentication with `ANTHROPIC_API_KEY`
  - 60-second timeout via `export const maxDuration = 60`

### Configuration
- **`vercel.json`**
  - `framework: "nextjs"` (proper Next.js deployment)
  - No conflicting serverless function configs
  - SPA rewrites for client-side routing

## Key Technical Decisions

### ✅ Why Next.js App Router (not root /api folder)?

**Previous Issue:**
```
/api/chat.js (root serverless function)
+ vercel.json with framework: nextjs
= BUILD CONFLICT ❌
```

**Solution:**
```
src/app/api/chat/route.ts (Next.js App Router)
+ vercel.json with framework: nextjs
= CLEAN BUILD ✅
```

### ✅ Why Native Node.js https Module?

Using `fetch()` in Next.js API routes can cause build issues with babel/webpack dependencies. Native `https` module:
- Zero external dependencies
- Maximum compatibility
- No Next.js/Vercel build conflicts
- Works identically in dev and production

### ✅ Implementation Details

**Native HTTPS Request:**
```typescript
function makeHttpsRequest(
  hostname: string,
  path: string,
  options: { method: string; headers: Record<string, string> },
  postData: string
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request({ ... }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve({ statusCode: res.statusCode, body: data }); });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}
```

## Environment Variables

### Required
- **`ANTHROPIC_API_KEY`** - Your Anthropic API key
  - Set in Vercel project settings → Environment Variables
  - Set in `.env.local` for local development

## System Prompt

```
Je bent de Vloer Assistent van Navisol B.V.
Je helpt medewerkers op de werkvloer met praktisch advies.

Vraag altijd eerst:
1) Welk project is dit?
2) In welke stap van de afbouwvolgorde zit je?

Afbouwvolgorde:
1=Gronden+primer+aflak+folie
2=Vaste componenten
3=Bekabeling+leidingen
4=Interieur
5=Elektra aansluiten+testen
6=Eindtest+oplevering

Nooit direct advies zonder context. Spreektaal, direct.
```

## Access Control

| Role | Access |
|------|--------|
| ADMIN | ✅ Full access |
| OFFICE | ✅ Full access |
| PRODUCTION | ✅ Full access (Primary users!) |
| SALES | ❌ No access |

Located in sidebar under **Portfolio** section, labeled **"Vloer Assistent"**.

## Deployment

### Vercel Build Process
1. `bun install` - Install dependencies
2. `bun run build` - Build Next.js app
3. Deploy to Vercel with `framework: nextjs`
4. API route automatically deployed as serverless function

### No Manual Configuration Needed
- Next.js automatically handles API routes
- 60s timeout configured via `export const maxDuration = 60`
- Environment variables managed through Vercel UI

## Testing

### Local Development
```bash
cd navisol-boat-configurator
bun run dev
# Visit http://localhost:3000
# Login as production@eagleboats.nl
# Navigate to "Vloer Assistent"
```

### Production
```bash
# Visit your Vercel deployment URL
# Login as production@eagleboats.nl
# Navigate to "Vloer Assistent"
```

## Troubleshooting

### API Route Returns 404
- ✅ Check that `src/app/api/chat/route.ts` exists
- ✅ Verify no root `/api/chat.js` file (causes conflicts)
- ✅ Ensure `vercel.json` has `framework: "nextjs"`

### ANTHROPIC_API_KEY Not Configured
- ✅ Set in Vercel project settings → Environment Variables
- ✅ Redeploy after adding environment variable

### Build Fails with babel/webpack Errors
- ✅ Ensure using native `https` module, not `fetch()`
- ✅ Verify no root `/api` folder conflicts
- ✅ Check `vercel.json` has no `functions` config

## Evolution History

### v376 - Initial Integration
- Created FloorAssistantScreen component
- Added system prompt
- Integrated into sidebar navigation

### v378 - First Deployment Attempt
- Created `/api/chat.js` serverless function
- Used fetch() API

### v379 - Direct API Call
- FloorAssistantScreen calls `/api/chat` directly
- Removed wrapper functions

### v380 - Native HTTPS Module
- Rewrote `/api/chat.js` to use native https
- Fixed babel-code-frame errors

### v381 - Clean Architecture (Current)
- Removed root `/api/chat.js`
- Updated `src/app/api/chat/route.ts` with native https
- Proper Next.js App Router architecture
- **Production ready!**

## Conclusion

The Floor Assistant is now production-ready with:
- ✅ Clean Next.js App Router architecture
- ✅ Native Node.js modules (no build conflicts)
- ✅ Mobile-optimized UI for tablets
- ✅ Role-based access control
- ✅ Dutch language system prompt
- ✅ Context-gathering behavior

**Ready for shop floor deployment!** 🎉
