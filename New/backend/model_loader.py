# ── backend/model_loader.py ───────────────────────────────────────────────
import joblib
import numpy as np

class ModelBundle:
    def __init__(self, model_path: str):
        self.model = joblib.load(model_path)

    def predict(self, feature_row: np.ndarray) -> float:
        return float(self.model.predict(feature_row.reshape(1, -1))[0])

    def predict_proba(self, feature_row: np.ndarray) -> float:
        if hasattr(self.model, "predict_proba"):
            return float(self.model.predict_proba(feature_row.reshape(1, -1))[0][1])
        return None