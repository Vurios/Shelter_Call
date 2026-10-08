"""Allow pytest to import the pipeline's small standalone modules."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
