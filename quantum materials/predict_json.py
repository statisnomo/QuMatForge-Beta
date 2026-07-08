import sys
import json
import warnings
warnings.filterwarnings('ignore')

from quantum_engine import predict_single

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Formula required"}))
        sys.exit(1)
    
    formula = sys.argv[1]
    
    try:
        # We assume quantum_engine.py handles the defaults and errors
        result = predict_single(formula, model_dir=".")
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
