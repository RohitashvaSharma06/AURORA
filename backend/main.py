"""Offline-safe railway data boundary. No provider is called without explicit configuration."""
import asyncio, os
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from fastapi import FastAPI, WebSocket, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

app = FastAPI(title="Aurora Control Center", version="1.1")
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCENARIOS = ["NORMAL OPERATION", "SENSOR FAILURE", "SIGNAL FAILURE", "GPS FAILURE", "COMMUNICATION FAILURE", "ENGINE FAILURE", "BRAKE FAILURE", "OVERSPEED", "TRACK OBSTRUCTION", "COLLISION TEST"]
state = {"mode":"REPLAY", "scenario":"SENSOR FAILURE", "running":False}
live_runtime = {"lastRequest":None, "lastSuccess":None, "vehicles":0, "error":None}

class RailPosition(BaseModel):
    trainNumber: str; trainName: str; latitude: float; longitude: float; speed: float
    heading: float | None = None; route: str; timestamp: datetime; source: str; status: str = "IN_TRANSIT"

class RailDataProvider(ABC):
    """All providers return the same normalized geographic payload."""
    name = "unknown"
    @abstractmethod
    async def positions(self) -> list[RailPosition]: ...

class ReplayRailDataProvider(RailDataProvider):
    name = "bundled recorded replay"
    async def positions(self):
        return [RailPosition(trainNumber="12956", trainName="Mumbai Rajdhani", latitude=19.0760, longitude=72.8777, speed=86, heading=14, route="Mumbai Central → New Delhi", timestamp=datetime.now(timezone.utc), source=self.name)]

class SimulationRailDataProvider(ReplayRailDataProvider):
    name = "deterministic simulation"

class LiveRailDataProvider(RailDataProvider):
    """Legitimate GTFS-Realtime VehiclePositions adapter (for example TfNSW)."""
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
            request = Request(base_url, headers={header:api_key, "Accept":"application/x-protobuf"})
            with urlopen(request, timeout=12) as response: return response.read()
        message = gtfs_realtime_pb2.FeedMessage(); message.ParseFromString(await asyncio.to_thread(fetch))
        now = datetime.now(timezone.utc); records = []
        for entity in message.entity:
            if not entity.HasField("vehicle") or not entity.vehicle.HasField("position"): continue
            vehicle, position = entity.vehicle, entity.vehicle.position
            descriptor = vehicle.vehicle
            number = descriptor.label or descriptor.id or entity.id
            route = vehicle.trip.route_id or vehicle.trip.trip_id or "GTFS-RT service"
            stamp = datetime.fromtimestamp(vehicle.timestamp, timezone.utc) if vehicle.timestamp else now
            records.append(RailPosition(trainNumber=number, trainName=descriptor.label or number, latitude=position.latitude, longitude=position.longitude, speed=(position.speed * 3.6 if position.speed else 0), heading=position.bearing if position.bearing else None, route=route, timestamp=stamp, source=os.getenv("RAIL_DATA_PROVIDER", self.name), status="LIVE"))
        return records

def live_configuration() -> dict:
    """Safe provider diagnostics: endpoint host/key values are never returned."""
    enabled = os.getenv('LIVE_MODE_ENABLED', 'true').lower() in ('1', 'true', 'yes')
    endpoint = os.getenv('RAIL_API_BASE_URL') or os.getenv('GTFS_RT_URL')
    key = os.getenv('RAIL_API_KEY') or os.getenv('GTFS_RT_API_KEY')
    if not enabled:
        return {"status":"LIVE_UNAVAILABLE", "reason":"LIVE_MODE_ENABLED is false", "configured":False, **live_runtime}
    if not endpoint:
        return {"status":"LIVE_UNAVAILABLE", "reason":"Missing RAIL_API_BASE_URL or GTFS_RT_URL", "configured":False, **live_runtime}
    if not key:
        return {"status":"LIVE_AUTH_REQUIRED", "reason":"Missing RAIL_API_KEY or GTFS_RT_API_KEY", "configured":False, **live_runtime}
    if live_runtime["error"]:
        return {"status":"LIVE_FEED_ERROR", "reason":live_runtime["error"], "configured":True, "provider":os.getenv('RAIL_DATA_PROVIDER', 'GTFS-Realtime VehiclePositions'), **live_runtime}
    return {"status":"LIVE_AVAILABLE", "reason":"Provider is configured; feed fetch pending", "configured":True, "provider":os.getenv('RAIL_DATA_PROVIDER', 'GTFS-Realtime VehiclePositions'), **live_runtime}

def provider(mode: str) -> RailDataProvider:
    return {"LIVE":LiveRailDataProvider(), "REPLAY":ReplayRailDataProvider(), "SIMULATION":SimulationRailDataProvider()}[mode]

class ScenarioRequest(BaseModel):
    scenario: str = Field(pattern="^(NORMAL OPERATION|SENSOR FAILURE|SIGNAL FAILURE|GPS FAILURE|COMMUNICATION FAILURE|ENGINE FAILURE|BRAKE FAILURE|OVERSPEED|TRACK OBSTRUCTION|COLLISION TEST)$")
class ModeRequest(BaseModel): mode: str = Field(pattern="^(LIVE|REPLAY|SIMULATION)$")

@app.get('/api/health')
def health(): return {"status":"ok", "mode":state["mode"], "safety":"simulation only"}
@app.get('/api/scenarios')
def scenarios(): return {"scenarios":SCENARIOS}
@app.post('/api/scenarios/start')
def start(request: ScenarioRequest): state.update(scenario=request.scenario, running=True); return state
@app.post('/api/scenarios/pause')
def pause(): state["running"]=False; return state
@app.post('/api/scenarios/resume')
def resume(): state["running"]=True; return state
@app.post('/api/scenarios/reset')
def reset(): state["running"]=False; return state
@app.post('/api/mode')
def set_mode(request: ModeRequest): state['mode']=request.mode; return {**state, "liveConfigured":live_configuration()["configured"]}
@app.get('/api/system/status')
def status(): return {**state, "providers":{"rail":provider(state['mode']).name, "ai":"deterministic safety engine", "websocket":"available"}}
@app.get('/api/providers')
def providers():
    live = live_configuration()
    return {"live":{**live,"available":live["configured"]},"replay":{"available":True},"simulation":{"available":True}}
@app.get('/api/live/status')
def live_status(): return live_configuration()
@app.get('/api/trains', response_model=list[RailPosition])
async def trains():
    if state['mode'] == 'LIVE':
        diagnostic = live_configuration()
        if not diagnostic['configured']:
            return []
        try:
            live_runtime.update(lastRequest=datetime.now(timezone.utc).isoformat(), error=None)
            records = await provider('LIVE').positions()
            live_runtime.update(lastSuccess=datetime.now(timezone.utc).isoformat(), vehicles=len(records), error=None if records else "Feed returned no valid vehicle positions")
            return records
        except Exception as exc:
            # Do not turn provider failures into a blank-page/500 failure.
            live_runtime.update(lastRequest=datetime.now(timezone.utc).isoformat(), error=f"{type(exc).__name__}: {exc}")
            return []
    return await provider(state['mode']).positions()
@app.websocket('/ws/simulation')
async def simulation(websocket: WebSocket):
    await websocket.accept()
    while True:
        await websocket.send_json({"type":"status","timestamp":datetime.now(timezone.utc).isoformat(),**state})
        await asyncio.sleep(1)

@app.get('/favicon.ico')
def favicon():
    # A small built-in Aurora mark avoids an otherwise noisy 404 without an extra binary asset.
    return Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#091116"/><circle cx="16" cy="16" r="11" fill="none" stroke="#4ed3db" stroke-width="3"/><circle cx="16" cy="16" r="4" fill="#4ed3db"/></svg>', media_type='image/svg+xml')

# Keep API and WebSocket routes above this final mount. It serves the existing unbundled GUI and assets same-origin.
app.mount('/', StaticFiles(directory=PROJECT_ROOT, html=True), name='aurora-frontend')
