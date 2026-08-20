# Aurora Control Center

## Local runtime

Run `start_aurora.bat`, or use the normal manual path (which does not rely on PowerShell execution policy):

```powershell
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

FastAPI is the single same-origin Aurora server: it serves the GUI, API and WebSocket at `http://127.0.0.1:8000/`. To use the optional friendly local name `http://aurora.test:8000`, run `scripts\setup-aurora-hosts.ps1` once from an elevated PowerShell. `aurora.test` is a local hosts-file alias, not public DNS.

An offline-first railway safety simulation and decision-support prototype. The default presentation uses real-world-style Indian railway identity and route context while movement, telemetry, failures, and interventions are explicitly simulated.

The default timetable schedules 16 simulated services with staggered departures and a policy hierarchy: Luxury, Superfast, Express, Passenger, Local, then Freight. This is an educational dispatch policy, not a claim about real railway operating rules. Block reservations, braking margins, and signal protection always override service priority. The renderer uses a deterministic recycled corridor so a service can continue indefinitely without visibly running out of track. Track obstruction and other route-affecting incidents reserve the connected East alternate route, visibly using its crossover geometry.

## Demonstration flow

1. Choose a train in **Selected train**, then press **Reset selected**. The selected service is staged at its own route start; it is never replaced by a hard-coded default.
2. Press **Start** and optionally **Follow train**.
3. Use **Inject failure ahead** or **Demo scenario**. The incident timeline shows detection, occupancy analysis, protective hold, diversion, and resolution.
4. Press **Explain network** for a student-facing description of the timetable, current block, failure, route choice, and hold rationale.
5. **Pause** freezes simulation time and all movement; **Resume** is the only transition back to running. **Clear events** clears history only.

SIMULATION is deterministic and controllable. REPLAY uses bundled recorded sample positions. LIVE displays only an authorized external provider. DEMO LIVE is simulated presentation streaming and is always marked as such.

Open `index.html` in a browser to run the self-contained demo. It processes a deterministic pipeline: telemetry anomaly → diagnosis → physics-based risk → braking decision → visible resolution. A failure is inferred from telemetry inconsistency; it is not supplied as a safety-engine input.

The `backend/` service is an extensible FastAPI/WebSocket starting point. Add authorized data providers through environment configuration; do not scrape or imply live data availability. See `DATA_SOURCES.md` for provenance and fallback behavior.

## Live GTFS-Realtime integration

Aurora includes a legitimate GTFS-Realtime VehiclePositions adapter. Copy `.env.example` to `.env`, install `requirements.txt`, and set `RAIL_API_BASE_URL`, `RAIL_API_KEY`, and (if necessary) `RAIL_API_AUTH_HEADER`. A documented provider is Transport for NSW Open Data's Sydney Trains GTFS-Realtime VehiclePositions feed: register for its Open Data API key, then use its documented endpoint. The adapter reads the protocol-buffer feed and normalizes vehicle location, speed, bearing, route, timestamp, and train identity. Without those credentials, LIVE stays explicitly unavailable; REPLAY remains the fully functional default.

In LIVE mode Aurora attempts the configured provider. If it cannot be configured or reached, the `DEMO LIVE FEED` control starts presentation-only deterministic movement and visibly labels it `DEMO FEED`; it is never claimed to be live railway data.

> Aurora is a research/educational railway safety simulation and decision-support prototype. It does not directly control real railway infrastructure or trains.
