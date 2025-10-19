# CodeCanvas - Mobile-Friendly Web IDE

A modern, mobile-optimized web IDE with free AI assistance. Users access it from any device (phone, tablet, computer) - **no installation required!**

## ✨ Features

### 📱 Mobile-First
- **Works on phones** - Fully responsive design
- **Touch-optimized** - Large buttons, mobile menus
- **Progressive layout** - Desktop gets more panels
- **Works offline** - Service worker support

### 🤖 Free AI Assistant
- **Groq integration** - 14,400 free requests/day
- **Code explanations** - Understand any code
- **Refactoring** - Improve code quality
- **Generation** - Write code from descriptions
- **Reviews** - Get feedback on your code
- **Diff viewer** - See AI changes visually

### 💻 Full IDE Features
- **Monaco Editor** - VS Code editing experience
- **Syntax highlighting** - 100+ languages
- **Terminal** - Full shell access (sandboxed)
- **Live preview** - See your app running
- **File management** - Create, edit, delete files
- **Git support** - Version control built-in

### 🎨 Resizable Workspace
- **Drag-to-resize** panels
- **Collapsible sections** - Hide what you don't need
- **Keyboard shortcuts** - Cmd/Ctrl+S, B, J, K, P
- **Customizable layout** - Arrange your workspace

### 🔒 Secure & Isolated
- **Docker sandboxes** - Each project isolated
- **Resource limits** - CPU, memory controlled
- **User authentication** - Secure sessions
- **Project permissions** - Own your code

---

## 🚀 Quick Deploy (SaaS)

### **For Users: Just Visit the URL!**
Once deployed, users simply:
1. Visit your app URL
2. Sign up
3. Start coding on their phone!

**No Docker, no installation needed for users!**

---

### **For Developers: Deploy in 5 Minutes**

#### Option 1: One-Command Deploy
```bash
./deploy.sh
```

Choose platform, follow prompts, done!

#### Option 2: Manual Deploy

##### Railway.app (Recommended)
```bash
npm install -g @railway/cli
railway login
railway init
railway add  # Select PostgreSQL
railway variables set GROQ_API_KEY=your_key
railway up
```

**Cost:** $5/month after free trial

##### Render.com (Free Tier)
1. Push to GitHub
2. Go to render.com
3. New → Blueprint
4. Connect repo
5. Set `GROQ_API_KEY` env var

**Cost:** FREE (limited resources)

##### Fly.io (Best Free Tier)
```bash
fly launch
fly secrets set GROQ_API_KEY=your_key
fly deploy
```

**Cost:** FREE (generous limits)

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## 🤖 Get Free AI (Groq)

1. Go to https://console.groq.com
2. Sign up (free)
3. Create API key
4. Copy key (starts with `gsk_...`)
5. Add to deployment environment variables

**Free limits:** 14,400 requests/day (very generous!)

---

## 📱 Mobile Experience

### On Phone:
- **Responsive panels** - Auto-adjust to screen size
- **Touch controls** - Big buttons, easy taps
- **Full-screen preview** - Dedicated preview mode
- **Keyboard shortcuts** - Still work on mobile keyboards
- **Mobile menu** - Quick access to all features

### On Tablet:
- **Split view** - Editor + preview side-by-side
- **Resizable panels** - Drag to customize
- **More screen space** - Desktop-like experience

### On Desktop:
- **Full power** - All panels visible
- **Drag handles** - Resize everything
- **Multiple panels** - File tree, editor, terminal, AI, preview
- **Keyboard shortcuts** - Full productivity

---

## 🏗️ Architecture

### User View:
```
Phone/Browser → Your App URL → Start Coding!
```

### Behind the Scenes:
```
┌─────────────────────┐
│   User Browser      │
│   (Any Device)      │
└──────────┬──────────┘
           │
           │ HTTPS
           ▼
┌─────────────────────┐
│   Your Server       │
│   ├─ Node.js        │
│   ├─ PostgreSQL     │
│   └─ Docker         │
└─────────────────────┘
```

**Users don't need Docker!** Only your server does.

---

## 💵 Costs

### Minimum (Free):
- Render.com: FREE
- Fly.io: FREE
- Groq AI: FREE
- **Total: $0/month** ✨

### Recommended:
- Railway: $5/month
- Groq AI: FREE
- **Total: $5/month**

### With Custom Domain:
- Add $10-15/year for domain
- **Total: ~$6/month**

---

## 🎯 Perfect For

- **Learning to code** on mobile
- **Quick prototypes** anywhere
- **Code review** on the go
- **Pair programming** remotely
- **Teaching** coding classes
- **Hackathons** and demos
- **Freelancers** working mobile

---

## 🔧 Tech Stack

### Frontend:
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Monaco Editor** - Code editing
- **Xterm.js** - Terminal
- **Wouter** - Routing

### Backend:
- **Node.js** - Server
- **Express** - API framework
- **PostgreSQL** - Database
- **Docker** - Sandboxing
- **WebSockets** - Terminal connection

### AI:
- **Groq** - Free tier (default)
- **OpenAI** - Optional
- **Anthropic** - Optional

---

## 📚 Documentation

- `DEPLOYMENT_GUIDE.md` - Deploy as SaaS
- `TERMINAL_AND_PREVIEW_GUIDE.md` - Terminal/preview setup
- `EDITOR_IMPROVEMENTS.md` - UI features
- `KEYBOARD_SHORTCUTS.md` - All shortcuts

---

## 🎨 Customization

### Branding:
```typescript
// client/src/components/navbar.tsx
<h1>Your IDE Name</h1>

// client/src/index.css
:root {
  --primary: #your-color;
}
```

### Features:
```typescript
// server/routes/templates.ts
// Add project templates

// server/routes/ai.ts
// Add AI models/providers
```

---

## 🚦 Quick Start (Local Development)

Only needed if you want to modify the code:

```bash
# 1. Install dependencies
npm install

# 2. Set up database
createdb codecanvas
npm run db:push

# 3. Create .env
cp .env.example .env
# Add your GROQ_API_KEY

# 4. Start development
npm run dev
```

**For deployment:** Use `./deploy.sh` instead!

---

## 🆘 Troubleshooting

### Users Can't Access:
- Check if deployment is live
- Verify URL is correct
- Check SSL certificate

### Terminal Not Working:
- Docker must run on **server** (handled by platform)
- Users don't need Docker
- Check sandbox status indicator

### AI Not Responding:
- Verify `GROQ_API_KEY` is set
- Check rate limits (14,400/day)
- Try different model

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Test on mobile!
4. Submit PR

---

## 📄 License

MIT License - Use freely!

---

## 🎉 Get Started

### Deploy Now:
```bash
./deploy.sh
```

### Or Read Full Guide:
```bash
open DEPLOYMENT_GUIDE.md
```

### Questions?
- Check docs in `/docs` folder
- Open GitHub issue
- Email: support@yourapp.com

---

**Built for the mobile generation. Code anywhere, anytime!** 📱✨
