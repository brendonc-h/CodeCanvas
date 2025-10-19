#!/bin/bash

# CodeCanvas Quick Deploy Script
echo "🚀 CodeCanvas Quick Deploy"
echo "=========================="
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit"
fi

# Ask which platform
echo "Choose deployment platform:"
echo "1) Railway.app (Recommended - $5/month after trial)"
echo "2) Render.com (Free tier available)"
echo "3) Fly.io (Generous free tier)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚂 Deploying to Railway..."
        echo ""
        
        # Check if Railway CLI is installed
        if ! command -v railway &> /dev/null; then
            echo "Installing Railway CLI..."
            npm install -g @railway/cli
        fi
        
        # Login
        echo "Please login to Railway (browser will open)..."
        railway login
        
        # Initialize
        echo "Initializing Railway project..."
        railway init
        
        # Add PostgreSQL
        echo "Adding PostgreSQL database..."
        railway add
        
        # Set environment variables
        echo ""
        echo "⚙️  Setting up environment variables..."
        read -p "Enter your Groq API key (from console.groq.com): " groq_key
        railway variables set GROQ_API_KEY="$groq_key"
        railway variables set SESSION_SECRET=$(openssl rand -hex 32)
        railway variables set NODE_ENV=production
        
        # Deploy
        echo ""
        echo "🚀 Deploying to Railway..."
        railway up
        
        # Get domain
        echo ""
        echo "✅ Deployment complete!"
        echo ""
        echo "Your app is live at:"
        railway domain
        
        ;;
        
    2)
        echo ""
        echo "🎨 Deploying to Render..."
        echo ""
        echo "Steps:"
        echo "1. Push your code to GitHub"
        echo "2. Go to https://render.com"
        echo "3. Click 'New +' → 'Blueprint'"
        echo "4. Connect your GitHub repo"
        echo "5. Render will auto-detect render.yaml"
        echo ""
        echo "Don't forget to set environment variable:"
        echo "  GROQ_API_KEY = your_groq_key"
        echo ""
        read -p "Ready to push to GitHub? (y/n): " push
        
        if [ "$push" = "y" ]; then
            read -p "Enter your GitHub username: " username
            read -p "Enter repository name: " repo
            
            git remote add origin "https://github.com/$username/$repo.git"
            git branch -M main
            git push -u origin main
            
            echo ""
            echo "✅ Code pushed to GitHub!"
            echo "Now go to https://render.com and deploy"
        fi
        ;;
        
    3)
        echo ""
        echo "✈️  Deploying to Fly.io..."
        echo ""
        
        # Check if Fly CLI is installed
        if ! command -v fly &> /dev/null; then
            echo "Installing Fly CLI..."
            curl -L https://fly.io/install.sh | sh
        fi
        
        # Login
        echo "Please login to Fly.io (browser will open)..."
        fly auth login
        
        # Launch
        echo "Launching Fly app..."
        fly launch
        
        # Set secrets
        echo ""
        echo "⚙️  Setting up secrets..."
        read -p "Enter your Groq API key (from console.groq.com): " groq_key
        fly secrets set GROQ_API_KEY="$groq_key"
        fly secrets set SESSION_SECRET=$(openssl rand -hex 32)
        
        # Deploy
        echo ""
        echo "🚀 Deploying to Fly.io..."
        fly deploy
        
        echo ""
        echo "✅ Deployment complete!"
        fly status
        ;;
        
    *)
        echo "Invalid choice. Please run again and select 1, 2, or 3."
        exit 1
        ;;
esac

echo ""
echo "🎉 CodeCanvas is deployed!"
echo ""
echo "Next steps:"
echo "1. Visit your URL and test on desktop"
echo "2. Test on your phone"
echo "3. Create an account and start coding!"
echo ""
echo "For troubleshooting, see DEPLOYMENT_GUIDE.md"
