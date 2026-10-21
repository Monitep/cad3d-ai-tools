#!/usr/bin/env python3
"""Compatibility entry point for the canonical CAD3D source builder."""
from pathlib import Path
import runpy

if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).resolve().parents[1] / "cad3d-site" / "build.py"), run_name="__main__")
