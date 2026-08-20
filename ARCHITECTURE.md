# Aurora architecture

The browser application is an offline-first presentation simulation. `app.js` owns the deterministic telemetry, anomaly, diagnosis, risk and braking state machine. It emits one frame-rate-independent state (`distance`, km/h speed, target speed, phase and failure) to `three-scene.js`. The renderer maps distance to a deterministic reconstructed route curve; each vehicle samples its own trailing distance and its quaternion follows that point's tangent.

The FastAPI service in `backend/main.py` supplies a normalized `RailDataProvider` boundary with `LiveRailDataProvider`, `ReplayRailDataProvider`, and `SimulationRailDataProvider`. LIVE fails closed unless an authorized adapter and `RAIL_API_BASE_URL`/`RAIL_API_KEY` are configured. The default UI labels replay identity/context separately from simulated movement and intervention. It never sends a command to railway infrastructure.

The deterministic fallback is intentionally the authoritative safety path: an inconsistent speed-sensor channel is detected against wheel/GPS telemetry, risk is calculated from separation and braking distance, and only allowlisted braking actions are selected.
