from pydantic import BaseModel, Field
from typing import Optional, List


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)


class MaterialResult(BaseModel):
    formula: str
    material_id: str
    sq_dB_pred: Optional[float] = None
    band_gap: Optional[float] = None
    refractive_index: Optional[float] = None
    piezoelectric_modulus: Optional[float] = None
    hull_eV: Optional[float] = None
    photonic_score: Optional[float] = None
    spacegroup: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    results: List[MaterialResult]
    result_count: int


class PredictRequest(BaseModel):
    formula: str = Field(..., min_length=1, max_length=100)


class FeatureContribution(BaseModel):
    feature: str
    value: float
    importance: float


class NearestMatch(BaseModel):
    formula: str
    material_id: str
    actual_photonic_score: float
    distance: float


class PredictResponse(BaseModel):
    formula: str
    predicted_photonic_score: float
    score_max: int
    num_elements: int
    confidence: str
    top_contributing_features: List[FeatureContribution]
    composition_flags: List[str]
    nearest_known_match: Optional[NearestMatch] = None