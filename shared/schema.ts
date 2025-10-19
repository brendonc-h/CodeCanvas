import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash"),
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
  teamId: varchar("team_id").references(() => teams.id, { onDelete: "set null" }), // Optional team ownership
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
  provider: text("provider").notNull(), // 'ollama', 'openai', 'anthropic'
  model: text("model").notNull(), // 'qwen2.5-coder:7b' | 'gpt-4' | 'claude-3-sonnet'
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
  fileSnapshot: text("file_snapshot"), // JSON string of files at deployment time
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({
  id: true,
  createdAt: true,
});

export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;

// Teams table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Team members table
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'admin' | 'member'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

// User settings table for API keys and preferences
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(), // e.g., 'openai_api_key', 'anthropic_api_key'
  value: text("value"), // encrypted API key
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSettingSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserSetting = z.infer<typeof insertUserSettingSchema>;
export type UserSetting = typeof userSettings.$inferSelect;

// Git repositories table
export const gitRepositories = pgTable("git_repositories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url"), // GitHub URL if connected
  provider: text("provider").notNull(), // 'github' | 'gitlab' | 'bitbucket'
  owner: text("owner"), // GitHub username/org
  repo: text("repo"), // Repository name
  branch: text("branch").default("main"),
  isConnected: boolean("is_connected").default(false),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGitRepositorySchema = createInsertSchema(gitRepositories).omit({
  id: true,
  createdAt: true,
});

export type InsertGitRepository = z.infer<typeof insertGitRepositorySchema>;
export type GitRepository = typeof gitRepositories.$inferSelect;

// Git commits table
export const gitCommits = pgTable("git_commits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repositoryId: varchar("repository_id").notNull().references(() => gitRepositories.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sha: text("sha").notNull(),
  message: text("message").notNull(),
  author: text("author").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGitCommitSchema = createInsertSchema(gitCommits).omit({
  id: true,
  createdAt: true,
});

export type InsertGitCommit = z.infer<typeof insertGitCommitSchema>;
export type GitCommit = typeof gitCommits.$inferSelect;

// Resource usage table
export const resourceUsage = pgTable("resource_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  resourceType: text("resource_type").notNull(), // 'cpu', 'memory', 'ai_tokens', 'deployments', 'sandboxes'
  amount: integer("amount").notNull(), // Amount used (MB, tokens, seconds, etc.)
  unit: text("unit").notNull(), // 'MB', 'tokens', 'seconds', 'count'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Metrics dashboard table
export const metrics = pgTable("metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: text("metric_type").notNull(), // 'active_users', 'total_projects', 'ai_requests', etc.
  value: integer("value").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertResourceUsageSchema = createInsertSchema(resourceUsage).omit({
  id: true,
  createdAt: true,
});

export const insertMetricSchema = createInsertSchema(metrics).omit({
  id: true,
  timestamp: true,
});

// Shared templates table
export const sharedTemplates = pgTable("shared_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  template: text("template").notNull(), // Base template type
  files: jsonb("files").notNull(), // Template files as JSON
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(true),
  tags: jsonb("tags"), // Array of tags
  downloads: integer("downloads").default(0),
  rating: integer("rating").default(0), // Average rating 1-5
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Template ratings table
export const templateRatings = pgTable("template_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => sharedTemplates.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSharedTemplateSchema = createInsertSchema(sharedTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateRatingSchema = createInsertSchema(templateRatings).omit({
  id: true,
  createdAt: true,
});

export type InsertResourceUsage = z.infer<typeof insertResourceUsageSchema>;
export type ResourceUsage = typeof resourceUsage.$inferSelect;
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Metric = typeof metrics.$inferSelect;
export type InsertSharedTemplate = z.infer<typeof insertSharedTemplateSchema>;
export type SharedTemplate = typeof sharedTemplates.$inferSelect;
export type InsertTemplateRating = z.infer<typeof insertTemplateRatingSchema>;
export type TemplateRating = typeof templateRatings.$inferSelect;

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
  'vue3-vite-ts': {
    name: 'Vue 3 + Vite + TypeScript',
    description: 'Modern Vue 3 app with Vite bundler and TypeScript',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    installCommand: 'npm ci',
    defaultPort: 5173,
    files: {
      'package.json': JSON.stringify({
        name: 'vue3-vite-app',
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite --host 0.0.0.0 --port 5173',
          build: 'vue-tsc && vite build',
          preview: 'vite preview',
        },
        dependencies: {
          vue: '^3.4.0',
        },
        devDependencies: {
          '@vitejs/plugin-vue': '^5.0.0',
          typescript: '^5.0.0',
          'vue-tsc': '^2.0.0',
          vite: '^5.0.0',
        },
      }, null, 2),
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue 3 + Vite + TS</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
      'src/main.ts': `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')`,
      'src/App.vue': `<template>
  <div class="app">
    <h1>Hello from Vue 3 + Vite + TypeScript!</h1>
    <p>Start editing to see changes.</p>
  </div>
</template>

<script setup lang="ts">
// Component logic here
</script>

<style scoped>
.app {
  text-align: center;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>`,
      'src/components/HelloWorld.vue': `<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <p>
      For a guide and recipes on how to configure / customize this project,<br>
      check out the
      <a href="https://vuejs.org/guide/introduction.html" target="_blank">Vue documentation</a>.
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  msg: string
}>()
</script>

<style scoped>
.hello {
  text-align: center;
}
</style>`,
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
          jsx: 'preserve',
          strict: true,
          moduleDetection: 'force',
        },
        include: ['src/**/*.ts', 'src/**/*.d.ts', 'src/**/*.tsx', 'src/**/*.vue'],
      }, null, 2),
      'vite.config.ts': `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})`,
      'src/vite-env.d.ts': `/// <reference types="vite/client" />`,
    },
  },
  'sveltekit': {
    name: 'SvelteKit',
    description: 'Full-stack web framework powered by Svelte',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    installCommand: 'npm ci',
    defaultPort: 5173,
    files: {
      'package.json': JSON.stringify({
        name: 'sveltekit-app',
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite dev --host 0.0.0.0 --port 5173',
          build: 'vite build',
          preview: 'vite preview',
          check: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
          'check:watch': 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch',
        },
        devDependencies: {
          '@sveltejs/adapter-auto': '^3.0.0',
          '@sveltejs/kit': '^2.0.0',
          '@sveltejs/vite-plugin-svelte': '^3.0.0',
          svelte: '^4.0.0',
          'svelte-check': '^3.0.0',
          tslib: '^2.0.0',
          typescript: '^5.0.0',
          vite: '^5.0.0',
        },
      }, null, 2),
      'svelte.config.js': `import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
};

export default config;`,
      'tsconfig.json': JSON.stringify({
        extends: './.svelte-kit/tsconfig.json',
        compilerOptions: {
          allowJs: true,
          checkJs: true,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          skipLibCheck: true,
          sourceMap: true,
          strict: true,
        },
      }, null, 2),
      'vite.config.ts': `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});`,
      'src/app.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>`,
      'src/routes/+page.svelte': `<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>`,
      'src/routes/+page.ts': `import type { PageLoad } from './$types';

export const load: PageLoad = () => {
  return {
    title: 'Hello SvelteKit',
  };
};`,
      'src/routes/+layout.ts': `export const prerender = true;`,
    },
  },
  'next-server-components': {
    name: 'Next.js (Server Components)',
    description: 'Next.js app with App Router and Server Components',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    installCommand: 'npm ci',
    defaultPort: 3000,
    files: {
      'package.json': JSON.stringify({
        name: 'next-server-components-app',
        version: '0.1.0',
        scripts: {
          dev: 'next dev -H 0.0.0.0 -p 3000',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
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
          eslint: '^8.0.0',
          'eslint-config-next': '^14.0.0',
          typescript: '^5.0.0',
        },
      }, null, 2),
      'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

module.exports = nextConfig`,
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
          plugins: [
            {
              name: 'next',
            },
          ],
          paths: {
            '@/*': ['./*'],
          },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      }, null, 2),
      'app/layout.tsx': `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Next.js Server Components',
  description: 'Generated by create next app',
}

export default function RootLayout({
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
      'app/page.tsx': `import { Suspense } from 'react'

async function ServerComponent() {
  // Simulate server-side data fetching
  await new Promise(resolve => setTimeout(resolve, 100))

  return (
    <div>
      <h2>This is a Server Component</h2>
      <p>Rendered on the server at build time or request time.</p>
    </div>
  )
}

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Hello from Next.js Server Components!</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <ServerComponent />
      </Suspense>
    </main>
  )
}`,
      'app/loading.tsx': `export default function Loading() {
  return <div>Loading...</div>
}`,
      '.eslintrc.json': JSON.stringify({
        extends: 'next/core-web-vitals',
      }, null, 2),
    },
  },
  'node-express-api': {
    name: 'Node.js + Express API',
    description: 'REST API server with Express.js and TypeScript',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    installCommand: 'npm ci',
    defaultPort: 3000,
    files: {
      'package.json': JSON.stringify({
        name: 'node-express-api',
        version: '1.0.0',
        description: 'Express API server',
        main: 'dist/index.js',
        scripts: {
          dev: 'tsx watch src/index.ts',
          build: 'tsc',
          start: 'node dist/index.js',
        },
        dependencies: {
          express: '^4.18.0',
          cors: '^2.8.5',
          helmet: '^7.0.0',
          'express-rate-limit': '^7.0.0',
        },
        devDependencies: {
          '@types/express': '^4.17.0',
          '@types/cors': '^2.8.17',
          '@types/node': '^20.0.0',
          tsx: '^4.0.0',
          typescript: '^5.0.0',
        },
      }, null, 2),
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          lib: ['ES2020'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
        },
        include: ['src/**/*'],
      }, null, 2),
      'src/index.ts': `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express API!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/users', (req, res) => {
  // Mock data
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];
  res.json(users);
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
      'src/routes/users.ts': `import { Router } from 'express';

const router = Router();

// GET /api/users
router.get('/', (req, res) => {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];
  res.json(users);
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = { id: userId, name: 'John Doe', email: 'john@example.com' };
  res.json(user);
});

export default router;`,
      'src/middleware/auth.ts': `import { Request, Response, NextFunction } from 'express';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  // Simple auth middleware - in production, verify JWT tokens
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // For demo purposes, accept any token
  next();
}`,
    },
  },
  'python-flask': {
    name: 'Python Flask',
    description: 'Lightweight WSGI web application framework for Python',
    devCommand: 'python app.py',
    buildCommand: 'echo "No build step needed"',
    installCommand: 'pip install -r requirements.txt',
    defaultPort: 5000,
    files: {
      'requirements.txt': `Flask==3.0.0
Werkzeug==3.0.0
flask-cors==4.0.0`,
      'app.py': `from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({'message': 'Hello from Flask!'})

@app.route('/api/health')
def health():
    return jsonify({'status': 'OK'})

@app.route('/api/users')
def get_users():
    users = [
        {'id': 1, 'name': 'John Doe', 'email': 'john@example.com'},
        {'id': 2, 'name': 'Jane Smith', 'email': 'jane@example.com'},
    ]
    return jsonify(users)

@app.route('/api/users/<int:user_id>')
def get_user(user_id):
    user = {'id': user_id, 'name': 'John Doe', 'email': 'john@example.com'}
    return jsonify(user)

@app.route('/api/data', methods=['POST'])
def create_data():
    data = request.get_json()
    return jsonify({'received': data, 'status': 'created'}), 201

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)`,
      'config.py': `# Configuration settings
import os

class Config:
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    PORT = int(os.environ.get('PORT', 5000))
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}`,
      'models.py': `# Data models (in a real app, you'd use SQLAlchemy or similar)
class User:
    def __init__(self, id, name, email):
        self.id = id
        self.name = name
        self.email = email

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email
        }

# Mock data
users = [
    User(1, 'John Doe', 'john@example.com'),
    User(2, 'Jane Smith', 'jane@example.com'),
]`,
      'routes/users.py': `from flask import Blueprint, jsonify
from models import users

users_bp = Blueprint('users', __name__)

@users_bp.route('', methods=['GET'])
def get_users():
    return jsonify([user.to_dict() for user in users])

@users_bp.route('/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = next((u for u in users if u.id == user_id), None)
    if user:
        return jsonify(user.to_dict())
    return jsonify({'error': 'User not found'}), 404`,
      'templates/index.html': `<!DOCTYPE html>
<html>
<head>
    <title>Flask App</title>
</head>
<body>
    <h1>Hello from Flask!</h1>
    <p>This is a basic Flask application.</p>
</body>
</html>`,
    },
  },
} as const;

export type TemplateType = keyof typeof templateConfigs;
