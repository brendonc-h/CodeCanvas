# CodeCanvas - SaaS Deployment Guide

## 🎯 Goal: Deploy as a Mobile-Friendly Web App

Users will access your IDE from **any device** (phone, tablet, computer) via a URL like:
- `https://yourapp.railway.app` (free subdomain)
- `https://yourapp.com` (custom domain)

**No installation needed for users!** Just visit the URL and start coding.

---

## 📋 Prerequisites

1. **Git repository** (GitHub, GitLab, or Bitbucket)
2. **Free Groq API Key** (for free AI)
   - Go to https://console.groq.com
   - Sign up (free)
   - Create API key
3. Choose a deployment platform (below)

---

## 🚀 Option 1: Railway.app (Recommended - Easiest)

### Why Railway?
- ✅ Easiest Docker deployment
- ✅ Free PostgreSQL included
- ✅ $5/month for hosting (after free trial)
- ✅ Auto-scaling
- ✅ Custom domains

### Steps:

#### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

#### 2. Login to Railway
```bash
railway login
```

#### 3. Initialize Project
```bash
cd /Users/brendoncurry-hobbs/Downloads/CodeCanvas
railway init
```

#### 4. Add PostgreSQL
```bash
railway add
# Select: PostgreSQL
```

#### 5. Set Environment Variables
```bash
# Required
railway variables set GROQ_API_KEY=your_groq_api_key_here
railway variables set SESSION_SECRET=$(openssl rand -hex 32)

# Optional (for custom AI)
railway variables set OPENAI_API_KEY=your_key_here
railway variables set ANTHROPIC_API_KEY=your_key_here
```

#### 6. Deploy!
```bash
railway up
```

**Done!** Railway will:
- Build your Docker container
- Set up PostgreSQL
- Deploy to a URL
- Give you the URL to access your app

#### 7. Get Your URL
```bash
railway domain
```

#### 8. (Optional) Add Custom Domain
```bash
railway domain add yourapp.com
```

---

## 🚀 Option 2: Render.com (Free Tier Available)

### Why Render?
- ✅ **FREE tier** (limited resources)
- ✅ Auto-deploys from GitHub
- ✅ Free PostgreSQL (small)
- ✅ SSL included

### Steps:

#### 1. Push to GitHub
```bash
cd /Users/brendoncurry-hobbs/Downloads/CodeCanvas
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/codecanvas.git
git push -u origin main
```

#### 2. Go to Render.com
1. Visit https://render.com
2. Sign up (free)
3. Click "New +"
4. Select "Blueprint"
5. Connect your GitHub repo
6. Select the repo with CodeCanvas

#### 3. Render Auto-Detects Config
- Render finds `render.yaml`
- Creates web service + database
- Click "Apply"

#### 4. Set Environment Variables
In Render dashboard:
1. Go to your service
2. Click "Environment"
3. Add:
   - `GROQ_API_KEY` = your Groq key
   - `SESSION_SECRET` = random string
   - (Optional) `OPENAI_API_KEY`

#### 5. Deploy
Click "Deploy" - Render will:
- Build Docker container
- Create PostgreSQL database
- Deploy to URL

**Your app is live!** URL like: `https://codecanvas.onrender.com`

---

## 🚀 Option 3: Fly.io (Free Tier + Best Performance)

### Why Fly?
- ✅ Generous **free tier**
- ✅ Edge deployment (fast worldwide)
- ✅ Excellent Docker support

### Steps:

#### 1. Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

#### 2. Login
```bash
fly auth login
```

#### 3. Launch App
```bash
cd /Users/brendoncurry-hobbs/Downloads/CodeCanvas
fly launch
```

Answer prompts:
- App name: `codecanvas` (or your choice)
- Region: Choose closest to you
- PostgreSQL: **Yes**
- Redis: No

#### 4. Set Secrets
```bash
fly secrets set GROQ_API_KEY=your_groq_key
fly secrets set SESSION_SECRET=$(openssl rand -hex 32)
```

#### 5. Deploy
```bash
fly deploy
```

**Done!** URL: `https://codecanvas.fly.dev`

---

## 🤖 Free AI Setup (Groq)

### Get Free Groq API Key:

1. **Sign up**: https://console.groq.com
2. **Create API Key**: Dashboard → API Keys → Create
3. **Copy key**: Starts with `gsk_...`
4. **Add to deployment**: See environment variables above

### Free Limits:
- **14,400 requests/day** (600/hour)
- **Very fast** (100+ tokens/second)
- **Models**: Llama 3, Mixtral, Gemma

**Perfect for a free tier!**

---

## 📱 Mobile Optimization (Already Done!)

Your app already has:
- ✅ Responsive design (works on all screens)
- ✅ Touch-friendly buttons
- ✅ Mobile-optimized panels
- ✅ Collapsible sections
- ✅ Full-screen preview on mobile

**Test it:**
1. Open your deployed URL on phone
2. Everything scales automatically!

---

## 🔐 User Authentication

Your app already has:
- ✅ Login/signup system
- ✅ Session management
- ✅ PostgreSQL user storage

**Demo account** (for testing):
- Username: `demo`
- Password: `demo`

**Production:** Users create their own accounts

---

## 💵 Cost Breakdown

### Minimum (Free Tier):
- **Render.com**: FREE (limited resources)
- **Fly.io**: FREE (generous limits)
- **Groq AI**: FREE (14,400 requests/day)
- **Total**: **$0/month** ✨

### Recommended (Paid):
- **Railway**: $5/month
- **Groq AI**: FREE
- **Custom domain**: $10-15/year (~$1/month)
- **Total**: **~$6/month**

### Scaling Up:
- **More users**: $10-50/month
- **Paid AI** (OpenAI): Pay per use
- **More resources**: $20-100/month

---

## 🎨 Customization

### Branding:
1. **Logo**: Edit `/client/src/components/navbar.tsx`
2. **Colors**: Edit `/client/src/index.css`
3. **Name**: Update `package.json` and meta tags

### Features:
- **Add templates**: Edit `/server/routes/templates.ts`
- **AI models**: Edit `/server/routes/ai.ts`
- **Pricing tiers**: Add to database schema

---

## 📊 Monitoring

### Railway:
- Dashboard shows: CPU, memory, requests
- Logs in real-time
- Metrics graphs

### Render:
- Dashboard metrics
- Log streaming
- Alerts for errors

### Fly:
- `fly logs` - View logs
- `fly status` - Check health
- Dashboard for metrics

---

## 🔒 Security

Already included:
- ✅ Session-based auth
- ✅ HTTPS (auto on all platforms)
- ✅ Docker isolation (sandboxed execution)
- ✅ Rate limiting
- ✅ Input sanitization
- ✅ SQL injection protection

**For production:**
- Set strong `SESSION_SECRET`
- Use environment variables (never hardcode keys)
- Enable CORS for your domain only

---

## 🚦 Going Live Checklist

### Before Deployment:
- [ ] Get Groq API key
- [ ] Push code to GitHub (if using Render)
- [ ] Choose deployment platform

### After Deployment:
- [ ] Test signup/login
- [ ] Create a test project
- [ ] Test terminal (click Install/Dev)
- [ ] Test AI panel
- [ ] Test preview
- [ ] Test on mobile phone

### Production Ready:
- [ ] Add custom domain
- [ ] Set up monitoring/alerts
- [ ] Create backup strategy
- [ ] Add terms of service
- [ ] Add privacy policy
- [ ] Set up analytics (optional)

---

## 📱 User Experience Flow

### What Users See:

1. **Visit your URL** (e.g., `codecanvas.app`)
2. **Sign up** (email + password)
3. **Create project** (or use template)
4. **Start coding** in Monaco editor
5. **Use AI** for help (free Groq)
6. **Click Dev** to run code
7. **See preview** of their app
8. **All from their phone!**

**No Docker, no installation, just works!** ✨

---

## 🆘 Troubleshooting

### Build Fails:
```bash
# Check logs
railway logs  # Railway
render logs   # Render
fly logs      # Fly
```

### Database Connection:
- Ensure `DATABASE_URL` is set
- Check PostgreSQL is running
- Migration errors? Check schema

### Docker Issues on Server:
- All platforms handle Docker automatically
- No manual Docker setup needed
- Containers managed by platform

### AI Not Working:
- Check `GROQ_API_KEY` is set
- Test key at https://console.groq.com
- Check rate limits (14,400/day)

---

## 🎯 Next Steps

### Now:
1. **Choose platform** (Railway recommended)
2. **Get Groq API key**
3. **Deploy!** (follow steps above)
4. **Test on your phone**

### Soon:
1. **Add custom domain**
2. **Invite beta users**
3. **Gather feedback**
4. **Iterate!**

### Future:
1. **Add paid tiers** (more AI, storage)
2. **Team collaboration**
3. **More templates**
4. **Marketplace for extensions**

---

## 📞 Support

### Platform Docs:
- Railway: https://docs.railway.app
- Render: https://render.com/docs
- Fly: https://fly.io/docs

### CodeCanvas:
- Check `TERMINAL_AND_PREVIEW_GUIDE.md`
- Check `EDITOR_IMPROVEMENTS.md`
- GitHub issues (if open source)

---

## 🎉 You're Ready!

Your CodeCanvas IDE is ready to deploy as a **mobile-friendly SaaS** with:
- ✅ Free AI (Groq)
- ✅ Works on phones
- ✅ No user installation
- ✅ Professional features

**Pick a platform and deploy in <10 minutes!** 🚀

---

**Questions?** Check the platform-specific guides or re-run this guide with your chosen platform.
