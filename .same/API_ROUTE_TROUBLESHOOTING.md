# API Route Troubleshooting Guide

## Current Status

The `/api/chat` route has been verified working **locally** and is now configured for production deployment.

## Verification Steps

### ✅ Local Verification (Completed)

```bash
curl http://localhost:3000/api/chat
# Response: {"status":"ok","message":"Chat API is running","timestamp":"...","runtime":"local"}
```

### ⚠️ Production Verification (To Test)

Visit your deployed Vercel URL and test:

```
https://your-app.vercel.app/api/chat
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Chat API is running",
  "timestamp": "2026-04-09T08:26:34.406Z",
  "runtime": "vercel"
}
```

## File Verification Checklist

| Item | Status | Location |
|------|--------|----------|
| API Route exists | ✅ | `src/app/api/chat/route.ts` |
| Exports GET handler | ✅ | Line 67 |
| Exports POST handler | ✅ | Line 75 |
| Runtime config | ✅ | `runtime = 'nodejs'` |
| Max duration | ✅ | `maxDuration = 60` |
| In git repository | ✅ | Committed and pushed |
| No conflicts | ✅ | No root `/api/chat.js` |

## Next.js Configuration

### `next.config.js`
```javascript
// ✅ No output: 'export' setting (API routes work)
// ✅ No custom server configuration
// ✅ Standard Next.js setup
```

### `vercel.json`
```json
{
  "framework": "nextjs",  // ✅ Correct
  "rewrites": [...]       // ✅ Does not affect /api routes
}
```

## Common Issues and Solutions

### Issue 1: 404 on /api/chat

**Possible Causes:**
1. Vercel deployment didn't pick up the route
2. Build failed during deployment
3. File wasn't committed to git
4. Route export syntax incorrect

**Solutions:**
1. Check Vercel deployment logs for errors
2. Verify file exists in GitHub: https://github.com/erikvandenbrand-cloud/navisol-boat-configurator/tree/master/src/app/api/chat
3. Trigger manual redeploy in Vercel dashboard
4. Check Vercel Functions tab to see if route is listed

### Issue 2: API Route Works Locally but Not in Production

**Debugging Steps:**

1. **Check Vercel Build Logs**
   - Go to Vercel Dashboard → Deployments → Latest
   - Look for errors in build output
   - Search for "api/chat" in logs

2. **Verify Route is Deployed**
   - Vercel Dashboard → Functions tab
   - Should show: `api/chat`
   - Check function size and region

3. **Test with curl**
   ```bash
   curl -v https://your-app.vercel.app/api/chat
   ```
   - Look for HTTP response code
   - Check response headers
   - Verify body content

4. **Check Environment Variables**
   ```bash
   # In Vercel Dashboard → Settings → Environment Variables
   # Ensure ANTHROPIC_API_KEY is set
   ```

### Issue 3: Route Returns 500 Error

**Possible Causes:**
1. Missing `ANTHROPIC_API_KEY` environment variable
2. Runtime error in code
3. Module import issues

**Solutions:**
1. Set environment variable in Vercel
2. Check Vercel function logs
3. Test GET endpoint first (doesn't need API key)

## Testing the API Route

### 1. Test GET Endpoint (Simple Health Check)

```bash
# Should return status info
curl https://your-app.vercel.app/api/chat
```

### 2. Test POST Endpoint (Floor Assistant)

```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "system": "You are a helpful assistant",
    "messages": [{"role": "user", "content": "Hello"}],
    "model": "claude-3-5-sonnet-20241022"
  }'
```

**Expected Response:**
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [{
    "type": "text",
    "text": "Hello! How can I help you today?"
  }],
  ...
}
```

## Vercel-Specific Debugging

### Check Function Deployment

1. Go to Vercel Dashboard
2. Select your project
3. Go to "Functions" tab
4. Look for `/api/chat`

### Check Deployment Logs

1. Go to "Deployments"
2. Click on latest deployment
3. Check "Building" phase for errors
4. Check "Runtime Logs" for function errors

### Force Redeploy

If route still returns 404:
1. Go to Deployments
2. Click "..." on latest deployment
3. Select "Redeploy"
4. Check "Use existing Build Cache" is UNCHECKED

## Next.js App Router Requirements

For API routes to work in Next.js App Router:

1. ✅ File must be named `route.ts` or `route.js`
2. ✅ Must export named functions: `GET`, `POST`, `PUT`, etc.
3. ✅ Must be in `app/api/[route-name]/route.ts` structure
4. ✅ Must use `NextRequest` and `NextResponse`
5. ✅ Can export route config: `runtime`, `maxDuration`, etc.

## Current Implementation

```typescript
// ✅ Correct Next.js App Router format
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', ... });
}

export async function POST(request: NextRequest) {
  // ... implementation
  return NextResponse.json(data);
}

export const runtime = 'nodejs';
export const maxDuration = 60;
```

## If All Else Fails

1. **Check GitHub File**
   - Visit: https://github.com/erikvandenbrand-cloud/navisol-boat-configurator/blob/master/src/app/api/chat/route.ts
   - Verify file exists and has correct content

2. **Compare with Working Route**
   - Check if `/api/import-eagleboats` works
   - Compare route.ts files for differences

3. **Check Next.js Version Compatibility**
   - Current: Next.js 16.1.1 (very new)
   - Might need to downgrade to stable version (15.x)

4. **Create Minimal Test Route**
   ```typescript
   // src/app/api/test/route.ts
   export async function GET() {
     return Response.json({ test: 'ok' });
   }
   ```

## Contact Support

If the issue persists after trying all steps:

1. **Vercel Support**
   - Dashboard → Help
   - Provide: Deployment URL, Function name, Error logs

2. **GitHub Issue**
   - Include: Build logs, Error messages, Steps to reproduce

## Success Criteria

✅ API route is listed in Vercel Functions tab
✅ GET `/api/chat` returns status object
✅ POST `/api/chat` accepts requests (may return error if no API key)
✅ Floor Assistant screen can communicate with endpoint
✅ No 404 errors in production

---

**Last Updated**: v382
**Status**: Verified working locally, awaiting production test
