# 🚀 Quick Start - Deploy CodeCanvas in 5 Minutes

## ✅ What You Get (100% FREE)

- 🎨 **Full Web IDE** (like Replit)
- 🤖 **AI Coding Assistant** (Groq - 14,400 requests/day FREE)
- 🗄️ **PostgreSQL Database** (Neon - 0.5GB FREE)
- 🔐 **Authentication** (Supabase - 50K users FREE)
- 📱 **Mobile-Optimized** (code on your phone!)
- 💰 **Total Cost: $0/month**

---

## 🎯 Deploy to Railway (5 Minutes)

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Get Free Services

#### 1. Database (Neon)
- Go to [neon.tech](https://neon.tech)
- Sign up (free)
- Create project
- Copy connection string

#### 2. Auth (Supabase)
- Go to [supabase.com](https://supabase.com)
- Sign up (free)
- Create project
- Copy URL + anon key (Settings → API)

#### 3. AI (Groq)
- Go to [console.groq.com](https://console.groq.com)
- Sign up (free, no credit card)
- Create API key
- Copy key (starts with `gsk_`)

### Step 3: Deploy
```bash
# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set DATABASE_URL="your-neon-connection-string"
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_ANON_KEY="your-supabase-anon-key"
railway variables set GROQ_API_KEY="gsk_your-groq-key"
railway variables set SESSION_SECRET="$(openssl rand -base64 32)"
railway variables set PORT="8000"

# Deploy!
railway up

# Run migrations
railway run npm run db:migrate
```

### Step 4: Get Your URL
```bash
railway status
```

Your IDE is live at: `https://your-app.up.railway.app` 🎉

---

## 📱 Access Your IDE

### From Computer:
```
https://your-app.up.railway.app
```

### From Phone:
```
https://your-app.up.railway.app
```

**Mobile-optimized and ready to code!** 📱

---

## 💰 Cost Breakdown

| Service | Cost | What You Get |
|---------|------|--------------|
| **Railway** | $0 | $5 free credits/month |
| **Neon** | $0 | 0.5GB database |
| **Supabase** | $0 | 50K users |
| **Groq** | $0 | 14,400 AI requests/day |
| **Total** | **$0/month** | Full professional IDE! |

**vs Replit: $7/month** 💰

---

## 🎊 You're Done!

Your CodeCanvas is now live with:
- ✅ Professional code editor
- ✅ AI assistance (FREE)
- ✅ Terminal access
- ✅ Git integration
- ✅ Mobile support
- ✅ Team collaboration
- ✅ One-click deployment

**Start coding!** 🚀
