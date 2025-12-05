# ⚡ Quick Deployment Steps (5 Minutes)

## For Kiroween Hackathon - Judges Need to Test Your App!

### 1. Deploy to Vercel NOW

```
1. Go to: https://vercel.com
2. Click "Sign Up" with GitHub
3. Click "Add New" → "Project"
4. Select your EduCollab repository
5. Vercel auto-detects Vite ✅
6. Click "Environment Variables"
7. Add:
   - VITE_SUPABASE_URL = [your supabase url]
   - VITE_SUPABASE_ANON_KEY = [your supabase key]
8. Click "Deploy"
9. Wait 2-3 minutes ⏱️
10. Copy your URL (e.g., educollab-xyz.vercel.app)
```

### 2. Update Supabase (IMPORTANT!)

```
1. Go to your Supabase dashboard
2. Authentication → URL Configuration
3. Site URL: https://your-app.vercel.app
4. Redirect URLs: https://your-app.vercel.app/**
5. Save
```

### 3. Create Test Accounts

In your deployed app:
```
1. Register: leader@educollab.demo / LeaderDemo2025!
2. Create a workspace
3. Add some tasks
4. Register: member@educollab.demo / MemberDemo2025!
5. Join the workspace
6. Submit some work
```

### 4. Update README.md

Add your deployment URL:
```markdown
**Live Demo**: https://your-app.vercel.app

**Test Credentials**:
- Leader: leader@educollab.demo / LeaderDemo2025!
- Member: member@educollab.demo / MemberDemo2025!
```

### 5. Test It!

Open your deployment URL and verify:
- ✅ App loads
- ✅ Can register/login
- ✅ Can create workspace
- ✅ Can add tasks
- ✅ Dashboard shows data

### 6. Add to Devpost Submission

When submitting on kiro.devpost.com:
- **Live Demo URL**: Your Vercel URL
- **Repository URL**: Your GitHub URL
- **Testing Instructions**: "Use test credentials in README or create your own account"

---

## Why Deployment is Required

From the rules:
> "Provide a URL to your functional application(s)"
> "Testing Access must be provided to an Entrant's working Project for judging and testing"

Judges need to actually USE your app, not just watch a video!

## Troubleshooting

**Build fails?**
- Run `npm run build` locally first
- Check for errors
- Fix and push to GitHub
- Vercel will auto-redeploy

**App loads but blank?**
- Check browser console (F12)
- Verify environment variables in Vercel
- Check Supabase connection

**Can't login?**
- Check Supabase redirect URLs
- Disable email confirmation in Supabase (Auth → Providers → Email → Disable)

---

## Time Estimate

- Vercel setup: 5 minutes
- Supabase config: 2 minutes
- Create test accounts: 3 minutes
- **Total: ~10 minutes**

## Cost

**FREE** ✅
- Vercel free tier: Unlimited deployments
- Supabase free tier: 500MB database, 1GB storage

---

**DO THIS NOW!** The deadline is TODAY at 2:00 PM PT!
