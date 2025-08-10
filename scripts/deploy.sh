#!/bin/bash

# TasFieldbook Deployment Script
set -e

echo "🚀 Starting TasFieldbook deployment to Vercel..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run linting and type checking
echo "🔍 Running code quality checks..."
npm run lint
npm run check

# Build the project locally to catch any build errors
echo "🔨 Building project..."
npm run build

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."

# Check if this is a production deployment
if [ "$1" = "prod" ] || [ "$1" = "production" ]; then
    echo "🌟 Deploying to production..."
    vercel --prod
else
    echo "🧪 Deploying preview..."
    vercel
fi

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up your environment variables in the Vercel dashboard"
echo "2. Configure your custom domain (if needed)"
echo "3. Test all functionality on the deployed site"
echo "4. Monitor the deployment for any issues"