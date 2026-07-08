"""
Anand — FastAPI backend for the quantum materials query chatbot.

Run with:  uvicorn main:app --reload --port 8000

Security notes:
- APP_API_KEY gates every request so your Groq quota isn't exposed publicly.
- Rate limiting is a simple in-memory per-IP sliding window — fine for a
  demo/PS1 deliverable, swap for Redis-backed limiting before real traffic.
- CORS is locked to ALLOWED_ORIGINS from config.py — update it when you
  deploy the frontend somewhere other than localhost.
"""

import time
from collections import defaultdict, deque

from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware

from config import APP_API_KEY, ALLOWED_ORIGINS, RATE_LIMIT_PER_MINUTE
from models import QueryRequest, QueryResponse, MaterialResult
from materials_engine import MaterialsEngine

app = FastAPI(title="Quantum Materials Query API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

engine = MaterialsEngine()

# ── Rate limiting: per-IP sliding window, in-memory ───────────────────────────
_request_log: dict[str, deque] = defaultdict(deque)


def rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    window = _request_log[ip]

    while window and now - window[0] > 60:
        window.popleft()

    if len(window) >= RATE_LIMIT_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Too many requests. Slow down.")

    window.append(now)


# ── API key auth ───────────────────────────────────────────────────────────────
def verify_api_key(x_api_key: str = Header(default="")):
    if not APP_API_KEY:
        raise HTTPException(status_code=500, detail="Server misconfigured: APP_API_KEY not set")
    if x_api_key != APP_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


@app.get("/health")
def health():
    return {"status": "ok", "materials_loaded": len(engine.df)}


@app.post("/api/query", response_model=QueryResponse)
def query_materials(
    payload: QueryRequest,
    request: Request,
    _rl=Depends(rate_limit),
    _auth=Depends(verify_api_key),
):
    # Basic input sanitation beyond pydantic's length cap
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        answer, results = engine.ask(question)
    except Exception as e:
        # Don't leak internal stack traces to the client
        raise HTTPException(status_code=500, detail=f"Query failed: {type(e).__name__}")

    result_models = [
        MaterialResult(
            formula=r.get("formula", ""),
            material_id=r.get("material_id", ""),
            sq_dB_pred=r.get("sq_dB_pred"),
            band_gap=r.get("band_gap"),
            refractive_index=r.get("refractive_index"),
            piezoelectric_modulus=r.get("piezoelectric_modulus"),
            hull_eV=r.get("hull_eV"),
            photonic_score=r.get("photonic_score"),
            spacegroup=r.get("spacegroup"),
        )
        for r in results
    ]

    return QueryResponse(answer=answer, results=result_models, result_count=len(result_models))
