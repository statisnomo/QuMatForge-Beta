"""
Configuration loader for the Quantum Materials Query backend.
Anand: set these as real environment variables before running —
never commit actual keys into this file or into git.
"""

import os

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

# A simple app-level API key so random people on the internet can't
# hammer your Groq quota through your own backend. Frontend sends this
# in the X-API-Key header on every request.
APP_API_KEY = os.environ.get("APP_API_KEY", "")

# Path to your screened candidates CSV (photonic_candidates.csv from your pipeline)
DATA_PATH = os.environ.get("DATA_PATH", "./data/photonic_candidates.csv")

# Basic rate limit: requests per minute per client IP
RATE_LIMIT_PER_MINUTE = int(os.environ.get("RATE_LIMIT_PER_MINUTE", "20"))

# CORS — restrict to your actual frontend origin in production.
# "*" is fine for local dev only.
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set. Set it before starting the server.")
if not APP_API_KEY:
    print("WARNING: APP_API_KEY is not set. Backend will reject all requests until it is.")
