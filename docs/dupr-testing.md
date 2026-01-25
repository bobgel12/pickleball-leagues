# DUPR UAT Testing Guide

This guide explains how to test DUPR integration and where to obtain each required environment variable.

## Where to get these values

### From DUPR (UAT keys and endpoints)

You will receive **UAT credentials** from DUPR. Use them for testing.

- **Client ID / Client Key / Client Secret**  
  Provided by DUPR for your UAT environment.

- **OAuth endpoints**  
  Provided by DUPR or listed in their Gitbook for your environment:
  - Login with DUPR: https://dupr.gitbook.io/dupr-raas/tutorials/login-with-dupr

- **Club membership endpoint**  
  Provided by DUPR or listed in Gitbook:
  - Verifying club ownership: https://dupr.gitbook.io/dupr-raas/tutorials/verifying-club-ownership-and-membership

- **Player rating and match endpoints**  
  Provided by DUPR in their API documentation for your environment.

If any endpoint URLs are missing, request them from tech@mydupr.com (include your Client ID).

### From your app / deployment

- **DUPR_STATE_SECRET**  
  Generate a random secret (32+ chars) for signing the OAuth state.  
  Example (local): use a password generator or `openssl rand -hex 32`.

- **DUPR_REDIRECT_URI**  
  Must point to your deployed callback route:  
  `https://<your-domain>/api/dupr/callback`

## Environment variables

Set these in **Vercel** (Production + Preview) and locally:

```
# DUPR OAuth / API (set in Vercel Production and Preview)
DUPR_CLIENT_ID=
DUPR_CLIENT_KEY=
DUPR_CLIENT_SECRET=
DUPR_STATE_SECRET=

# OAuth endpoints
DUPR_OAUTH_AUTHORIZE_URL=
DUPR_OAUTH_TOKEN_URL=
DUPR_OAUTH_USERINFO_URL=
DUPR_OAUTH_SCOPE=
DUPR_REDIRECT_URI=

# API endpoints
DUPR_API_TOKEN_URL=
DUPR_PLAYER_RATING_URL=
DUPR_MATCHES_URL=
DUPR_CLUB_MEMBERSHIP_URL=

# Optional overrides
DUPR_MATCH_UPDATE_METHOD=PUT
```

## Testing steps (UAT)

1. Create UAT accounts: https://uat.dupr.gg/signup  
2. Confirm your DUPR env vars in Vercel and local `.env.local`.
3. Go to **League Setup → Players** and click **Link DUPR** for a player.
4. Confirm the player shows **DUPR Linked** after login.
5. Go to **League Setup → Club DUPR Settings**:
   - Enter DUPR Club ID
   - Click **Verify DUPR Club Membership**
6. Enable sync:
   - League: **Sync Matches to DUPR → After Each Event Day**
   - Tournament: **Sync matches to DUPR → After Tournament End**
7. Complete matches, close event day or tournament end, and verify matches are sent.

## Notes

- Do not commit real secrets to git.
- Production keys replace UAT keys after DUPR approval.
