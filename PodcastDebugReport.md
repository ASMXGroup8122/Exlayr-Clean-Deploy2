# Podcast Integration Debugging Report

## Current Status

We've been working on implementing and debugging the ElevenLabs API integration for podcast generation. The integration has several components:

1. **Voice Selection Interface**: Shows voices from either custom profiles or ElevenLabs API
2. **API Key Storage for Eleven Labs**: Should be retrieved from either `organization_settings` tables, column 'elevenlabs_api_key'
3. **Debug Interface**: A page to help diagnose connection issues 

## Verified Facts

Through database queries, we've confirmed:

1. The ElevenLabs API key exists in the `organization_settings` table:
   - Organization ID: `c0d082bf-6b79-46c8-8d16-c19453c09f41`
   - API Key: `sk_4504a473af685c85cedcc35dc542547b5571617f39c27bad`

   ..but remeber this is a multi-user app so no hard coded access tokens/ apis should be used

2. There are no ElevenLabs tokens in the `oauth_tokens` table

3. The connection to ElevenLabs is working (confirmed from social connections page)

## Current Issues

### 1. API Key Retrieval Issues

Despite having the API key in the database, the system sometimes fails to retrieve it. We've made changes to:
- Use `maybeSingle()` instead of `single()` for better error handling
- Improve logging to diagnose query issues
- Ensure both sources (organization_settings and oauth_tokens) are properly checked

### 2. Voice Selection Issues

The voice selector dropdown was showing "Loading voices..." but not displaying available voices. We've fixed this to:
- First try to load custom voice profiles from the database
- Fall back to loading standard voices directly from ElevenLabs API if no custom profiles exist

### 3. Debug Page Issues

The debug page now shows:
- Whether API keys are found in both potential locations
- Lists all available organization_settings records
- Shows if the current organization ID matches the one with the API key

### 4. Next.js React Error

Our most recent error is with the Next.js React components:
```
Error: A param property was accessed directly with `params.orgId`. `params` is now a Promise and should be unwrapped with `React.use()` before accessing properties of the underlying params object.
```

This appears to be in the debug page component. The issue is that in newer versions of Next.js, route parameters are now asynchronous and need to be properly unwrapped using React.use().

## Next Steps

1. Fix the React param access issue in the PodcastDebugPage component:
   - Update the component to use `React.use(params)` before accessing orgId
   - This appears to be in `src/app/(dashboard)/dashboard/sponsor/[orgId]/campaigns/podcast-debug/page.tsx` line 19

2. After fixing the React issue, run the debug page to verify:
   - If the API key is properly being retrieved with the correct organization ID
   - If there are any other issues with the queries

3. For the voice selection:
   - Test that both custom profiles and fallback to standard ElevenLabs voices works

4. Final integration testing:
   - Verify the podcast generation works end-to-end
   - Test both single voice and conversation formats

## Notes on Database Structure

- `organization_settings`: Contains organization-specific settings including ElevenLabs API key
- `oauth_tokens`: Contains OAuth tokens for external services like ElevenLabs, Twitter, etc.
- `spoken_voice`: Contains custom voice profiles created by users

The API should be checking both tables for the API key, preferring oauth_tokens if available, but falling back to organization_settings if needed. 