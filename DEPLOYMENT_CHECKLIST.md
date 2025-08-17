# Swingalyze Vercel Deployment Checklist

## Pre-Deployment Setup

### ✅ 1. GitHub Repository Ready
- [ ] Code pushed to GitHub repository
- [ ] `package.json` in root with all dependencies
- [ ] Next.js 14 app in `/app` directory
- [ ] All Phase 2B features tested and working

### ✅ 2. External Services Setup

#### Supabase (Optional - runs in demo mode without)
- [ ] Project created at https://supabase.com
- [ ] Database schema deployed (run `supabase-schema.sql`)
- [ ] Storage bucket `swings` created
- [ ] RLS policies applied
- [ ] API keys copied: URL, anon key, service role key

#### Stripe (Optional - demo trials work without)
- [ ] Account created at https://stripe.com
- [ ] Product created: "Swingalyze Pro" at $9.99/month
- [ ] API keys copied: secret key, price ID
- [ ] Webhook endpoint configured (after Vercel deployment)

## Vercel Deployment Steps

### ✅ 3. Import to Vercel
1. [ ] Go to https://vercel.com/dashboard
2. [ ] Click "Add New..." → "Project"
3. [ ] Import from GitHub → Select Swingalyze repo
4. [ ] Configure build settings:
   - Framework Preset: **Next.js**
   - Root Directory: **(leave blank)**  
   - Build Command: **next build**
   - Output Directory: **.next**
   - Install Command: **yarn install**

### ✅ 4. Environment Variables (Production)
Copy from `.env.production` to Vercel → Settings → Environment Variables → Production:

```bash
NEXT_PUBLIC_APP_URL=https://swingalyze-<hash>.vercel.app  # Update after first deploy
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_live_your-secret-key
STRIPE_PRICE_ID=price_your-monthly-plan
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
NEXT_PUBLIC_FALLBACK_ENABLED=true
```

### ✅ 5. Environment Variables (Preview)
Copy from `.env.preview` to Vercel → Settings → Environment Variables → Preview:
- Use test/staging credentials
- Use preview URL for NEXT_PUBLIC_APP_URL

### ✅ 6. First Deployment
1. [ ] Click "Deploy" button in Vercel
2. [ ] Wait for build to complete
3. [ ] Note the generated URL: `https://swingalyze-<hash>.vercel.app`
4. [ ] Update `NEXT_PUBLIC_APP_URL` in production environment
5. [ ] Redeploy to apply URL change

## Post-Deployment Configuration

### ✅ 7. Stripe Webhook (If Using Stripe)
1. [ ] Go to Stripe Dashboard → Developers → Webhooks
2. [ ] Add endpoint: `https://your-vercel-url.vercel.app/api/stripe/webhook`
3. [ ] Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
4. [ ] Copy webhook signing secret to Vercel environment
5. [ ] Redeploy to apply webhook secret

### ✅ 8. Custom Domain (Optional)
1. [ ] Go to Vercel → Project → Domains
2. [ ] Add `swingalyze.com`
3. [ ] Follow DNS configuration steps
4. [ ] Update `NEXT_PUBLIC_APP_URL=https://swingalyze.com`
5. [ ] Redeploy with new domain

## Verification & Testing

### ✅ 9. Health Check
- [ ] Visit: `https://your-domain/api/health`
- [ ] Expect: `{"ok":true,"version":"v2b-supabase-stripe"}`
- [ ] Verify feature flags show correct service status

### ✅ 10. Anonymous Flow (iPad Safari + Chrome)
- [ ] Visit homepage → Click "Try Free Analysis"
- [ ] Upload ≤20MB MP4/MOV video
- [ ] Submit analysis form
- [ ] Verify redirect to `/results/:id`
- [ ] Confirm video plays with overlays and tips
- [ ] Verify no 502 errors in browser network tab
- [ ] Confirm only small JSON calls to `/api/analyze`

### ✅ 11. Authentication Flow (If Supabase Configured)
- [ ] Click "Sign In" → Enter email
- [ ] Check email for magic link
- [ ] Complete sign-in process
- [ ] Upload video (should use direct Supabase upload)
- [ ] Verify larger file size limit (100MB)
- [ ] Check "My Analyses" page shows history

### ✅ 12. Payment Flow (If Stripe Configured)
- [ ] Visit `/pricing` page
- [ ] Click "Upgrade to Pro"
- [ ] Complete test checkout
- [ ] Verify webhook received
- [ ] Check account shows Pro status

### ✅ 13. Demo Mode Testing (Without Credentials)
- [ ] Deploy without Supabase/Stripe credentials
- [ ] Verify all pages load correctly
- [ ] Confirm demo mode messages displayed
- [ ] Test demo trial functionality
- [ ] Verify graceful fallbacks working

## Production Readiness

### ✅ 14. Performance & Monitoring
- [ ] Check Vercel Functions tab for API performance
- [ ] Monitor error rates in Vercel dashboard
- [ ] Test on multiple devices and browsers
- [ ] Verify CORS headers working correctly

### ✅ 15. Security
- [ ] Verify RLS policies in Supabase
- [ ] Confirm webhook signatures validating
- [ ] Test unauthorized access attempts
- [ ] Verify environment variables are secure

## Troubleshooting Common Issues

### 🚨 Build Failures
- Check package.json dependencies
- Verify Next.js version compatibility
- Check for TypeScript errors

### 🚨 Runtime Errors
- Check Vercel Function logs
- Verify environment variables are set
- Test API endpoints individually

### 🚨 502 Bad Gateway
- Should not occur with Phase 2B implementation
- If present, check Vercel Function timeout settings
- Verify small JSON payloads only

### 🚨 CORS Errors
- Check vercel.json headers configuration
- Verify API route CORS implementation
- Test with different origins

## Success Criteria

✅ **Deployment Successful When:**
- Health endpoint returns v2b-supabase-stripe
- Anonymous users can analyze videos without 502s
- Authentication works with magic links (if configured)
- Payments process correctly (if configured)
- Demo mode works without credentials
- All pages responsive on mobile devices
- File uploads work reliably on iPad

## Next Steps After Deployment

1. **Monitor Performance**: Watch Vercel analytics and function logs
2. **User Testing**: Get feedback from real users
3. **Feature Rollout**: Gradually enable Supabase and Stripe
4. **Domain Setup**: Configure custom domain when ready
5. **SSL Certificate**: Verify HTTPS working correctly

---

**🎉 Congratulations! Swingalyze is now live on Vercel!**