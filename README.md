# Cluedox Standalone (Lovable-Free Version)

This is a fully independent replica of Cluedox, decoupled from the Lovable AI gateway and platform dependencies.

## Key Changes in this Version:
1. **Direct AI**: All Supabase Edge Functions call Google Gemini API directly using your `GEMINI_API_KEY`. No Lovable proxy is used.
2. **Direct Auth**: OAuth (Google Sign-In) uses standard Supabase Auth instead of the Lovable wrapper.
3. **Custom Backend**: Everything points to your own Supabase project.
4. **Clean Domain**: Share links and SEO are configured for generic/custom domain use.

## Environment Variables Required:
In your Supabase project settings, ensure the following Edge Function secrets are set:
- `GEMINI_API_KEY`: Your Google AI SDK key.
- `MSG91_AUTH_KEY`: Your MSG91 authentication key.
- `MSG91_INTEGRATED_NUMBER`: Your official system number.
- `SUPABASE_URL`: Your project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key.

## Local Development:
1. `npm install`
2. `npm run dev`

## Deployment:
1. Link to your Supabase project: `supabase link --project-ref your-project-ref`
2. Deploy functions: `supabase functions deploy`
3. Push database schema: `supabase db push`
