import sys
import json
import joblib
import pandas as pd
from xgboost import XGBRegressor

def main():
    try:
        input_data = json.loads(sys.argv[1])
        
        # Define expected columns in exact order trained
        cols = ['band_gap', 'hull_eV', 'formation_eV', 'density', 'piezoelectric_modulus', 'refractive_index']
        
        # Ensure input_data has defaults if missing (for demo purposes)
        row = {c: input_data.get(c, 0.0) for c in cols}
        df = pd.DataFrame([row])
        
        # Load models
        rf = joblib.load('model_rf.joblib')
        gb = joblib.load('model_gb.joblib')
        xgb = XGBRegressor()
        xgb.load_model('model_xgb.json')
        
        rf_pred = float(rf.predict(df)[0])
        gb_pred = float(gb.predict(df)[0])
        xgb_pred = float(xgb.predict(df)[0])
        
        print(json.dumps({
            "status": "success",
            "predictions": {
                "RandomForest": rf_pred,
                "GradientBoosting": gb_pred,
                "XGBoost": xgb_pred
            }
        }))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == "__main__":
    main()
