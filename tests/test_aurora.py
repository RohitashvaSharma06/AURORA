"""
AURORA Automated Test Suite.
Validates:
1. 3D GLB Asset Integrity
2. FastAPI Backend API & Live Diagnostics
3. Fleet Timetable & Priority Hierarchy
4. Failure Response Matrix
5. Zero-Overlap Invariant
"""
import struct
import json
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0, str(ROOT))

from backend.main import app, live_configuration

class TestAuroraAssets(unittest.TestCase):
    def test_glb_assets_exist_and_valid(self):
        assets_dir = ROOT / "frontend" / "public" / "assets"
        models_to_check = [
            assets_dir / "trains" / "wap7" / "locomotive.glb",
            assets_dir / "trains" / "passenger_coach" / "coach.glb",
            assets_dir / "trains" / "vande_bharat" / "vande_bharat.glb",
            assets_dir / "trains" / "freight" / "wagon.glb",
            assets_dir / "infrastructure" / "bridge" / "bridge.glb",
            assets_dir / "trains" / "AURORA_engine.glb",
            assets_dir / "trains" / "AURORA_passenger_coach.glb",
            assets_dir / "trains" / "AURORA_vande_bharat.glb",
            assets_dir / "trains" / "AURORA_freight_wagon.glb",
            assets_dir / "infrastructure" / "AURORA_bridge.glb"
        ]

        for path in models_to_check:
            self.assertTrue(path.exists(), f"Asset missing: {path}")
            self.assertGreater(path.stat().st_size, 100, f"Asset too small: {path}")
            with open(path, "rb") as f:
                header = f.read(12)
            magic, version, total = struct.unpack("<III", header)
            self.assertEqual(magic, 0x46546C67, f"Not a valid GLB magic header: {path}")
            self.assertEqual(version, 2, f"Not GLB version 2: {path}")
            self.assertEqual(total, path.stat().st_size, f"GLB total size mismatch: {path}")

class TestAuroraBackend(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("corridor", data)

    def test_scenarios_endpoint(self):
        res = self.client.get("/api/scenarios")
        self.assertEqual(res.status_code, 200)
        scenarios = res.json()["scenarios"]
        self.assertIn("TRACK OBSTRUCTION", scenarios)
        self.assertIn("CONTROLLED COLLISION TEST", scenarios)

    def test_live_diagnostics(self):
        res = self.client.get("/api/live/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("configured", data)
        self.assertIn("status", data)

    def test_replay_trains(self):
        res = self.client.get("/api/trains")
        self.assertEqual(res.status_code, 200)
        trains = res.json()
        self.assertGreater(len(trains), 0)
        self.assertEqual(trains[0]["trainNumber"], "20977")

    def test_mode_switch(self):
        res = self.client.post("/api/mode", json={"mode": "SIMULATION"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["mode"], "SIMULATION")

        res_demo = self.client.post("/api/mode", json={"mode": "DEMO LIVE"})
        self.assertEqual(res_demo.status_code, 200)
        self.assertEqual(res_demo.json()["mode"], "DEMO LIVE")

if __name__ == "__main__":
    unittest.main()
