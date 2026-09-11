"""Pytest config: make the ``src`` package importable when running from ml/."""
import os
import sys
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

os.environ.setdefault("MEDIXAI_DATASET", str(ML_DIR / "data" / "synthetic_demo_dataset.csv"))