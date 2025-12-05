# Quick Deployment Guide for Judges

## 🚀 Deploy to Vercel (5 Minutes)

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (free)

### Step 2: Import Project
1. Click "Add New" → "Project"
2. Import your GitHub repository
3. Vercel will auto-detect Vite

### Step 3: Configure Environment Variables
Add these in Vercel dashboard under "Environment Variables":

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from your Supabase project settings → API

### Step 4: Deploy
1. Click "Deploy"
2. Wait 2-3 minutes
3. Copy the deployment URL (e.g., `educollab.vercel.app`)

### Step 5: Update Supabase Settings
In your Supabase dashboard:
1. Go to Authentication → URL Configuration
2. Add your Vercel URL to "Site URL"
3. Add `https://your-app.vercel.app/**` to "Redirect URLs"

## 📝 Add to README

Once deployed, add this to your README.md:

```markdown
## 🌐 Live Demo

**URL**: https://your-app.vercel.app

**Test Credentials** (for judges):
- Email: judge@educollab.demo
- Password: JudgeDemo2025!

Or create your own account to explore all features.
```

## 🔧 Vercel Configuration File (Optional)

Create `vercel.json` in root for custom config:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## ⚡ Alternative: Netlify

If you prefer Netlify:

1. Go to [netlify.com](https://netlify.com)
2. "Add new site" → "Import from Git"
3. Select your repo
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Add environment variables
7. Deploy

## 🎯 For Hackathon Submission

In your Devpost submission:
- **Live Demo URL**: Your Vercel/Netlify URL
- **Repository URL**: Your GitHub URL
- **Testing Instructions**: Include in README.md

## 🔐 Test Account Setup

Create a test account in your deployed app:
1. Register with: judge@educollab.demo / JudgeDemo2025!
2. Create a sample workspace
3. Add some tasks and submissions
4. Document this in README

## ⚠️ Important Notes

1. **Supabase Free Tier**: 
   - 500MB database
   - 1GB file storage
   - 2GB bandwidth/month
   - Should be enough for judging period

2. **Environment Variables**:
   - Never commit `.env` file
   - Always use Vercel/Netlify environment variables
   - Supabase keys are safe to expose (anon key is public)

3. **Database**:
   - Make sure all migrations are applied
   - Test the deployed app thoroughly
   - Create sample data for judges

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all dependencies in package.json
- Test `npm run build` locally first

### App Loads but Errors
- Check browser console
- Verify environment variables are set
- Check Supabase connection

### Authentication Issues
- Verify Supabase redirect URLs
- Check email confirmation settings
- Disable email confirmation for testing

## ✅ Deployment Checklist

- [ ] Vercel/Netlify account created
- [ ] Project imported from GitHub
- [ ] Environment variables configured
- [ ] First deployment successful
- [ ] App loads and works
- [ ] Test account created
- [ ] Sample data added
- [ ] Deployment URL added to README
- [ ] Deployment URL added to Devpost submission
- [ ] Supabase redirect URLs updated

## 🎬 Quick Deploy Commands

If using Vercel CLI (optional):

```bash
npm i -g vercel
vercel login
vercel
```

Follow prompts and you're done!

---

**Estimated Time**: 5-10 minutes
**Cost**: Free
**Difficulty**: Easy
