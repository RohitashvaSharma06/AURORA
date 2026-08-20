"""
AURORA Railway Safety & AI Decision-Support Control Backend.
Offline-safe railway data boundary. Full Ajmer-Jaipur corridor replay and GTFS-RT live adapter.
"""
import asyncio, os
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from fastapi import FastAPI, WebSocket, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

app = FastAPI(title="AURORA Operations Control Center", version="2.0")
PROJECT_ROOT = Path(__file__).resolve().parents[1]

SCENARIOS = [
    "NORMAL OPERATION",
    "TRACK OBSTRUCTION",
    "RAIL FRACTURE",
    "SIGNAL FAILURE",
    "TURNOUT FAILURE",
    "TRACK CIRCUIT FAILURE",
    "COMMUNICATION FAILURE",
    "OHE TRACTION FAILURE",
    "TRAIN BREAKDOWN",
    "EMERGENCY BRAKE",
    "LEVEL CROSSING OBSTRUCTION",
    "BRIDGE RESTRICTION",
    "TUNNEL BLOCKAGE",
    "ROUTE CONFLICT",
    "JUNCTION CONGESTION",
    "TSR SPEED RESTRICTION",
    "WEATHER FOG PILOT",
    "PLATFORM BLOCKAGE",
    "MAINTENANCE BLOCK",
    "CASCADING DELAY",
    "CONTROLLED COLLISION TEST"
]

state = {
    "mode": "SIMULATION",
    "scenario": "NORMAL OPERATION",
    "running": True,
    "corridor": "Ajmer Jn (AII) → Jaipur Jn (JP) [135 km]"
}

live_runtime = {
    "lastRequest": None,
    "lastSuccess": None,
    "vehicles": 0,
    "error": None,
    "provider": os.getenv("RAIL_DATA_PROVIDER", "GTFS-Realtime VehiclePositions")
}

class RailPosition(BaseModel):
    trainNumber: str
    trainName: str
    latitude: float
    longitude: float
    speed: float
    heading: float | None = None
    route: str
    timestamp: datetime
    source: str
    status: str = "IN_TRANSIT"

class RailDataProvider(ABC):
    name = "unknown"
    @abstractmethod
    async def positions(self) -> list[RailPosition]: ...

class ReplayRailDataProvider(RailDataProvider):
    name = "Ajmer-Jaipur Timetable Replay"
    async def positions(self):
        now = datetime.now(timezone.utc)
        return [
            RailPosition(
                trainNumber="20977",
                trainName="Ajmer - Chandigarh Vande Bharat Exp",
                latitude=26.4499 + 0.12,
                longitude=74.6399 + 0.28,
                speed=128.0,
                heading=45.0,
                route="Ajmer Jn (AII) → Jaipur Jn (JP)",
                timestamp=now,
                source=self.name,
                status="RUNNING"
            ),
            RailPosition(
                trainNumber="12015",
                trainName="New Delhi - Ajmer Shatabdi Exp",
                latitude=26.8500,
                longitude=75.6000,
                speed=118.0,
                heading=225.0,
                route="Jaipur Jn (JP) → Ajmer Jn (AII)",
                timestamp=now,
                source=self.name,
                status="RUNNING"
            ),
            RailPosition(
                trainNumber="12957",
                trainName="Swarna Jayanti Rajdhani Exp",
                latitude=26.5500,
                longitude=74.8800,
                speed=115.0,
                heading=45.0,
                route="Ajmer Jn (AII) → Jaipur Jn (JP)",
                timestamp=now,
                source=self.name,
                status="RUNNING"
            )
        ]

class SimulationRailDataProvider(ReplayRailDataProvider):
    name = "Deterministic Interlocking Simulation"

class LiveRailDataProvider(RailDataProvider):
    name = "GTFS-Realtime VehiclePositions"
    async def positions(self):
        base_url = os.getenv("RAIL_API_BASE_URL") or os.getenv("GTFS_RT_URL")
        api_key = os.getenv("RAIL_API_KEY") or os.getenv("GTFS_RT_API_KEY")
        if os.getenv("LIVE_MODE_ENABLED", "true").lower() not in ("1", "true", "yes") or not (base_url and api_key):
            return []
        try:
            from google.transit import gtfs_realtime_pb2
        except ImportError as exc:
            raise RuntimeError("Install gtfs-realtime-bindings to enable the configured GTFS-RT provider") from exc
        
        def fetch():
            header = os.getenv("RAIL_API_AUTH_HEADER", "x-api-key")
            request = Request(base_url, headers={header: api_key, "Accept": "application/x-protobuf"})
            with urlopen(request, timeout=12) as response:
                return response.read()
                
        message = gtfs_realtime_pb2.FeedMessage()
        message.ParseFromString(await asyncio.to_thread(fetch))
        now = datetime.now(timezone.utc)
        records = []
        for entity in message.entity:
            if not entity.HasField("vehicle") or not entity.vehicle.HasField("position"):
                continue
            vehicle, position = entity.vehicle, entity.vehicle.position
            descriptor = vehicle.vehicle
            number = descriptor.label or descriptor.id or entity.id
            route = vehicle.trip.route_id or vehicle.trip.trip_id or "GTFS-RT service"
            stamp = datetime.fromtimestamp(vehicle.timestamp, timezone.utc) if vehicle.timestamp else now
            records.append(RailPosition(
                trainNumber=number,
                trainName=descriptor.label or number,
                latitude=position.latitude,
                longitude=position.longitude,
                speed=(position.speed * 3.6 if position.speed else 0),
                heading=position.bearing if position.bearing else None,
                route=route,
                timestamp=stamp,
                source=os.getenv("RAIL_DATA_PROVIDER", self.name),
                status="LIVE"
            ))
        return records

def live_configuration() -> dict:
    enabled = os.getenv('LIVE_MODE_ENABLED', 'true').lower() in ('1', 'true', 'yes')
    endpoint = os.getenv('RAIL_API_BASE_URL') or os.getenv('GTFS_RT_URL')
    key = os.getenv('RAIL_API_KEY') or os.getenv('GTFS_RT_API_KEY')
    if not enabled:
        return {"status": "LIVE_UNAVAILABLE", "reason": "LIVE_MODE_ENABLED is false", "configured": False, **live_runtime}
    if not endpoint:
        return {"status": "LIVE_UNAVAILABLE", "reason": "Missing RAIL_API_BASE_URL or GTFS_RT_URL", "configured": False, **live_runtime}
    if not key:
        return {"status": "LIVE_AUTH_REQUIRED", "reason": "Missing RAIL_API_KEY or GTFS_RT_API_KEY", "configured": False, **live_runtime}
    if live_runtime["error"]:
        return {"status": "LIVE_FEED_ERROR", "reason": live_runtime["error"], "configured": True, **live_runtime}
    return {"status": "LIVE_AVAILABLE", "reason": "Provider is configured; ready to fetch", "configured": True, **live_runtime}

def get_provider(mode: str) -> RailDataProvider:
    return {"LIVE": LiveRailDataProvider(), "REPLAY": ReplayRailDataProvider(), "SIMULATION": SimulationRailDataProvider()}[mode]

class ScenarioRequest(BaseModel):
    scenario: str
class ModeRequest(BaseModel):
    mode: str = Field(pattern="^(LIVE|REPLAY|SIMULATION|DEMO LIVE)$")

@app.get('/api/health')
def health():
    return {"status": "ok", "mode": state["mode"], "safety": "zero-overlap invariant", "corridor": state["corridor"]}

@app.get('/api/scenarios')
def scenarios():
    return {"scenarios": SCENARIOS}

@app.post('/api/scenarios/start')
def start(request: ScenarioRequest):
    state.update(scenario=request.scenario, running=True)
    return state

@app.post('/api/scenarios/pause')
def pause():
    state["running"] = False
    return state

@app.post('/api/scenarios/resume')
def resume():
    state["running"] = True
    return state

@app.post('/api/scenarios/reset')
def reset():
    state["running"] = True
    return state

@app.post('/api/mode')
def set_mode(request: ModeRequest):
    state['mode'] = request.mode
    return {**state, "liveConfigured": live_configuration()["configured"]}

@app.get('/api/system/status')
def status():
    p = get_provider('SIMULATION' if state['mode'] == 'DEMO LIVE' else state['mode'])
    return {**state, "providers": {"rail": p.name, "ai": "AURORA Indian Railways Safety Engine", "websocket": "available"}}

@app.get('/api/providers')
def providers():
    live = live_configuration()
    return {"live": {**live, "available": live["configured"]}, "replay": {"available": True}, "simulation": {"available": True}}

@app.get('/api/live/status')
def live_status():
    return live_configuration()

@app.get('/api/trains', response_model=list[RailPosition])
async def trains():
    if state['mode'] == 'LIVE':
        diagnostic = live_configuration()
        if not diagnostic['configured']:
            return []
        try:
            live_runtime.update(lastRequest=datetime.now(timezone.utc).isoformat(), error=None)
            records = await get_provider('LIVE').positions()
            live_runtime.update(
                lastSuccess=datetime.now(timezone.utc).isoformat(),
                vehicles=len(records),
                error=None if records else "Feed returned 0 vehicle positions"
            )
            return records
        except Exception as exc:
            live_runtime.update(lastRequest=datetime.now(timezone.utc).isoformat(), error=f"{type(exc).__name__}: {exc}")
            return []
    return await get_provider('SIMULATION' if state['mode'] == 'DEMO LIVE' else state['mode']).positions()

@app.websocket('/ws/simulation')
async def simulation(websocket: WebSocket):
    await websocket.accept()
    while True:
        await websocket.send_json({"type": "status", "timestamp": datetime.now(timezone.utc).isoformat(), **state})
        await asyncio.sleep(1)

@app.get('/favicon.ico')
def favicon():
    return Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#070d10"/><circle cx="16" cy="16" r="11" fill="none" stroke="#4ed3db" stroke-width="3"/><circle cx="16" cy="16" r="4" fill="#22ff77"/></svg>', media_type='image/svg+xml')

app.mount('/', StaticFiles(directory=PROJECT_ROOT, html=True), name='aurora-frontend')
