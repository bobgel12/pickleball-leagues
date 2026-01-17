# Multi-Club Database Setup Guide

This guide will help you set up the multi-club database support for the Pickleball League Manager.

## Prerequisites

1. A Supabase account (free tier available at https://supabase.com)
2. A Vercel account (for deployment)
3. Node.js and npm installed locally

## Step 1: Create Supabase Project

1. Go to https://app.supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: `pickleball-leagues` (or your preferred name)
   - Database Password: Choose a strong password (save it!)
   - Region: Choose the closest region to your users
4. Wait for the project to be created (takes ~2 minutes)

## Step 2: Run Database Migration

1. In your Supabase project dashboard, go to "SQL Editor"
2. Open the file `supabase/migrations/001_initial_schema.sql` from this repository
3. Copy the entire contents and paste into the SQL Editor
4. Click "Run" to execute the migration
5. Verify the tables were created by checking the "Table Editor" - you should see:
   - `clubs`
   - `tournament_data`
   - `league_data`

## Step 3: Get Supabase Credentials

1. In your Supabase project dashboard, go to "Settings" → "API"
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")
   - **service_role key** (under "Project API keys" → "service_role" - keep this secret!)

## Step 4: Configure Environment Variables

### For Local Development

1. Create a file `.env.local` in the `pickleball-react` directory:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Staging API URL (highest priority)
# If set, all API calls will go to staging environment
# Example: VITE_STAGING_API_URL=https://your-app-staging.vercel.app
# Leave unset to use other options below

# Production/Override API URL (fallback if staging not set)
# If set, local dev will use this API instead of local API routes
# Example: VITE_API_BASE_URL=https://your-app.vercel.app
# Leave unset to use local API (requires vercel dev) or current origin
```

2. **Important:** The `SUPABASE_SERVICE_ROLE_KEY` should NOT be in `.env.local` as it's server-side only. It will be set in Vercel.

3. **API URL Priority:** The app checks for API URLs in this order:
   - `VITE_STAGING_API_URL` (highest priority - for staging environment)
   - `VITE_API_BASE_URL` (fallback - for production or override)
   - Current origin (default - works with `vercel dev` or in production)

### For Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service_role key (for API routes)
   - `SUPABASE_URL` = Same as VITE_SUPABASE_URL (for API routes)

## Step 5: Install Dependencies

1. Install root-level dependencies (for API routes):
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd pickleball-react
npm install
cd ..
```

3. Install Vercel CLI globally (for local development with API routes):
```bash
npm install -g vercel
```

**Note:** The root `package.json` already includes the necessary dependencies (`bcryptjs` and `@supabase/supabase-js`) for the API routes.

## Step 6: Test the Setup

### Option A: Using Vercel CLI (Recommended for API Routes)

The API routes require Vercel's serverless function runtime. For local development:

1. Install Vercel CLI globally (if not already installed):
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Link your project (from the root directory):
```bash
vercel link
```

4. Start the development server:
```bash
vercel dev
```

5. This will start both the frontend and API routes. The app will be available at the URL shown (usually `http://localhost:3000`)

### Option B: Using Vite Dev Server with Staging/Production API

If you want to use staging or production API during local development:

1. Set `VITE_STAGING_API_URL` (for staging) or `VITE_API_BASE_URL` (for production) in your `.env.local` file (see Step 4):
```env
# For staging (recommended)
VITE_STAGING_API_URL=https://your-app-staging.vercel.app

# OR for production
VITE_API_BASE_URL=https://your-app.vercel.app
```

2. Start the development server:
```bash
cd pickleball-react
npm run dev
```

3. **Note:** With `VITE_STAGING_API_URL` or `VITE_API_BASE_URL` set, all API calls will go to the specified environment. This is useful for:
   - Testing against staging/production data
   - Developing without needing to run `vercel dev`
   - Faster development workflow (no need for local API routes)

**Alternative:** If neither environment variable is set, API routes will return 404 errors in this mode. You'll need to either:
   - Use Vercel CLI (Option A) for full functionality with local API routes
   - Set `VITE_STAGING_API_URL` or `VITE_API_BASE_URL` to use remote API
   - Deploy to Vercel to test API routes

### Testing the Setup

1. Open the app in your browser
2. You should see the club selector screen
3. Try registering a new club:
   - Enter a club name
   - Enter a physical address
   - Enter a master key (at least 6 characters)
   - Enter a club slug (e.g., "test-club")
   - Click "Register Club"

4. After registration, you should be able to access the club and start using the app

## Step 7: Deploy to Vercel

1. Push your changes to your Git repository
2. Vercel will automatically detect the changes and deploy
3. Make sure all environment variables are set in Vercel (Step 4)
4. The API routes should work automatically at `/api/*`

## Troubleshooting

### "Supabase configuration missing" error
- Check that environment variables are set correctly
- For local dev, ensure `.env.local` exists in `pickleball-react/`
- For Vercel, verify environment variables in project settings

### "Failed to register club" error
- Check that the database migration ran successfully
- Verify the Supabase service_role key is correct
- Check browser console and Vercel function logs for detailed errors

### API routes return 404
- Ensure `vercel.json` includes the API route rewrites
- Check that API route files are in the `api/` directory at the root
- Verify the file structure matches: `api/clubs/[slug]/tournament.js`

### Data not saving
- Check browser console for errors
- Verify club slug is set (check sessionStorage/localStorage)
- Check Supabase dashboard → Table Editor to see if data is being saved
- Review RLS policies if data access is restricted

## Security Notes

1. **Never commit** `.env.local` or any files containing API keys
2. The `SUPABASE_SERVICE_ROLE_KEY` should only be used server-side (in API routes)
3. The `VITE_SUPABASE_ANON_KEY` is safe to expose in the frontend (it's public)
4. Master keys are hashed using bcrypt before storage
5. Row Level Security (RLS) policies provide additional database-level security

## Data Isolation

Each club's data is isolated by `club_id`:
- Tournament data is stored per club
- League data is stored per club
- Users can only access data for the club they've selected
- API routes validate club ownership before allowing data access

## Offline Support

The app includes offline support:
- Data is cached in localStorage when offline
- Changes are queued and synced when connection is restored
- The app gracefully degrades to localStorage-only mode if API is unavailable

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Vercel function logs (in Vercel dashboard)
3. Check Supabase logs (in Supabase dashboard)
4. Verify all environment variables are set correctly
