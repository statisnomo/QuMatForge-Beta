# Photonic Materials Query — Web App

Anand's PS1 Option A, wrapped as a full web app: FastAPI backend serving
your screened photonic candidate database through Groq's Llama 3.3, with
a React frontend chat interface.

## Setup

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# edit .env — add your real GROQ_API_KEY and a random APP_API_KEY

mkdir -p data
# copy your photonic_candidates.csv from the notebook into backend/data/

# load env vars (Linux/Mac)
export $(cat .env | xargs)

uvicorn main:app --reload --port 8000
```

Check it's alive: `curl http://localhost:8000/health`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# edit .env — VITE_API_KEY must match backend's APP_API_KEY exactly

npm run dev
```

Open `http://localhost:5173`.

## Security notes (read before deploying anywhere public)

- **APP_API_KEY** gates every backend request — without it your Groq quota
  is exposed to anyone who finds the URL. Never commit real keys to git.
- **Rate limiting** is in-memory per-IP (20 req/min default). Fine for a
  demo; swap to Redis-backed limiting if this ever gets real traffic.
- **CORS** is locked to `ALLOWED_ORIGINS` — update this the moment your
  frontend lives somewhere other than `localhost:5173`.
- The backend never returns raw exception messages to the client — only
  a generic error type, so internals aren't leaked.

## Architecture

```
User types question
       │
       ▼
React frontend  ──POST /api/query (X-API-Key)──▶  FastAPI backend
                                                         │
                                          ┌──────────────┼──────────────┐
                                          ▼              ▼              ▼
                                   Groq: extract   pandas filter   Groq: explain
                                   parameters      over CSV        results
                                          │              │              │
                                          └──────────────┴──────────────┘
                                                         │
                                                         ▼
                                          JSON: answer + ranked material cards
```

## Still to do

- Deploy target not yet decided (Render/Railway/Vercel are free options).
- Consider swapping the static CSV for a live Materials Project query if
  the candidate list needs to stay current.
- Options B and C (foundation models, generative design) remain queued.
