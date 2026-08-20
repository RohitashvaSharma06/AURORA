"""Validate Aurora's browser-ready railway assets without fetching restricted files."""
from __future__ import annotations
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "frontend" / "public" / "assets"
REQUIRED = [ASSETS / "trains" / "wap7" / "locomotive.glb"]
OPTIONAL = [ASSETS / "trains" / "passenger_coach" / "coach.glb"]

def valid_glb(path: Path) -> tuple[bool, str]:
    if not path.exists(): return False, "missing"
    if path.stat().st_size < 20: return False, "too small"
    with path.open("rb") as f: header = f.read(12)
    if len(header) != 12: return False, "truncated header"
    magic, version, total = struct.unpack("<III", header)
    if magic != 0x46546C67 or version != 2: return False, "not GLB 2.0"
    if total != path.stat().st_size: return False, "invalid declared length"
    return True, f"{path.stat().st_size / 1024 / 1024:.1f} MiB"

def main() -> int:
    failures = []
    for asset in REQUIRED:
        ok, detail = valid_glb(asset)
        print(f"{'OK' if ok else 'MISSING'}  {asset.relative_to(ROOT)} — {detail}")
        if not ok: failures.append(asset)
    for asset in OPTIONAL:
        ok, detail = valid_glb(asset)
        print(f"{'OPTIONAL' if not ok else 'OK'}  {asset.relative_to(ROOT)} — {detail}")
    for metadata in ASSETS.glob("trains/**/metadata.json"):
        json.loads(metadata.read_text(encoding="utf-8"))
    if failures:
        print("\nAsset setup incomplete. Aurora must not fall back to primitive train geometry.")
        return 1
    print("\nAsset validation passed. GLB files are ready for Three.js GLTFLoader.")
    return 0

if __name__ == "__main__": raise SystemExit(main())
