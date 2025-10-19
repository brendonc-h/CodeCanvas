# Terminal & Preview Guide

## How the Terminal and Preview Work Together

### Overview
The CodeCanvas IDE uses **Docker sandboxes** to run your code securely. Both the **Terminal** and **Preview** require a running sandbox to function.

---

## The Sandbox System

### What is a Sandbox?
A sandbox is an isolated Docker container that:
- Runs your project code
- Provides a shell for terminal commands
- Hosts the development server for preview
- Auto-cleans up after 60 seconds of inactivity or 120 seconds total runtime

### How to Start a Sandbox
Click any of these buttons in the top toolbar:
1. **Install** - Runs `npm ci` (installs dependencies)
2. **Dev** - Runs `npm run dev` (starts dev server)
3. **Build** - Runs `npm run build` (builds the project)

### Sandbox Status Indicator
Look for the **Sandbox Status Bar** above the terminal and preview:
- 🟢 **Green dot** = Sandbox running
- ⚪ **Gray dot** = No sandbox
- **Port badge** = Shows the dev server port (e.g., Port: 3000)

---

## Terminal

### How It Works
1. **WebSocket Connection** - Terminal connects to `/ws/terminal/:projectId`
2. **Requires Sandbox** - WebSocket connects to a shell inside the Docker container
3. **Real-time Communication** - Bidirectional stream between your browser and container

### Connection Status
The terminal header shows a status badge:
- 🟢 **Connected** (green, pulsing) - WebSocket active, sandbox running
- 🔴 **Error** (red) - Connection failed, no sandbox available
- 🟡 **Disconnected** (yellow) - Lost connection
- ⚪ **Connecting** (gray) - Attempting to connect

### Terminal Error Messages

#### "WebSocket connection error"
**Cause**: No sandbox is running  
**Solution**: Click **"Dev"** or **"Install"** button to start a sandbox

#### "No sandbox running. Use the Run buttons to start."
**Cause**: WebSocket connected but no active container  
**Solution**: Click any run button (Install, Dev, Build)

#### "Terminal disconnected"
**Cause**: Sandbox stopped due to inactivity or timeout  
**Solution**: Restart the sandbox with a run command

### Using the Terminal
Once connected:
```bash
$ ls                    # List files
$ npm install package   # Install packages
$ node script.js       # Run scripts
$ cat file.txt         # View files
```

**Terminal Controls:**
- 🗑️ **Clear** - Clears terminal output
- ✕ **Kill** - Sends Ctrl+C to stop running process

---

## Preview

### How It Works
1. **Dev Server Required** - Preview proxies to your app running in the sandbox
2. **Port Forwarding** - The sandbox exposes a port (e.g., 3000)
3. **Proxy Route** - `/preview/:projectId` redirects to `http://localhost:{port}`

### Preview States

#### ✅ **Working Preview**
- Sandbox is running
- Dev server started (`npm run dev`)
- Port is available
- Preview shows your app

#### ⚠️ **Preview Not Available**
**You'll see**: "Preview Not Available" page with rocket emoji  

**Causes:**
1. No sandbox running
2. Dev server not started
3. Port not exposed

**Solution:**
1. Click **"Dev"** button in toolbar
2. Wait for dev server to start (check terminal output)
3. Preview will auto-refresh when saved
4. Or click refresh button in preview header

### Auto-Refresh
Preview automatically refreshes when you:
- Save a file (Cmd/Ctrl+S)
- Click the refresh button in preview header

### Preview URL Structure
```
/preview/:projectId  →  http://localhost:{sandbox.port}
```

Example:
- Project ID: `abc123`
- Sandbox port: `3000`
- Preview URL: `/preview/abc123` → redirects to `localhost:3000`

---

## Complete Workflow

### Starting Fresh (No Sandbox)
1. Open your project in the editor
2. **Sandbox Status** shows: "No Sandbox" with gray dot
3. **Terminal** shows: "Error" status
4. **Preview** shows: "Preview Not Available" page

### Starting Dev Environment
1. Click **"Install"** button (or skip if dependencies installed)
   - Sandbox starts
   - Status changes to green dot
   - Terminal connects
   - `npm ci` runs in terminal

2. Click **"Dev"** button
   - `npm run dev` runs in terminal
   - Dev server starts (e.g., on port 3000)
   - Port badge appears in status bar
   - Preview becomes available

3. Enable Preview
   - Press **Cmd/Ctrl+P** or click **"Preview"** button
   - Preview panel opens
   - Shows your running app

### Active Development
1. Edit files in Monaco editor
2. Press **Cmd/Ctrl+S** to save
3. Preview auto-refreshes
4. Check terminal for output
5. Use terminal for commands

### When Sandbox Stops
**After 60s inactivity or 120s total runtime:**
- Sandbox auto-cleans up
- Terminal disconnects
- Preview shows "Not Available"
- Status changes to gray

**To resume:**
- Click any run button to restart sandbox

---

## Troubleshooting

### Terminal Won't Connect
**Symptom**: Red "Error" badge, connection error message

**Checklist:**
- [ ] Is sandbox running? (Check status bar)
- [ ] Click "Dev" or "Install" button
- [ ] Check browser console for WebSocket errors
- [ ] Ensure port 8000 is accessible

**Fix:**
```bash
# In your terminal (outside IDE)
docker ps  # Check if containers are running
```

### Preview Shows Blank/Error
**Symptom**: Preview iframe is empty or shows error

**Checklist:**
- [ ] Is dev server running? (Check terminal output)
- [ ] Did you run `npm run dev`?
- [ ] Is the port exposed? (Check sandbox status)
- [ ] Try refreshing preview manually

**Fix:**
1. Check terminal for dev server output:
   ```
   Local:   http://localhost:3000/
   ```
2. Ensure sandbox port matches
3. Click refresh button in preview

### "Preview Not Available" Persists
**Symptom**: Preview still shows placeholder after starting dev

**Checklist:**
- [ ] Wait 10-15 seconds for dev server to fully start
- [ ] Check terminal for "Server running" message
- [ ] Manually refresh preview
- [ ] Check sandbox has port in status bar

**Fix:**
```bash
# In terminal (within IDE)
npm run dev  # Manually run dev server
# Wait for "Server running on port 3000" message
```

### Sandbox Auto-Cleanup Too Fast
**Symptom**: Sandbox stops while actively working

**Current limits:**
- 60 seconds idle time
- 120 seconds total runtime

**Workaround:**
- Keep typing in terminal to show activity
- Run commands periodically
- Restart as needed

**Future improvement:**
Consider requesting longer timeouts in production

---

## Architecture Details

### Components Flow
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─── WebSocket (/ws/terminal/:projectId)
       │         ↓
       │    ┌────────────┐
       │    │  Terminal  │
       │    │  Handler   │
       │    └─────┬──────┘
       │          │
       │          ↓
       │    ┌────────────┐
       │    │   Docker   │
       │    │ Container  │
       │    │   Shell    │
       │    └────────────┘
       │
       └─── HTTP GET (/preview/:projectId)
                 ↓
            ┌────────────┐
            │   Proxy    │
            │  Handler   │
            └─────┬──────┘
                  │
                  ↓
            ┌────────────┐
            │   Docker   │
            │ Container  │
            │   Port     │
            └────────────┘
```

### Key Files
**Client Side:**
- `/client/src/components/editor/terminal.tsx` - Terminal UI with xterm.js
- `/client/src/components/editor/sandbox-status.tsx` - Status indicator
- `/client/src/pages/editor.tsx` - Main editor layout

**Server Side:**
- `/server/routes/index.ts` - WebSocket handler, preview proxy, sandbox API
- `/server/services/run.ts` - Sandbox creation and command execution
- `/server/docker-manager.ts` - Docker container management

### API Endpoints

#### `GET /api/projects/:id/sandbox`
Returns sandbox status:
```json
{
  "id": "sandbox_abc123",
  "containerId": "docker_xyz",
  "port": 3000,
  "status": "running",
  "createdAt": "2025-10-19T...",
  "lastActivity": "2025-10-19T..."
}
```

#### `WS /ws/terminal/:projectId`
WebSocket connection for terminal I/O
- Requires authentication (session)
- Connects to container shell
- Bidirectional data stream

#### `GET /preview/:projectId`
Preview proxy endpoint
- Redirects to `http://localhost:{sandbox.port}`
- Shows placeholder if no sandbox
- Requires authentication

#### `POST /api/runs`
Execute command in sandbox:
```json
{
  "projectId": "abc123",
  "command": ["npm", "run", "dev"]
}
```

---

## Best Practices

### 1. Start Dev Server First
Always run `npm run dev` before opening preview:
```bash
# Correct order:
1. Click "Install" (if needed)
2. Click "Dev"
3. Wait for server to start
4. Enable preview
```

### 2. Keep Sandbox Active
To prevent auto-cleanup:
- Run commands periodically
- Keep terminal active
- Interact with your app in preview

### 3. Save Frequently
- Cmd/Ctrl+S saves and refreshes preview
- Auto-refresh works only on save
- Manual refresh available anytime

### 4. Monitor Status
Watch the sandbox status bar:
- Green = Good to go
- Gray = Need to start sandbox
- Port badge = Dev server ready

### 5. Use Keyboard Shortcuts
- **Cmd/Ctrl+S** - Save (triggers preview refresh)
- **Cmd/Ctrl+J** - Toggle terminal
- **Cmd/Ctrl+P** - Toggle preview
- **Cmd/Ctrl+R** - Run dev server

---

## Quick Reference

| Action | Button | Keyboard | Result |
|--------|--------|----------|--------|
| Start sandbox | Install/Dev/Build | - | Creates Docker container |
| Open terminal | - | Cmd/Ctrl+J | Shows terminal panel |
| Save file | Save | Cmd/Ctrl+S | Saves and refreshes preview |
| Open preview | Preview | Cmd/Ctrl+P | Shows preview panel |
| Run dev | Dev | Cmd/Ctrl+R | Starts dev server |
| Refresh preview | Refresh icon | - | Manually refreshes iframe |

---

## Summary

**Remember:**
1. 🐳 **Terminal and Preview need a Docker sandbox**
2. 🟢 **Green dot = Everything works**
3. 📦 **"Dev" button starts dev server for preview**
4. 💾 **Save auto-refreshes preview**
5. ⏱️ **Sandbox auto-cleans after inactivity**

**Common Pattern:**
```
Click "Dev" → Wait for server → Open Preview → Code & Save → Auto-refresh!
```

For more help, check the terminal output for error messages or sandbox status for current state.
