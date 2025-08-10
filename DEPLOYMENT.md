# TasFieldbook Deployment Guide

This guide covers deploying TasFieldbook to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional): `npm install -g vercel`
3. **Supabase Project**: Ensure your Supabase project is set up with:
   - Database schema deployed
   - Storage buckets configured
   - Edge functions deployed
   - Row Level Security (RLS) policies enabled

## Quick Deploy

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `fieldbook` directory if it's in a monorepo

2. **Configure Build Settings**:
   - Framework Preset: **SvelteKit**
   - Build Command: `npm run build`
   - Output Directory: `build` (auto-detected)
   - Node.js Version: `18.x`

3. **Set Environment Variables**:
   ```
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   PUBLIC_APP_NAME=TasFieldbook
   PUBLIC_APP_VERSION=0.0.1
   ```

4. **Deploy**: Click "Deploy"

### Option 2: Deploy via CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   # Preview deployment
   npm run deploy:preview
   
   # Production deployment
   npm run deploy
   ```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PUBLIC_APP_NAME` | Application name | `TasFieldbook` |
| `PUBLIC_APP_VERSION` | Application version | `0.0.1` |

## Supabase Configuration

Before deploying, ensure your Supabase project has:

### 1. Database Schema
```bash
# Deploy the main schema
supabase db push

# Apply survey search migration
supabase migration new survey-search
# (paste the content of survey-search-migration.sql)
```

### 2. Storage Buckets
- `project-files` bucket with appropriate policies

### 3. Edge Functions
```bash
# Deploy edge functions
supabase functions deploy process-search-document
supabase functions deploy get-processing-status
```

### 4. Environment Variables in Supabase
Make sure these are set in your Supabase project:
- Database URL
- JWT secret
- Service role key

## Domain Configuration

### Custom Domain (Optional)

1. In Vercel Dashboard:
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. SSL Certificate:
   - Vercel provides automatic SSL
   - Certificate will be issued once DNS is configured

## Performance Optimization

The deployment is configured for optimal performance:

- **Edge Functions**: Deployed to Sydney region (`syd1`) for Tasmania proximity
- **Static Assets**: Cached with long TTL
- **PWA**: Service worker for offline functionality
- **Image Optimization**: Automatic via Vercel
- **Compression**: Gzip/Brotli enabled

## Monitoring and Debugging

### View Logs
```bash
# View real-time logs
vercel logs [deployment-url]

# View function logs
vercel logs --tail
```

### Performance Monitoring
- Vercel Analytics (available in dashboard)
- Web Vitals monitoring
- Function execution metrics

## Troubleshooting

### Common Issues

1. **Build Fails**:
   - Check `npm run build` works locally
   - Verify all dependencies are in `package.json`
   - Check for TypeScript errors: `npm run check`

2. **Environment Variables Not Working**:
   - Ensure variables start with `PUBLIC_` for client-side access
   - Redeploy after adding/changing variables
   - Check variable names match exactly

3. **Supabase Connection Issues**:
   - Verify URL and keys are correct
   - Check Supabase project is active
   - Ensure RLS policies allow access

4. **PDF Processing Fails**:
   - Check edge functions are deployed
   - Verify storage bucket permissions
   - Monitor edge function logs

### Debug Mode

Add these environment variables for debugging:
```
NODE_ENV=development
DEBUG=*
```

## Security Considerations

The deployment includes security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Content Security Policy (CSP)

## Updating the Deployment

### Automatic Deployments
- Connected to Git: Auto-deploy on push to main branch
- Pull Requests: Auto-create preview deployments

### Manual Updates
```bash
# Deploy latest changes
git push origin main

# Or deploy manually
npm run deploy
```

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Review Supabase dashboard for backend issues
3. Monitor browser console for client-side errors
4. Use the debug tools provided in the application