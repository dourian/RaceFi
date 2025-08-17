# Deploying RaceFi Backend (FastAPI) to Vercel

This backend is configured to run as a Python Serverless Function on Vercel.

What was added
- api/index.py that exposes the FastAPI app from main.py as the ASGI entrypoint.
- vercel.json defining the Python runtime and routing all requests to the function.

Prereqs
- Vercel account and CLI installed: npm i -g vercel
- Python dependencies are in requirements.txt (auto-installed by Vercel)

Environment variables (set in Vercel Project Settings → Environment Variables)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- GOOGLE_MAPS_API_KEY (for /dimension routes)
- STRAVA_CLIENT_ID (for /maps OAuth)
- STRAVA_CLIENT_SECRET (for /maps OAuth)

Notes
- Do NOT set HOST/PORT on Vercel; the platform manages them.
- .env files are not used in production on Vercel. Use Vercel envs.

First-time deploy from this backend directory
1) vercel link  # link to your Vercel project (or create one)
2) vercel       # deploy a preview
3) vercel --prod  # promote to production when ready

Health check
- After deploy, check /health and / endpoints:
  https://<your-vercel-domain>/health
  https://<your-vercel-domain>/

