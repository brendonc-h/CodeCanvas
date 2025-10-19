# Debug Checklist - Buttons Not Working

## When buttons click but nothing happens, check these in order:

### 1. Open Browser Console
Press **F12** or **Cmd+Option+I** and look at the **Console** tab

**Look for:**
- Red errors when clicking Install/Dev buttons
- Network errors (401, 403, 500)
- "Failed to fetch" errors

### 2. Check Network Tab
In browser DevTools, go to **Network** tab

**When you click Install:**
- Should see POST to `/api/runs`
- Check the Status code (should be 200)
- If 401 → Not logged in
- If 403 → Permission denied
- If 500 → Server error

**Click on the failed request and check:**
- **Headers** tab → Request payload
- **Response** tab → Error message

### 3. Are You Logged In?
Open console and type:
```javascript
fetch('/api/auth/me').then(r => r.json()).then(console.log)
```

**Should show:**
```json
{
  "id": "...",
  "username": "...",
  "email": "..."
}
```

**If error:**
```json
{"error": "Authentication required"}
```
→ You're not logged in! Go to `/auth` and login

### 4. Check Docker
In your terminal (outside IDE):
```bash
docker ps
```

**Should show:**
- Docker is running
- Maybe some containers

**If error:**
```
Cannot connect to the Docker daemon
```
→ Start Docker Desktop (Mac) or Docker service

### 5. Check Server Logs
In the terminal where you ran `npm run dev`, look for errors when clicking buttons

**Should see:**
```
POST /api/runs - 200 - 123ms
```

**If you see errors:**
```
Error: Docker not available
Error: Cannot connect to database
```
→ Check Docker or DATABASE_URL

### 6. Check Project ID
Open console and type:
```javascript
window.location.pathname
```

**Should show:**
```
/p/your-project-id
```

**If it's `/` or something else:**
→ You're not in a project! Go to dashboard and open a project

### 7. Test API Directly
Open a new terminal and test:
```bash
# Replace PROJECT_ID with your actual project ID
curl -X POST http://localhost:8000/api/runs \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "projectId": "PROJECT_ID",
    "command": ["echo", "test"]
  }'
```

**Expected response:**
```json
{"success": true, ...}
```

**If error:**
```json
{"error": "..."}
```

---

## Most Common Issues:

### Issue #1: Not Logged In (90% of cases)
**Symptoms:**
- Buttons do nothing
- No errors in console
- Network shows 401

**Fix:**
1. Go to http://localhost:5000/auth
2. Login with demo/demo or create account
3. Go back to editor

### Issue #2: Docker Not Running
**Symptoms:**
- Error toast: "Command failed"
- Console: "Docker not available"

**Fix:**
```bash
# Mac: Start Docker Desktop
open -a Docker

# Linux:
sudo systemctl start docker
```

### Issue #3: Database Connection Failed
**Symptoms:**
- Error: "Cannot connect to database"
- Buttons don't respond

**Fix:**
Check your `.env` file has:
```env
DATABASE_URL=postgresql://...
```

### Issue #4: Session Expired
**Symptoms:**
- Was working before
- Now buttons don't work
- 401 errors

**Fix:**
- Refresh page and login again
- Or clear cookies and re-login

---

## Quick Test Script

Paste this in browser console to diagnose:
```javascript
(async () => {
  console.log('=== CodeCanvas Debug ===');
  
  // 1. Check auth
  try {
    const auth = await fetch('/api/auth/me').then(r => r.json());
    console.log('✓ Logged in as:', auth.username);
  } catch (e) {
    console.error('✗ Not logged in:', e);
    return;
  }
  
  // 2. Check project ID
  const projectId = window.location.pathname.split('/').pop();
  console.log('Project ID:', projectId);
  
  // 3. Test run command
  try {
    const result = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: projectId,
        command: ['echo', 'test']
      })
    }).then(r => r.json());
    console.log('✓ Run command works:', result);
  } catch (e) {
    console.error('✗ Run command failed:', e);
  }
})();
```

---

## After Running Debug Script

**If all checks pass (✓):**
→ It's working! Try clicking Install again

**If auth fails (✗):**
→ Login at /auth

**If run command fails (✗):**
→ Check the error message, likely Docker or permissions

---

## Still Not Working?

Check browser console for the EXACT error message and:
1. Copy the full error
2. Check what endpoint failed (Network tab)
3. Look at the Response body
4. Share the error for more specific help
