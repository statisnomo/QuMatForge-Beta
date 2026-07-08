"""
Materials query engine, Anand — this is your Option A notebook logic
(extract_params -> query_database -> generate_response) refactored into
a reusable class so the FastAPI route can call it cleanly.
"""

import json
import pandas as pd
import numpy as np
from groq import Groq

from config import GROQ_API_KEY, GROQ_MODEL, DATA_PATH

SYSTEM_PROMPT = """You are an expert in photonic quantum computing materials.
You help users query a database of photonic platform candidates screened
from the Materials Project.

Each material has these properties:
- sq_dB_pred: predicted squeezing in dB (higher = better, LiNbO3 baseline = 2.86 dB)
- band_gap: electronic band gap in eV (need > 3.2 eV for 775nm pump transparency)
- refractive_index n: (ideal range 1.8-2.5 for waveguide confinement)
- piezoelectric_modulus: chi(2) proxy in C/m2 (higher = more nonlinear = more squeezing)
- hull_eV: thermodynamic stability (0 = ground state, < 0.1 = synthesisable)
- photonic_score: overall score 0-11 (11 = best, LiNbO3 scores 11)
- spacegroup: crystal symmetry (all noncentrosymmetric — chi(2) allowed)

Extract search parameters as JSON only, no other text.

JSON schema:
{
  "min_gap": float or null,
  "max_gap": float or null,
  "min_n": float or null,
  "max_n": float or null,
  "min_piezo": float or null,
  "min_sq_dB": float or null,
  "max_hull": float or null,
  "min_score": int or null,
  "top_n": int,
  "sort_by": "sq_dB_pred" or "photonic_score" or "piezoelectric_modulus" or "refractive_index",
  "elements_must_include": list of element symbols or [],
  "elements_must_exclude": list of element symbols or [],
  "spacegroup_contains": string or null
}"""

RESPONSE_SYSTEM = """You are an expert in photonic quantum computing and
continuous-variable (CV) quantum hardware, explaining materials screening
results to a researcher familiar with squeezing parameters, loss budgets,
and the LiNbO3 baseline platform (2.86 dB measured squeezing at T=0.536).
Be specific and quantitative. Keep the response to 4-6 sentences."""


class MaterialsEngine:
    def __init__(self, data_path: str = DATA_PATH):
        self.df = pd.read_csv(data_path)
        self.client = Groq(api_key=GROQ_API_KEY)

    def _extract_params(self, question: str) -> dict:
        response = self.client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=400,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())

    def _query_database(self, params: dict) -> pd.DataFrame:
        df = self.df.copy()
        df = df[df["sq_dB_pred"].notna()]

        if params.get("min_gap"):
            df = df[df["band_gap"] >= params["min_gap"]]
        if params.get("max_gap"):
            df = df[df["band_gap"] <= params["max_gap"]]
        if params.get("min_n"):
            df = df[df["refractive_index"] >= params["min_n"]]
        if params.get("max_n"):
            df = df[df["refractive_index"] <= params["max_n"]]
        if params.get("min_piezo"):
            df = df[df["piezoelectric_modulus"] >= params["min_piezo"]]
        if params.get("min_sq_dB"):
            df = df[df["sq_dB_pred"] >= params["min_sq_dB"]]
        if params.get("max_hull") is not None:
            df = df[df["hull_eV"] <= params["max_hull"]]
        if params.get("min_score"):
            df = df[df["photonic_score"] >= params["min_score"]]

        for el in params.get("elements_must_include", []) or []:
            df = df[df["formula"].str.contains(el, na=False)]
        for el in params.get("elements_must_exclude", []) or []:
            df = df[~df["formula"].str.contains(el, na=False)]

        if params.get("spacegroup_contains"):
            df = df[df["spacegroup"].str.contains(params["spacegroup_contains"], na=False)]

        sort_col = params.get("sort_by", "sq_dB_pred")
        if sort_col in df.columns:
            df = df.sort_values(sort_col, ascending=False)

        top_n = params.get("top_n", 5)
        return df.head(top_n)

    def _format_for_llm(self, results_df: pd.DataFrame) -> str:
        if len(results_df) == 0:
            return "No materials found matching the criteria."
        rows = []
        for _, r in results_df.iterrows():
            n_s = f"{r['refractive_index']:.3f}" if pd.notna(r["refractive_index"]) else "N/A"
            p_s = f"{r['piezoelectric_modulus']:.3f}" if r["piezoelectric_modulus"] > 0 else "N/A"
            rows.append(
                f"  {r['formula']} ({r['material_id']}): sq={r['sq_dB_pred']:.3f} dB, "
                f"gap={r['band_gap']:.3f} eV, n={n_s}, piezo={p_s} C/m2, "
                f"hull={r['hull_eV']:.4f} eV, score={r['photonic_score']}/11"
            )
        return "\n".join(rows)

    def _generate_response(self, question: str, results_df: pd.DataFrame) -> str:
        results_str = self._format_for_llm(results_df)
        linbo3 = self.df[self.df["material_id"] == "mp-3731"]["sq_dB_pred"].values
        linbo3_ref = f"{linbo3[0]:.3f}" if len(linbo3) else "2.860"

        response = self.client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=600,
            messages=[
                {"role": "system", "content": RESPONSE_SYSTEM},
                {
                    "role": "user",
                    "content": f"""User question: {question}

LiNbO3 reference: sq_dB={linbo3_ref}, n=2.411, piezo=4.635 C/m2, score=11/11

Database results:
{results_str}

Answer the user's question based on these results.""",
                },
            ],
        )
        return response.choices[0].message.content

    def ask(self, question: str):
        params = self._extract_params(question)
        results = self._query_database(params)
        answer = self._generate_response(question, results)

        results_clean = results.replace({np.nan: None})
        result_records = results_clean.to_dict(orient="records")

        return answer, result_records
