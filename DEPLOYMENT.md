# 🚀 CodeCanvas Deployment Guide

## 💰 Cost Comparison (Cheaper than Replit!)

| Platform | Hosting | Database | AI | Total/Month |
|----------|---------|----------|-----|-------------|
| **Railway Free** | $5 credits | Neon Free | Groq Free | **$0** ✅ |
| **Render Free** | Free tier | Neon Free | Groq Free | **$0** ✅ |
| **Railway Paid** | $5 | Neon Free | Groq Free | **$5** ✅ |
| **Replit Hacker** | $7 | Built-in | Self-host | **$7+** ❌ |

### 🏆 Recommended Stack (100% FREE):
- **Hosting**: Railway (free tier)
- **Database**: Neon.tech (free 0.5GB)
- **AI**: Groq (free 14,400 requests/day)
- **Auth**: Supabase (free tier)
- **Total**: **$0/month** 🎉

---

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ Node.js 20+ installed
- ✅ PostgreSQL database (Neon recommended)
- ✅ Supabase account for authentication
- ✅ (Optional) Netlify account for deployment features
- ✅ (Optional) AI API keys (Groq FREE, OpenAI, Grok, Anthropic)

---

## 🎯 Quick Deploy Options

### 🏆 Option 1: Deploy to Railway (Recommended)

**Why Railway?** Persistent server, WebSockets work, terminal works, $0-5/month

#### Quick Deploy:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables set DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_ANON_KEY="your-supabase-anon-key"
railway variables set SESSION_SECRET="$(openssl rand -base64 32)"
railway variables set GROQ_API_KEY="gsk_your-groq-api-key"
railway variables set PORT="8000"
railway variables set ALLOWED_ORIGINS="https://your-app.up.railway.app"

# Deploy
railway up

# Run migrations
railway run npm run db:generate
railway run npm run db:migrate
```

#### Get Required Services (All FREE):

**1. Database (Neon)**:
- Go to [neon.tech](https://neon.tech)
- Create project (free 0.5GB)
- Copy connection string

**2. Authentication (Supabase)**:
- Go to [supabase.com](https://supabase.com)
- Create project (free 50K users)
- Get URL + anon key from Settings → API

**3. AI (Groq)**:
- Go to [console.groq.com](https://console.groq.com)
- Sign up (free 14,400 requests/day)
- Create API key

**Cost: $0/month** 🎉

---

### Option 2: Deploy to Render

1. **Connect GitHub repo** to Render
2. **Create Web Service**
3. **Set environment variables**:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SESSION_SECRET`
4. **Build command**: `npm install && npm run build`
5. **Start command**: `npm start`

### Option 4: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Add PostgreSQL database (Vercel Postgres or external)
```

### Option 5: Self-Hosted (VPS/Cloud)

```bash
# Clone repository
git clone https://github.com/yourusername/codecanvas
cd codecanvas

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Generate and run migrations
npm run db:generate
npm run db:migrate

# Build for production
npm run build

# Start server
npm start
```

---

## 🔧 Environment Setup

### 1. Database (Neon PostgreSQL)

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Set `DATABASE_URL` in your environment

```bash
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### 2. Authentication (Supabase)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy URL and anon key
5. Set environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 3. Session Secret

Generate a secure random string:

```bash
# On macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set it:
```bash
SESSION_SECRET=your-generated-secret
```

### 4. AI Providers (Optional)

#### OpenAI
```bash
OPENAI_API_KEY=sk-your-key
```

#### Grok (xAI) - FREE
```bash
GROK_API_KEY=xai-your-key
```

#### Anthropic (Claude)
```bash
ANTHROPIC_API_KEY=sk-ant-your-key
```

#### Ollama (Local)
```bash
OLLAMA_BASE_URL=http://localhost:11434
```

### 5. Netlify Deployment (Optional)

```bash
NETLIFY_ACCESS_TOKEN=your-netlify-token
```

---

## 📦 Build & Deploy

### Production Build

```bash
# Install dependencies
npm install

# Generate database schema
npm run db:generate

# Run migrations
npm run db:migrate

# Build application
npm run build

# Start production server
npm start
```

### Development Mode

```bash
# Install dependencies
npm install

# Set up database
npm run db:generate
npm run db:migrate

# Start dev server
npm run dev
```

---

## 🌐 Domain & SSL Setup

### Using Cloudflare (Recommended)

1. **Add your domain** to Cloudflare
2. **Update DNS** to point to your server IP
3. **Enable SSL/TLS** (Full or Full Strict)
4. **Update ALLOWED_ORIGINS** in .env:

```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Using Let's Encrypt (Self-Hosted)

```bash
# Install Certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Set up nginx reverse proxy with SSL
```

---

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  codecanvas:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
    restart: unless-stopped
```

Deploy:
```bash
docker-compose up -d
```

---

## 📊 Database Migrations

### Generate Migration

```bash
npm run db:generate
```

### Run Migrations

```bash
npm run db:migrate
```

### Push Schema (Development)

```bash
npm run db:push
```

---

## 🔒 Security Checklist

- [ ] Change `SESSION_SECRET` to a strong random value
- [ ] Use HTTPS in production
- [ ] Set proper `ALLOWED_ORIGINS`
- [ ] Enable Supabase RLS (Row Level Security)
- [ ] Keep API keys in environment variables
- [ ] Enable rate limiting (already configured)
- [ ] Regular security updates (`npm audit`)
- [ ] Use strong database passwords
- [ ] Enable firewall on server
- [ ] Regular backups of database

---

## 📱 Mobile Access

Your CodeCanvas is mobile-optimized! To access from phone:

1. **Find your server IP**:
```bash
ifconfig | grep "inet "
```

2. **Access from phone** (same WiFi):
```
http://YOUR_IP:8000
```

3. **For production** (with domain):
```
https://yourdomain.com
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check migrations
npm run db:push
```

### Port Already in Use

```bash
# Change port in .env
PORT=3000

# Or kill process
lsof -ti:8000 | xargs kill
```

### Build Errors

```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

### Authentication Issues

- Verify Supabase URL and keys
- Check CORS settings in Supabase dashboard
- Ensure `ALLOWED_ORIGINS` includes your domain

---

## 📈 Monitoring & Logs

### View Logs

```bash
# Production logs
pm2 logs

# Docker logs
docker logs codecanvas

# Railway logs
railway logs
```

### Health Check

```bash
curl http://localhost:8000/api/health
```

---

## 🎉 Post-Deployment

After successful deployment:

1. ✅ Test authentication (signup/login)
2. ✅ Create a test project
3. ✅ Test code editor
4. ✅ Test terminal
5. ✅ Test AI features
6. ✅ Test mobile access
7. ✅ Set up monitoring
8. ✅ Configure backups

---

## 📚 Additional Resources

- **Neon Database**: https://neon.tech/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **Railway**: https://docs.railway.app
- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs

---

## 🆘 Support

Need help? Check:
- GitHub Issues
- Documentation
- Community Discord

---

**Your CodeCanvas is ready to deploy! Choose your platform and follow the steps above.** 🚀
