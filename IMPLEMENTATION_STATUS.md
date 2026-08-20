# Aurora implementation status

## Implemented

- Unbundled browser entry chain: `index.html` → `app.js` → `three-scene.js`.
- Offline REPLAY and deterministic SIMULATION modes, with an honest LIVE unavailable state.
- GTFS-Realtime VehiclePositions backend adapter, configured exclusively through environment variables.
- Track-spline train placement: distance → curve point → tangent → +Z model-axis quaternion.
- Trailing consist placement, world-space train identity/speed/risk label, GLB asset failure UI, and deterministic braking.
- Telemetry-based speed/GPS failure inference, risk response, decision log, incident indicator, manual reset, and automatic clean reset.
- Static Node frontend server and Windows launcher scripts.

## Verified locally (without browser rendering)

- JavaScript syntax for `app.js`, `three-scene.js`, and `scripts/serve-static.js`.
- HTTP 200 for the HTML, JavaScript, CSS, Three.js modules, and locomotive GLB via the local Node server.
- GLB header is valid (`glTF`) and all referenced browser asset paths exist.
- Served source contains `BUILD: AURORA-FINAL-2026`.

## Limited / needs manual browser verification

- Train-to-rail alignment, wheel contact, camera composition, GUI appearance, and reset are not claimed as visually verified.
- The current environment lacks an executable Python installation, so FastAPI/uvicorn has not been started here.
- LIVE mode requires a legitimate endpoint/API key and `gtfs-realtime-bindings`; it intentionally does not fabricate positions.
- Only one licensed locomotive GLB is currently bundled. The consist intentionally reuses that licensed asset; no separate coach asset is present.
- The replay display is a bundled reconstructed-route demonstration, not a claim of a verified historical train-position feed.
