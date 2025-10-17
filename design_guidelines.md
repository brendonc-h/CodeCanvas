# Design Guidelines: Replit-lite Web IDE

## Design Approach

**Selected Approach**: Design System - Drawing from VS Code, Linear, and Replit's design patterns
**Justification**: This is a productivity-focused development tool where clarity, efficiency, and visual hierarchy are paramount. The interface must support complex workflows with multiple panels while maintaining focus and reducing cognitive load.

**Core Design Principles**:
- **Clarity over decoration**: Every visual element serves a functional purpose
- **Dark-first design**: Reduce eye strain for extended coding sessions
- **Spatial hierarchy**: Clear zones for different functionalities
- **Information density**: Maximize useful content without clutter
- **Professional consistency**: Familiar patterns for developer tools

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**:
- Background Primary: `222 15% 10%` (deep slate, main editor area)
- Background Secondary: `222 15% 8%` (sidebar, file tree)
- Background Tertiary: `222 15% 14%` (panels, terminal)
- Border Subtle: `222 10% 20%` (dividers, panel edges)
- Border Interactive: `222 10% 30%` (hover states, focus rings)

**Accent & Semantic Colors**:
- Primary Action: `217 91% 60%` (vibrant blue for CTAs, links)
- Success: `142 76% 36%` (terminal success, deployment complete)
- Warning: `38 92% 50%` (build warnings)
- Error: `0 84% 60%` (errors, failed deploys)
- AI Accent: `271 76% 53%` (purple for AI features)

**Text Colors**:
- Primary Text: `210 20% 98%` (main content)
- Secondary Text: `215 16% 65%` (labels, metadata)
- Muted Text: `215 14% 45%` (placeholders, disabled states)

**Light Mode (Optional)**:
- Background: `210 20% 98%`
- Text: `222 15% 10%`
- Borders: `220 13% 85%`

### B. Typography

**Font Families**:
- UI: 'Inter', system-ui, sans-serif (clean, modern interface text)
- Code: 'JetBrains Mono', 'Fira Code', monospace (editor, terminal)
- Display: 'Inter', -apple-system, sans-serif (headings, emphasis)

**Type Scale**:
- Display (Dashboard headings): 32px/40px, font-weight 700
- H1 (Panel titles): 20px/28px, font-weight 600
- H2 (Section headers): 16px/24px, font-weight 600
- Body (Main UI text): 14px/20px, font-weight 400
- Small (Metadata, labels): 12px/16px, font-weight 500
- Code (Editor, terminal): 14px/20px, font-weight 400

**Text Treatments**:
- File paths and identifiers: Monospace, secondary color
- Status indicators: Uppercase, 11px, letter-spacing 0.5px, font-weight 600
- Error messages: Regular weight, error color with subtle background

### C. Layout System

**Spacing Primitives**: Use Tailwind units of **2, 3, 4, 6, 8, 12** consistently
- Micro spacing (icons, badges): `p-2`, `gap-2`
- Component padding: `p-4`, `px-6 py-3`
- Section spacing: `p-6`, `gap-6`
- Panel separation: `p-8`, `gap-8`
- Page margins: `p-12`

**Grid System**:
- Dashboard: 12-column grid with `gap-6` for project cards
- Editor Layout: CSS Grid with named areas (sidebar | editor | ai-panel) and (terminal)
- Responsive: Collapse AI panel below 1280px, stack terminal at 768px

**Container Widths**:
- Dashboard max-width: `max-w-7xl` (1280px)
- Full-bleed editor: 100vw/vh with panel constraints
- Modals/Dialogs: `max-w-2xl` (672px)

### D. Component Library

**Navigation & Chrome**:
- Top Bar: h-14, background-secondary, border-b border-subtle, contains logo, project switcher, user menu
- Sidebar: w-64, background-secondary, resizable with drag handle (min: 200px, max: 400px)
- Tab Bar: h-10, background-tertiary, for open files with close icons
- Status Bar: h-6, background-primary, border-t border-subtle, shows runtime info

**Core UI Elements**:
- Buttons Primary: bg-primary-action, text-white, px-4 py-2, rounded-md, font-medium
- Buttons Secondary: border border-interactive, bg-transparent, hover:bg-tertiary
- Icon Buttons: p-2, rounded-md, hover:bg-tertiary, transition-colors
- Input Fields: bg-tertiary, border border-subtle, focus:border-primary, px-3 py-2, rounded-md
- Dropdown Menus: bg-tertiary, border border-subtle, shadow-xl, rounded-lg, p-2

**File Tree Component**:
- Nested indent: pl-4 per level
- File/folder items: h-8, px-2, rounded-sm, hover:bg-tertiary, cursor-pointer
- Icons: 16px (heroicons), text-secondary, mr-2
- Active file: bg-primary-action/10, border-l-2 border-primary-action

**Terminal Component**:
- xterm.js with custom theme matching dark palette
- Prompt color: text-ai-accent (purple for AI, green for success commands)
- Background: bg-tertiary with subtle texture (optional: `bg-[url('/noise.png')]` at 3% opacity)
- Toolbar: bg-secondary, border-b border-subtle, with clear/kill session controls

**AI Panel**:
- Width: 400px (resizable, min: 320px, max: 600px)
- Header: Model selector dropdown, "Explain/Refactor/Generate" tabs
- Chat interface: Message bubbles with user (bg-primary-action/10) and AI (bg-ai-accent/10)
- Action buttons: "Apply Patch" (primary), "Copy" (secondary), "Regenerate" (ghost)

**Preview Frame**:
- Border: 1px border-subtle with subtle shadow
- Toolbar: bg-secondary with URL display (read-only input) and refresh/open-external buttons
- Loading state: Skeleton with pulse animation
- Error state: Centered message with retry button

**Data Displays**:
- Project Cards (Dashboard): bg-tertiary, border border-subtle, rounded-lg, p-6, hover:border-interactive, transition-all
- Stat Counters: Large number (text-2xl font-bold) with small label below (text-sm text-secondary)
- Template Cards: Icon (48px), title (text-lg font-semibold), description (text-sm text-secondary)

**Modals & Overlays**:
- Backdrop: bg-black/60 backdrop-blur-sm
- Dialog: bg-secondary, border border-subtle, rounded-xl, shadow-2xl, max-w-2xl
- Modal header: pb-4 border-b border-subtle, text-xl font-semibold
- Modal actions: pt-4 border-t border-subtle, flex gap-3 justify-end

### E. Interactions & Animations

**Minimal Animation Strategy**:
- Transitions: Use `transition-colors duration-150` for interactive states only
- Panel resize: Smooth width transition (duration-200)
- Tab switching: Instant (no animation to avoid lag perception)
- Loading states: Subtle pulse on skeleton screens

**Focus & Hover States**:
- Focus rings: `ring-2 ring-primary-action ring-offset-2 ring-offset-background-primary`
- Hover backgrounds: `hover:bg-tertiary` for interactive items
- Active states: `active:scale-[0.98]` for buttons (subtle press effect)

---

## Page-Specific Layouts

### Dashboard (`/`)
- Hero Section: **No hero image** - immediate utility focus
- Header: Logo left, "New Project" button right (primary action), user avatar far right
- Project Grid: 3-column grid (lg:grid-cols-3 md:grid-cols-2 grid-cols-1), gap-6
- Each card: Template icon, project name, last edited timestamp, quick actions (Open, Delete)
- Empty state: Centered icon (96px), "Create your first project" message, template selection cards below

### Editor View (`/p/[id]`)
- Layout: CSS Grid with 4 zones
  ```
  [header        header      header  ]
  [sidebar       editor      ai-panel]
  [sidebar       terminal    ai-panel]
  ```
- Sidebar: File tree, project settings (collapsible sections)
- Editor: Monaco with tab bar, minimap (optional toggle), breadcrumb path
- AI Panel: Chat interface, model selector, context toggle (include current file)
- Terminal: xterm.js with toolbar (new terminal, split, clear, kill)
- Top toolbar: Install/Dev/Build/Deploy buttons, preview toggle, settings

### Preview (`/p/[id]/preview`)
- Iframe sandbox with toolbar
- Responsive viewport simulator (optional): Device presets (mobile/tablet/desktop toggle)
- External open button and refresh control

---

## Accessibility & Quality

- **Keyboard Navigation**: All panels accessible via Cmd/Ctrl+1/2/3/4, Cmd+P for file switcher
- **Color Contrast**: WCAG AA minimum (4.5:1 for text, 3:1 for UI components)
- **Focus Management**: Clear focus indicators, logical tab order through panels
- **Screen Reader**: Aria labels for all icon buttons, live regions for terminal output and AI responses
- **Dark Mode Consistency**: Apply dark theme to Monaco editor, xterm.js, and all custom inputs

---

## Images & Visual Assets

**Icon Library**: Heroicons (outline for UI, solid for emphasis)

**No Hero Images**: This is a utility application - visual space prioritizes functional content

**Illustrations** (Optional, Low Priority):
- Empty states: Simple line art icons (file icon, terminal icon) at 96px, text-secondary
- Error states: Minimal warning icon, focus on clear error text
- Loading states: Spinners or skeleton screens (no elaborate animations)