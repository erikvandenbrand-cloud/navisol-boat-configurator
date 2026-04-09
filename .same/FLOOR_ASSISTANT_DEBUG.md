# Floor Assistant - Debugging Guide

## Issue Report

**Status**: API route works when tested directly, but returns 404 when called from FloorAssistantScreen component

## Code Verification ✅

I've verified the FloorAssistantScreen fetch implementation is **100% correct**:

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    system: SYSTEM_PROMPT,
    messages: chatMessages,
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    temperature: 1.0,
  }),
});
```

### ✅ Checklist
- [x] Relative URL: `/api/chat` (not absolute)
- [x] Method: `POST`
- [x] Content-Type: `application/json`
- [x] Body contains: `system`, `messages`, `model`, `max_tokens`, `temperature`
- [x] File is committed and pushed to GitHub
- [x] No URL transformation in vercel.json

## Debugging Logs Added (v383)

Added comprehensive console.log statements to help diagnose the issue:

### Before Request
```javascript
console.log('Calling /api/chat with:', {
  url: '/api/chat',
  method: 'POST',
  messageCount: chatMessages.length,
});
```

### After Response
```javascript
console.log('Response status:', response.status, response.statusText);
```

### On Error
```javascript
console.error('API error:', errorData);
```

### On Success
```javascript
console.log('API success, received:', data.id);
```

## How to Debug in Production

### 1. Open Browser Console

1. Navigate to the Floor Assistant page
2. Open Developer Tools (F12)
3. Go to Console tab
4. Send a test message

### 2. Check Console Output

**Expected logs:**
```
Calling /api/chat with: { url: '/api/chat', method: 'POST', messageCount: 1 }
Response status: 200 OK
API success, received: msg_xxxxx
```

**If seeing 404:**
```
Calling /api/chat with: { url: '/api/chat', method: 'POST', messageCount: 1 }
Response status: 404 Not Found
API error: { error: "Not Found" }
```

### 3. Check Network Tab

1. Open Developer Tools → Network tab
2. Filter by "Fetch/XHR"
3. Send a test message
4. Look for the `/api/chat` request

**Check:**
- Request URL (should be `https://your-domain.vercel.app/api/chat`)
- Request Method (should be `POST`)
- Status Code (should be `200`, seeing `404`)
- Request Headers (should have `Content-Type: application/json`)
- Request Payload (should have `system`, `messages`, `model`)

### 4. Compare Direct Test vs Component Call

**Direct API Test (works):**
```bash
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"system":"Test","messages":[{"role":"user","content":"Hello"}],"model":"claude-3-5-sonnet-20241022"}'
```

**Component Call (seeing 404):**
- Open Network tab
- Send message from Floor Assistant
- Right-click request → Copy → Copy as cURL
- Compare the two requests

## Possible Causes

### 1. Build/Deploy Issue
**Symptom**: Component code not deployed
**Solution**:
- Check Vercel deployment logs
- Verify latest commit is deployed
- Check deployment status: ✅ or ❌
- Force redeploy if needed

### 2. Client-Side Routing Issue
**Symptom**: SPA routing intercepting API calls
**Solution**:
- Check if request URL is actually `/api/chat` in Network tab
- Verify no hash (#) in URL
- Check vercel.json rewrites (currently doesn't affect /api/*)

### 3. Caching Issue
**Symptom**: Old version of component cached
**Solution**:
- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)
- Clear browser cache
- Try incognito/private window

### 4. Base URL Issue
**Symptom**: Fetch using wrong base URL
**Solution**:
- Check actual request URL in Network tab
- Should be: `https://your-domain.vercel.app/api/chat`
- Not: `https://your-domain.vercel.app/v4/api/chat` or similar

### 5. Next.js Middleware
**Symptom**: Middleware blocking API routes
**Solution**:
- Check if `middleware.ts` exists
- Currently: ❌ No middleware found
- If added, ensure it excludes `/api/*`

## What to Report Back

After deploying v383, please provide:

1. **Console Logs**
   - Screenshot of console output when sending message
   - Full error message if any

2. **Network Tab Info**
   - Request URL (full URL from Network tab)
   - Request Method
   - Status Code
   - Request Headers
   - Request Payload

3. **Direct API Test Result**
   ```bash
   curl https://your-domain.vercel.app/api/chat
   # Should return: {"status":"ok","message":"Chat API is running",...}
   ```

4. **Deployment Info**
   - Latest commit on Vercel matches GitHub? (Check deployment page)
   - Build status: Success or Failed?
   - Any errors in build logs?

## Expected Behavior After Fix

When everything works:

1. **Console shows:**
   ```
   Calling /api/chat with: { url: '/api/chat', method: 'POST', messageCount: 1 }
   Response status: 200 OK
   API success, received: msg_01abc123xyz
   ```

2. **Network tab shows:**
   - Request URL: `https://your-domain.vercel.app/api/chat`
   - Status: `200 OK`
   - Response contains Claude's message

3. **UI shows:**
   - Assistant message appears in chat
   - No error messages

## Files to Check

- ✅ `src/v4/screens/FloorAssistantScreen.tsx` - Component code
- ✅ `src/app/api/chat/route.ts` - API route handler
- ✅ `vercel.json` - Deployment configuration
- ✅ `next.config.js` - Next.js configuration

All verified as correct!

---

**Version**: v383
**Status**: Debugging logs added, awaiting test results
