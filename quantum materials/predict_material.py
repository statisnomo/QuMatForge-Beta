import os
import argparse
import numpy as np
import pandas as pd
import joblib
from pymatgen.core import Composition
import warnings
warnings.filterwarnings('ignore')

# Load the dictionaries needed for feature generation
from build_models_v3 import NUCLEAR_SPIN_DB, ELEM_PROPS, get_composition_features, compute_physics_t2

def predict_material(formula, band_gap=1.5, density=3.0, hull_eV=0.0):
    """
    Predicts the T2 coherence time and Quantum Score for a given material formula.
    """
    model_path = 'trained_t2_model_v3.pkl'
    feature_path = 'feature_columns_v3.pkl'
    
    if not os.path.exists(model_path) or not os.path.exists(feature_path):
        print("Error: Model files not found. Ensure 'trained_t2_model_v3.pkl' exists.")
        return
        
    # 1. Load model and feature columns
    model = joblib.load(model_path)
    feature_cols = joblib.load(feature_path)
    
    # 2. Compute physics-based base estimate
    physics_t2 = compute_physics_t2(formula, band_gap, density)
    if physics_t2 is None:
        print(f"Error: Could not compute physics for {formula}. It may contain unknown elements.")
        return
        
    # 3. Generate ML features
    feats = get_composition_features(formula)
    if feats is None:
        print(f"Error: Could not parse composition for {formula}.")
        return
        
    # Add required scalar features
    feats['band_gap'] = band_gap
    feats['density'] = density
    feats['hull_eV'] = hull_eV
    
    # 4. Format for the model
    df_sample = pd.DataFrame([feats])
    
    # Ensure all columns exist and are in the correct order
    for col in feature_cols:
        if col not in df_sample.columns:
            df_sample[col] = 0.0
            
    X_pred = df_sample[feature_cols].values
    
    # 5. Predict
    log_t2_pred = model.predict(X_pred)[0]
    t2_pred_us = 10 ** log_t2_pred
    
    # Stability penalty (same as training)
    if hull_eV > 0.05:
        t2_pred_us *= 0.3
        
    # 6. Output Results
    print("="*50)
    print(f"PREDICTION FOR: {formula}")
    print("="*50)
    print(f"Properties Provided:")
    print(f"  - Band Gap: {band_gap} eV")
    print(f"  - Density:  {density} g/cm3")
    print(f"  - Energy above hull: {hull_eV} eV")
    print("-" * 50)
    
    if t2_pred_us > 1000:
        t2_display = f"{t2_pred_us / 1000:.1f} milliseconds"
    elif t2_pred_us < 1:
        t2_display = f"{t2_pred_us * 1000:.1f} nanoseconds"
    else:
        t2_display = f"{t2_pred_us:.2f} microseconds"
        
    print(f"-> Predicted T2 Coherence: {t2_display}")
    print("="*50)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Predict Quantum T2 for a Material")
    parser.add_argument("formula", type=str, help="Chemical formula (e.g., GaAs, SiC)")
    parser.add_argument("--gap", type=float, default=1.5, help="Band gap in eV (default: 1.5)")
    parser.add_argument("--density", type=float, default=3.0, help="Density in g/cm3 (default: 3.0)")
    parser.add_argument("--hull", type=float, default=0.0, help="Energy above hull in eV (default: 0.0)")
    
    args = parser.parse_args()
    predict_material(args.formula, args.gap, args.density, args.hull)
