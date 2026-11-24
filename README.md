# SweetCrave — Artisan Cake & Food Showcase App

Mobile-first food & cake showcase web app with live **The MK** Admin Panel, screen-adaptive HD image links (including Google Drive `"Anyone with the link"` support), phone-first caching, and Supabase + Netlify deployment.

## Deploy to Netlify from GitHub
1. Push this repository to GitHub (`.env` is excluded by `.gitignore`).
2. In **Netlify → Add new site → Import an existing project**, select this GitHub repository.
   - Build command: `npm run build`
   - Publish directory: `dist` (`netlify.toml` is already configured).
3. In **Netlify → Site configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Run `supabase-schema.sql` once inside your **Supabase SQL Editor** to activate live multi-user menu sync and order tracking.
5. Open your live site, tap the top-right **Man icon** to open **The MK**, unlock with your admin password, and click **Delivery & Settings → Publish All Live** once.
