# Web IDE - Replit-lite with Local AI and Docker Sandboxes

## Overview

A production-grade web-based IDE that provides users with isolated Docker sandbox environments for running code projects, integrated AI assistance via local Ollama models, and one-click deployment to Netlify. The application features a Monaco-based code editor, real-time terminal access, file management, and live preview capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Core Technology**: React with TypeScript, using Vite as the build tool and bundler.

**UI Framework**: Utilizes shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling. The design system follows a dark-first approach optimized for development workflows, drawing inspiration from VS Code, Linear, and Replit.

**State Management**: 
- TanStack Query (React Query) for server state management and API caching
- Local React state for UI interactions
- Custom hooks for mobile detection and toast notifications

**Routing**: Wouter for lightweight client-side routing with two main routes:
- Dashboard (`/`) - Project listing and creation
- Editor (`/p/:id`) - Main IDE interface

**Key UI Components**:
- Monaco Editor for code editing with syntax highlighting and TypeScript support
- xterm.js for terminal emulation with WebSocket connectivity
- Custom file tree with context menus for file operations
- AI panel for code assistance with model selection
- Live preview iframe for running applications

### Backend Architecture

**Core Technology**: Express.js with TypeScript running on Node.js 20+

**API Design**: RESTful endpoints with WebSocket support for real-time features:
- `/api/projects` - Project CRUD operations
- `/api/projects/:id/files` - File management
- `/api/ai/complete` - AI code assistance
- `/api/deploy` - Netlify deployment
- WebSocket `/terminals/:projectId` - Interactive terminal sessions

**Storage Strategy**: PostgreSQL database with Drizzle ORM for data persistence. All users, projects, files, sandboxes, AI interactions, and deployments are stored in the database. File content is also synced to disk at `/tmp/webide-projects` for Docker bind-mounts and builds.

**Docker Integration**:
- DockerManager class orchestrates sandbox containers
- Each project runs in isolated Node.js 20 Alpine containers
- Resource limits: 0.5 CPU, 512MB RAM, 256 PID limit
- Auto-remove containers on exit
- Volume mounts project directories to `/workspace`
- Port mapping for dev servers (8000-8999 range)

**Security Model**:
- Sandboxes run with resource constraints
- Only project directories are mounted (read-write)
- Containers are ephemeral and auto-cleaned
- PostgreSQL database for persistent user data
- Demo user auto-created for MVP testing (email: demo@webide.dev)

### Data Models

**User Schema**:
- id, email, username, createdAt
- Demo user created on startup

**Project Schema**:
- id, userId, name, template, description, timestamps
- Templates: vite-react-ts, next-static, vanilla-js

**File Schema**:
- id, projectId, path, content, timestamps
- Hierarchical path structure (e.g., 'src/App.tsx')

**Sandbox Schema**:
- id, projectId, userId, containerId, port, status, timestamps
- Tracks active Docker containers per project

**Deployment Schema**:
- id, projectId, siteId, deployUrl, status, timestamps
- Records Netlify deployment history

**AI Interaction Schema**:
- id, projectId, model, prompt, response, timestamps
- Logs AI assistance requests

### External Dependencies

**Docker**: Required for sandbox execution. The application communicates with Docker daemon via dockerode library to create, manage, and destroy containers.

**Ollama AI Service**:
- Local LLM server running on http://localhost:11434
- Supported models: Qwen2.5-Coder (7B), CodeLlama (7B), DeepSeek Coder (6.7B)
- Non-blocking AI requests with 2-minute timeout
- Health check endpoint for service availability
- Optional but recommended for AI features

**Netlify API**:
- Deployment via REST API at https://api.netlify.com/api/v1
- Requires NETLIFY_ACCESS_TOKEN environment variable
- Creates zip archives of build directories
- Returns site URLs and deployment status
- Site creation and update operations

**PostgreSQL Database**:
- Production database with Drizzle ORM
- Connection via DATABASE_URL environment variable
- Tables: users, projects, files, sandboxes, ai_interactions, deployments
- File content synced to disk for Docker mounts

**WebSocket Communication**:
- 'ws' library for WebSocket server
- Bidirectional streaming for terminal I/O
- Connects browser terminal (xterm.js) to Docker container shell
- Real-time log streaming from sandbox execution

**Development Tools**:
- Vite dev server with HMR in development
- ESBuild for production bundling
- Replit-specific plugins for development experience
- TypeScript for type safety across stack