import pandas as pd
import joblib
import json
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor

print("Loading data...")
df = pd.read_csv('photonic_final_candidates.csv')

# Features for predicting photonic squeezing (as an example)
# We will predict `photonic_score` or `sq_dB_pred`
X = df[['band_gap', 'hull_eV', 'formation_eV', 'density', 'piezoelectric_modulus', 'refractive_index']]
y = df['sq_dB_pred']

print("Training Random Forest...")
rf = RandomForestRegressor(n_estimators=100, random_state=42)
rf.fit(X, y)
joblib.dump(rf, 'model_rf.joblib')

print("Training Gradient Boosting...")
gb = GradientBoostingRegressor(n_estimators=100, random_state=42)
gb.fit(X, y)
joblib.dump(gb, 'model_gb.joblib')

print("Training XGBoost...")
xgb = XGBRegressor(n_estimators=100, random_state=42)
xgb.fit(X, y)
xgb.save_model('model_xgb.json')

print("Models exported successfully to model_rf.joblib, model_gb.joblib, and model_xgb.json!")
