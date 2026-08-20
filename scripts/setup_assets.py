"""Validate Aurora's browser-ready railway assets without fetching restricted files."""
from __future__ import annotations
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "frontend" / "public" / "assets"
REQUIRED = [
    ASSETS / "trains" / "wap7" / "locomotive.glb",
    ASSETS / "trains" / "passenger_coach" / "coach.glb",
    ASSETS / "trains" / "vande_bharat" / "vande_bharat.glb",
    ASSETS / "trains" / "freight" / "wagon.glb",
    ASSETS / "infrastructure" / "bridge" / "bridge.glb"
]
OPTIONAL = [
    ASSETS / "trains" / "AURORA_engine.glb",
    ASSETS / "trains" / "AURORA_passenger_coach.glb",
    ASSETS / "trains" / "AURORA_vande_bharat.glb",
    ASSETS / "trains" / "AURORA_freight_wagon.glb",
    ASSETS / "infrastructure" / "AURORA_bridge.glb"
]

def valid_glb(path: Path) -> tuple[bool, str]:
    if not path.exists(): return False, "missing"
    if path.stat().st_size < 20: return False, "too small"
    with path.open("rb") as f: header = f.read(12)
    if len(header) != 12: return False, "truncated header"
    magic, version, total = struct.unpack("<III", header)
    if magic != 0x46546C67 or version != 2: return False, "not GLB 2.0"
    if total != path.stat().st_size: return False, "invalid declared length"
    return True, f"{path.stat().st_size / 1024:.1f} KiB"

def main() -> int:
    failures = []
    print("=== AURORA 3D RAILWAY ASSET VALIDATOR ===")
    for asset in REQUIRED:
        ok, detail = valid_glb(asset)
        print(f"{'OK' if ok else 'FAIL'}  {asset.relative_to(ROOT)} — {detail}")
        if not ok: failures.append(asset)
    for asset in OPTIONAL:
        ok, detail = valid_glb(asset)
        print(f"{'OK' if ok else 'OPTIONAL'}  {asset.relative_to(ROOT)} — {detail}")
    for metadata in ASSETS.glob("trains/**/metadata.json"):
        json.loads(metadata.read_text(encoding="utf-8"))
    if failures:
        print("\nAsset setup incomplete.")
        return 1
    print("\nAll required 3D GLB assets validated successfully.")
    return 0

if __name__ == "__main__": raise SystemExit(main())
