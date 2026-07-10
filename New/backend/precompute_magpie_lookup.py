"""
Anand — live inference on arbitrary user-typed compositions, now with
richer explanation: feature importance, composition flags, confidence,
and comparison against the nearest real material in your database.
"""

import warnings
import numpy as np
import pandas as pd
import joblib
from pymatgen.core import Composition
from matminer.featurizers.composition import ElementProperty

warnings.filterwarnings("ignore")

XGB_MODEL_PATH = "./models_store/photonic_qubit_model_main.pkl"
MAGPIE_LOOKUP_PATH = "./data/magpie_lookup.csv"

# Elements worth flagging — not exhaustive, just common red flags for
# practical synthesis/safety, Anand can extend this list as needed
TOXIC_OR_RADIOACTIVE = {
    "Pb", "Cd", "Hg", "As", "Tl",
    "U", "Th", "Ra", "Ac", "Pu", "Np", "Am",
}

# Human-readable labels for the Magpie feature names, so the frontend
# doesn't show raw column names like "MagpieData mean Electronegativity"
FEATURE_LABELS = {
    "MagpieData mean Electronegativity": "average electronegativity",
    "MagpieData range Electronegativity": "electronegativity spread across elements",
    "MagpieData mean AtomicWeight": "average atomic weight",
    "MagpieData mean MeltingT": "average elemental melting point",
    "MagpieData mean GSbandgap": "average ground-state bandgap of constituents",
    "MagpieData mean CovalentRadius": "average covalent radius",
    "MagpieData mean NValence": "average valence electron count",
    "MagpieData range GSbandgap": "bandgap spread across constituents",
    "MagpieData mean GSvolume_pa": "average per-atom volume",
    "MagpieData mean SpaceGroupNumber": "average constituent spacegroup number",
}


class LiveFormulaPredictor:
    def __init__(self, model_path: str = XGB_MODEL_PATH):
        self.model = joblib.load(model_path)
        self.expected_features = list(self.model.feature_names_in_)
        self.featurizer = ElementProperty.from_preset("magpie")
        self.featurizer.set_n_jobs(1)

        self.importances = dict(zip(self.expected_features, self.model.feature_importances_))

        # Load precomputed lookup table for nearest-match comparison, if it exists
        try:
            self.lookup_df = pd.read_csv(MAGPIE_LOOKUP_PATH)
            self.lookup_features = self.lookup_df[self.expected_features].values.astype(float)
            self.lookup_available = True
        except Exception:
            self.lookup_df = None
            self.lookup_features = None
            self.lookup_available = False
            print("WARNING: magpie_lookup.csv not found — nearest-match comparison disabled. "
                  "Run precompute_magpie_lookup.py to enable it.")

    def _compute_features(self, formula: str) -> pd.DataFrame:
        comp = Composition(formula)
        df = pd.DataFrame({"composition": [comp]})
        df = self.featurizer.featurize_dataframe(df, col_id="composition", ignore_errors=True)
        df_aligned = df.reindex(columns=self.expected_features, fill_value=np.nan)
        return df_aligned

    def _composition_flags(self, comp: Composition) -> list:
        flags = []
        elements = [str(e) for e in comp.elements]

        toxic_present = [e for e in elements if e in TOXIC_OR_RADIOACTIVE]
        if toxic_present:
            flags.append(f"Contains element(s) with toxicity/handling concerns: {', '.join(toxic_present)}")

        if len(elements) > 5:
            flags.append(f"High compositional complexity ({len(elements)} distinct elements) — "
                          f"synthesis difficulty likely increases with arity")

        if len(elements) == 1:
            flags.append("Single-element composition — Magpie range/spread features are undefined "
                          "for elemental solids, treat this prediction with extra caution")

        return flags

    def _top_contributing_features(self, features_row: pd.Series, top_n: int = 5) -> list:
        # Rank this formula's own features by (importance x value) to surface
        # what's actually driving THIS prediction, not just globally important features
        contributions = []
        for feat, value in features_row.items():
            if pd.isna(value):
                continue
            importance = self.importances.get(feat, 0.0)
            contributions.append((feat, value, importance, importance * abs(value)))

        contributions.sort(key=lambda x: x[3], reverse=True)
        top = contributions[:top_n]

        return [
            {
                "feature": FEATURE_LABELS.get(feat, feat.replace("MagpieData ", "")),
                "value": round(float(val), 3),
                "importance": round(float(imp), 4),
            }
            for feat, val, imp, _ in top
        ]

    def _nearest_known_match(self, feature_vector: np.ndarray) -> dict:
        if not self.lookup_available:
            return None

        # Simple Euclidean distance in feature space — fine at this scale (11k rows)
        clean_vector = np.nan_to_num(feature_vector, nan=0.0)
        diffs = self.lookup_features - clean_vector
        distances = np.sqrt((diffs ** 2).sum(axis=1))
        best_idx = int(np.argmin(distances))
        best_row = self.lookup_df.iloc[best_idx]

        return {
            "formula": best_row["formula"],
            "material_id": best_row.get("material_id", "unknown"),
            "actual_photonic_score": round(float(best_row["photonic_score"]), 3),
            "distance": round(float(distances[best_idx]), 3),
        }

    def _confidence_note(self, features_row: pd.Series) -> str:
        missing_count = features_row.isna().sum()
        if missing_count == 0:
            return "high — full elemental data available for all constituents"
        elif missing_count < 10:
            return f"moderate — {missing_count} feature(s) had incomplete elemental data"
        else:
            return f"low — {missing_count} feature(s) missing elemental data, prediction is a rough estimate"

    def predict(self, formula: str) -> dict:
        try:
            comp = Composition(formula)
        except Exception as e:
            return {"error": f"'{formula}' is not a valid chemical formula: {e}"}

        features_df = self._compute_features(formula)
        features_row = features_df.iloc[0]

        X = features_row.fillna(0.0).values.reshape(1, -1).astype(float)
        predicted_score = float(self.model.predict(X)[0])
        predicted_score = max(0.0, min(11.0, predicted_score))

        result = {
            "formula": str(comp.reduced_formula),
            "predicted_photonic_score": round(predicted_score, 3),
            "score_max": 11,
            "num_elements": len(comp.elements),
            "confidence": self._confidence_note(features_row),
            "top_contributing_features": self._top_contributing_features(features_row),
            "composition_flags": self._composition_flags(comp),
        }

        nearest = self._nearest_known_match(features_row.values)
        if nearest:
            result["nearest_known_match"] = nearest

        return result