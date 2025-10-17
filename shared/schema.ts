import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  template: text("template").notNull(), // 'vite-react-ts' | 'next-static' | 'vanilla-js'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Files table
export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  path: text("path").notNull(), // e.g., 'src/App.tsx' or 'package.json'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// Sandboxes table - tracks running containers
export const sandboxes = pgTable("sandboxes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  containerId: text("container_id"), // Docker container ID
  status: text("status").notNull(), // 'running' | 'stopped' | 'idle'
  port: integer("port"), // Exposed port for preview
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSandboxSchema = createInsertSchema(sandboxes).omit({
  id: true,
  createdAt: true,
});

export type InsertSandbox = z.infer<typeof insertSandboxSchema>;
export type Sandbox = typeof sandboxes.$inferSelect;

// AI Interactions table
export const aiInteractions = pgTable("ai_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  model: text("model").notNull(), // 'qwen2.5-coder:7b' | 'codellama:7b' etc.
  prompt: text("prompt").notNull(),
  response: text("response"),
  filePath: text("file_path"), // Context file
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiInteractionSchema = createInsertSchema(aiInteractions).omit({
  id: true,
  createdAt: true,
});

export type InsertAiInteraction = z.infer<typeof insertAiInteractionSchema>;
export type AiInteraction = typeof aiInteractions.$inferSelect;

// Deployments table
export const deployments = pgTable("deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  siteId: text("site_id"), // Netlify site ID
  deployUrl: text("deploy_url"), // Deployed URL
  status: text("status").notNull(), // 'pending' | 'building' | 'success' | 'failed'
  buildLog: text("build_log"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({
  id: true,
  createdAt: true,
});

export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;

// Template configurations
export const templateConfigs = {
  'vite-react-ts': {
    name: 'Vite + React + TypeScript',
    description: 'Modern React app with Vite bundler and TypeScript',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    installCommand: 'npm ci',
    defaultPort: 5173,
    files: {
      'package.json': JSON.stringify({
        name: 'vite-react-app',
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite --host 0.0.0.0 --port 5173',
          build: 'tsc && vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@vitejs/plugin-react': '^4.0.0',
          typescript: '^5.0.0',
          vite: '^5.0.0',
        },
      }, null, 2),
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
      'src/App.tsx': `function App() {
  return (
    <div className="app">
      <h1>Hello from Vite + React + TypeScript!</h1>
      <p>Start editing to see changes.</p>
    </div>
  )
}

export default App`,
      'src/index.css': `body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  place-items: center;
  min-height: 100vh;
  background: #242424;
  color: #fff;
}

.app {
  text-align: center;
  padding: 2rem;
}`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
        },
        include: ['src'],
      }, null, 2),
      'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})`,
    },
  },
  'next-static': {
    name: 'Next.js (Static Export)',
    description: 'Next.js app with static site generation',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    installCommand: 'npm ci',
    defaultPort: 3000,
    files: {
      'package.json': JSON.stringify({
        name: 'next-static-app',
        version: '0.1.0',
        scripts: {
          dev: 'next dev -H 0.0.0.0 -p 3000',
          build: 'next build',
          start: 'next start',
        },
        dependencies: {
          next: '^14.0.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          '@types/node': '^20.0.0',
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          typescript: '^5.0.0',
        },
      }, null, 2),
      'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
}

module.exports = nextConfig`,
      'app/page.tsx': `export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Hello from Next.js Static!</h1>
      <p>This is a static export configuration.</p>
    </main>
  )
}`,
      'app/layout.tsx': `export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          paths: {
            '@/*': ['./*'],
          },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
        exclude: ['node_modules'],
      }, null, 2),
    },
  },
  'vanilla-js': {
    name: 'Vanilla JavaScript',
    description: 'Plain HTML, CSS, and JavaScript',
    devCommand: 'python3 -m http.server 8000',
    buildCommand: 'echo "No build step needed"',
    installCommand: 'echo "No dependencies to install"',
    defaultPort: 8000,
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vanilla JS App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <h1>Hello from Vanilla JavaScript!</h1>
    <p>Edit the files to see changes.</p>
    <button id="btn">Click me</button>
    <p id="output"></p>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  place-items: center;
  min-height: 100vh;
  background: #242424;
  color: #fff;
}

#app {
  text-align: center;
  padding: 2rem;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
  margin-top: 1rem;
}

button:hover {
  background: #535bf2;
}`,
      'script.js': `document.getElementById('btn').addEventListener('click', function() {
  document.getElementById('output').textContent = 'Button clicked! ' + new Date().toLocaleTimeString();
});`,
    },
  },
} as const;

export type TemplateType = keyof typeof templateConfigs;
