# Peak Property Care

## Deploying this app

1. Create a new repository on GitHub and upload all these files (keep the folder structure).
2. On Netlify: "Add new site" → "Import an existing project" → choose this GitHub repo.
3. Build settings should auto-fill from `netlify.toml` (build command `npm run build`, publish directory `dist`). If not, set them manually.
4. In Netlify: Site settings → Environment variables → add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_TOMTOM_API_KEY`
5. Deploy. Netlify will install dependencies and build automatically.
6. Open the live URL on your phone and use "Add to Home Screen" for an app-like icon.

Never commit a real `.env` file — `.gitignore` already excludes it. Keys only live in Netlify's environment variable settings.
