# 🎨 CodeCanvas - Professional Web IDE

> **A modern, full-featured web IDE that's cheaper than Replit!**

A production-grade web-based IDE with AI assistance (Groq, OpenAI, Grok, Claude), Git integration, mobile optimization, and one-click deployment. Deploy for **$0-5/month** vs Replit's $7/month.

## Features

### Core Functionality
- **Project Management**: Create projects from templates (Vite+React+TS, Next.js Static, Vanilla JS)
- **Monaco Editor**: Full-featured code editor with syntax highlighting, minimap, and TypeScript support
- **File Tree**: Hierarchical file navigation with create, delete, and context menu operations
- **Interactive Terminal**: Real-time terminal access to Docker containers via WebSocket (xterm.js)
- **Live Preview**: Auto-detect dev server ports and preview running applications
- **AI Code Assistant**: Multi-model support (Groq/Llama 3.3 70B, OpenAI GPT-4, Grok, Claude, MiniMax M2) for code explanation, refactoring, and generation
- **Netlify Deployment**: One-click deployment of static sites and SPAs to Netlify

### Technical Architecture
- **Frontend**: React + TypeScript + Monaco Editor + xterm.js + Tailwind CSS
- **Backend**: Express + TypeScript + WebSocket (ws)
- **Sandboxing**: Docker containers with resource limits (0.5 CPU, 512MB RAM, 256 PIDs)
- **AI**: Groq (FREE cloud API), OpenAI, Grok, Claude, MiniMax (FREE for limited time)
- **Deployment**: Netlify API integration
- **Storage**: In-memory with file system persistence

## Prerequisites

- Node.js 20+
- **Docker (Required)** - The IDE uses Docker containers for sandboxed code execution. Docker must be running and accessible via `/var/run/docker.sock`
- Groq API key (for AI features) - FREE at console.groq.com

⚠️ **Note**: This application requires Docker to be installed and running on the host system. It cannot run in environments without Docker support (like nested containers or restricted cloud environments).

## Quick Start

### 1. Install Ollama (Optional)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a code model
ollama pull qwen2.5-coder:7b

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

### 2. Set Environment Variables

The following secrets are already configured:
- `DATABASE_URL` - PostgreSQL connection (for future database integration)
- `NETLIFY_ACCESS_TOKEN` - Netlify API token for deployments
- `SESSION_SECRET` - Session encryption key

### 3. Start the Application

```bash
# Install dependencies (automatically handled by Replit)
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5000`

### 4. Configure AI Providers (Optional)

To use MiniMax or other AI providers, configure your API keys:

**Option 1: Environment Variables**
```bash
# Add to your .env file
MINIMAX_API_KEY=mm_...      # For MiniMax (free for limited time)
GROQ_API_KEY=gsk_...        # For Groq (free)
OPENAI_API_KEY=sk-...       # For OpenAI
ANTHROPIC_API_KEY=sk-ant-... # For Anthropic
GROK_API_KEY=xai-...        # For Grok
```

**Option 2: In-App Settings**
1. Open any project in the editor
2. Click the Settings button (⚙️) in the toolbar
3. Enter your MiniMax API key
4. Click Save

**Getting API Keys:**
- **MiniMax** (FREE for limited time): https://platform.minimax.io
- **Groq** (FREE): https://console.groq.com/keys
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/settings/keys
- **Grok**: https://console.x.ai

## Usage Guide

### Creating a Project

1. Click "New Project" on the dashboard
2. Enter a project name
3. Select a template:
   - **Vite + React + TypeScript**: Modern React app with Vite bundler
   - **Next.js Static**: Next.js with static site generation
   - **Vanilla JavaScript**: Plain HTML, CSS, and JS
4. Click "Create Project"

### Using the Editor

**File Operations:**
- Click files in the tree to open them
- Right-click folders to create new files
- Right-click files to delete them
- Press `Cmd+S` (Mac) or `Ctrl+S` (Windows) to save

**Running Commands:**
- **Install**: Runs `npm ci` to install dependencies
- **Dev**: Starts the development server
- **Build**: Builds the project for production
- **Deploy**: Deploys to Netlify

**Terminal:**
- Interactive shell access to your Docker sandbox
- All standard shell commands available
- Auto-connects when sandbox is created

**AI Assistant:**
- Select a provider (Groq, OpenAI, Anthropic, Grok, or MiniMax)
- Select a model from the available options
- Choose mode: Explain, Refactor, Generate, Review, or Test
- Type your question or requirement
- Click "Apply" to insert AI-generated code into the editor
- Configure API keys via the Settings button (⚙️) in the toolbar

**Preview:**
- Toggle preview panel with the Preview button
- Auto-detects dev server on ports 5173, 3000, or 8000
- Refreshes automatically when dev server restarts

### Deploying to Netlify

1. Click the "Deploy" button
2. (Optional) Enter a Netlify Site ID to update an existing site
3. Click "Deploy"
4. Wait for the build to complete
5. Your site will be live at the provided URL

## Project Structure

```
/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── editor/   # Editor-specific components
│   │   │   └── ui/       # Shadcn UI primitives
│   │   ├── pages/        # Route pages (Dashboard, Editor)
│   │   └── lib/          # Utilities and config
│   └── index.html
│
├── server/                # Backend Express application
│   ├── routes.ts         # API routes and WebSocket handlers
│   ├── storage.ts        # In-memory data storage
│   ├── file-sync.ts      # File system persistence
│   ├── docker-manager.ts # Docker container orchestration
│   ├── ollama-client.ts  # AI model integration
│   ├── netlify-deploy.ts # Deployment logic
│   └── index.ts          # Server entry point
│
├── shared/               # Shared types and schemas
│   └── schema.ts        # Data models and templates
│
└── design_guidelines.md  # Frontend design system
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create new project
- `DELETE /api/projects/:id` - Delete project

### Files
- `GET /api/projects/:id/files` - List project files
- `POST /api/projects/:id/files` - Create file
- `PUT /api/projects/:id/files` - Update file
- `DELETE /api/projects/:id/files` - Delete file

### Sandbox
- `POST /api/runs` - Execute command in sandbox
- `WS /ws/terminal/:projectId` - Interactive terminal WebSocket

### AI
- `GET /api/ai/models?provider={provider}` - List available models for a provider
- `GET /api/ai/health?provider={provider}` - Check provider health status
- `POST /api/ai/complete` - Get AI code completion

### Settings
- `GET /api/settings` - Get user settings
- `POST /api/settings` - Save user setting
- `DELETE /api/settings/:key` - Delete user setting

### Deployment
- `POST /api/deploy/netlify` - Deploy to Netlify
- `GET /preview/:projectId` - Preview running application

## Security & Limits

### Sandbox Isolation
- Containers run as non-root user (`node`)
- Resource limits: 0.5 CPU, 512MB RAM, 256 processes max
- Project directory bind-mounted read-write
- Auto-cleanup: 60s idle timeout, 120s max runtime

### Rate Limits
- 1 active sandbox per user
- New sandbox automatically terminates existing one
- Cleanup job runs every 30 seconds

### Data Persistence
- Projects stored in memory during session
- Files synced to `/tmp/webide-projects/{projectId}/`
- Sandboxes are ephemeral (containers auto-removed)

## Development

### Adding New Templates

Edit `shared/schema.ts` and add to `templateConfigs`:

```typescript
'my-template': {
  name: 'My Template',
  description: 'Description here',
  devCommand: 'npm run dev',
  buildCommand: 'npm run build',
  installCommand: 'npm ci',
  defaultPort: 3000,
  files: {
    'package.json': '...',
    'index.html': '...',
    // ... more files
  }
}
```

### Customizing the Design

All design tokens are in:
- `client/src/index.css` - Color variables and theme
- `tailwind.config.ts` - Tailwind configuration
- `design_guidelines.md` - Complete design system documentation

### Environment Variables

- `PORT` - Server port (default: 5000)
- `OLLAMA_BASE_URL` - Ollama API URL (default: http://localhost:11434)
- `NETLIFY_ACCESS_TOKEN` - Netlify API token
- `DATABASE_URL` - PostgreSQL connection string (for future use)

## Troubleshooting

### Ollama not working
- Ensure Ollama is running: `ollama serve`
- Check models are pulled: `ollama list`
- Verify API: `curl http://localhost:11434/api/tags`

### Docker sandbox fails to start
- Ensure Docker is running: `docker ps`
- Check Docker socket access: `ls -la /var/run/docker.sock`
- Verify Docker permissions: `docker run hello-world`
- Check available ports: `lsof -i :8000-9000`
- Review container logs: `docker logs <container-id>`
- **Replit/Cloud environments**: Docker-in-Docker is not supported. Run on local machine or VM with Docker installed

### Netlify deployment fails
- Verify NETLIFY_ACCESS_TOKEN is set
- Ensure project has been built first
- Check build directory exists (dist/out/.)

### Terminal not connecting
- Ensure sandbox is created (run Install/Dev first)
- Check WebSocket connection in browser DevTools
- Verify Docker container is running: `docker ps`

## Future Roadmap

### Phase 2
- Database persistence (Postgres/Drizzle ORM)
- User authentication (Supabase Auth)
- Team workspaces and collaboration
- Version control (Git integration)
- More templates and frameworks

### Phase 3
- Real-time collaborative editing
- Custom domain support
- Advanced AI features (code review, test generation)
- Performance monitoring
- Template marketplace

## Contributing

This is a production MVP. For bugs or feature requests, please create an issue with:
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser/system information

## License

MIT License - see LICENSE file for details
