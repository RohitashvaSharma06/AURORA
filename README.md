# AURORA Control Center — Railway Safety & AI Decision-Support Platform

AURORA is an educational railway-safety and artificial intelligence decision-support simulation platform modeled after modern railway Operations Control Centers (OCC). It combines an infinite procedural 3D corridor streaming engine, modular rolling stock assets, real Indian Railways timetable operations, multi-aspect signalling interlocking, automated level crossings, and a real-life-inspired safety decision engine.

> **Safety Boundary & Disclaimer**: AURORA is an educational and research prototype for decision-support visualization. It is **not** certified railway signalling, dispatching, or automatic train protection (ATP) software. Safety invariants always override train priority or timetable optimization.

---

## 1. System Architecture & Capabilities

```
┌────────────────────────────────────────────────────────────────────────┐
│                   AURORA OCC FRONTEND (Three.js WebGL)                 │
│  ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────┐ │
│  │ Infinite Track Stream │ │ Train Mesh Reg.   │ │ Signal & Crossing │ │
│  │ (Procedural Chunks)   │ │ (Single Instance) │ │ State Machines    │ │
│  └───────────────────────┘ └───────────────────┘ └───────────────────┘ │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ Custom Events & Telemetry
┌───────────────────────────────────┴────────────────────────────────────┐
│                    OCC DASHBOARD & AI DECISION CORE                    │
│  ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────┐ │
│  │ 19 IR Failure Rules   │ │ Zero-Overlap Guard│ │ Real-Time Explain │ │
│  │ (Detection→Protection)│ │ (Braking Margin)  │ │ & Timetable HUD   │ │
│  └───────────────────────┘ └───────────────────┘ └───────────────────┘ │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ REST API / WebSockets
┌───────────────────────────────────┴────────────────────────────────────┐
│                   FASTAPI BACKEND & DATA PROVIDERS                     │
│  ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────┐ │
│  │ Ajmer–Jaipur Timetable│ │ GTFS-RT Adapter   │ │ Mode & Diagnostics│ │
│  │ Replay Provider       │ │ (TfNSW / OpenData)│ │ Endpoint API      │ │
│  └───────────────────────┘ └───────────────────┘ └───────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Pillars:
1. **Zero-Overlap Invariant**: Hard mathematical safety invariant guaranteeing train headway, block reservation, and minimum 120m braking margins. Conflicting trains are safely held at preceding signals or station loop lines.
2. **Ghost Train Prevention**: Deterministic `trainRegistry` map maintaining exactly one `THREE.Group` per train ID. Train selection or fleet resets never instantiate duplicate meshes.
3. **Infinite Non-Looping Track**: Replaced all distance modulo-wrapping with continuous monotonic distance coordinates. Procedural track chunks stream ahead of the camera and recycle behind. Arriving at destination (135 km) marks the train as `COMPLETED_SERVICE` at the platform.
4. **Physically Accurate Speeds**: Displayed velocity (km/h), simulated displacement ($v = \text{speed} / 3.6\text{ m/s}$), and master simulation clock strictly synchronize.
5. **Dynamic MACLS Signalling & Level Crossings**: 4-aspect colour light signals (Green, Attention, Caution, Danger) dynamically reflect block occupancy. Level crossing boom barriers lower automatically on train approach with flashing hazard lights.
6. **Physical Turnout Rerouting**: Trains smoothly negotiate physical crossover curves and switch motors when executing diversion protocols.
7. **Bridge Model & Controlled Collision Mode**: Custom 3D truss bridge over river canyon with a dedicated controlled collision testing mode featuring particle impact dynamics.

---

## 2. Ajmer–Jaipur Corridor Scenario

The simulation is built upon the **135 km double-track broad gauge corridor** between **Ajmer Junction (AII)** and **Jaipur Junction (JP)** in North Western Railway (NWR), India.

### Real Stations & Mileposts:
- **Ajmer Jn (AII)** — KM 0 (Terminal Platform & Yard)
- **Madar Jn (MD)** — KM 7 (Junction & Crossover)
- **Ladpura (LR)** — KM 17 (LC Gate LC-18)
- **Kishangarh (KSG)** — KM 29 (Passing Loop & Marble City Bridge)
- **Mandawariya (MNHA)** — KM 42 (Block Section)
- **Tilor (TL)** — KM 52 (Intermediate Station)
- **Naraina (NRI)** — KM 65 (Crossing Station & Siding)
- **Phulera Jn (FL)** — KM 80 (Major Junction, Yard & Bridge)
- **Hirnoda (HDA)** — KM 90 (Double Line Block)
- **Asalpur Jobner (JOB)** — KM 102 (Platform & Road LC)
- **Bobas (BOBS)** — KM 112 (Block Post)
- **Dhankya (DNK)** — KM 122 (Intermediate Section)
- **Kanakpura (KKU)** — KM 128 (Jaipur Suburb Crossover)
- **Jaipur Jn (JP)** — KM 135 (Corridor Terminus)

### Timetabled Indian Railways Services:
| Train # | Service Name | Category | Priority | Max Speed | Consist |
|---|---|---|---|---|---|
| **20977** | Ajmer – Chandigarh Vande Bharat Express | Premium Semi-High Speed | **Priority 1** | 130 km/h | 4-Car Aerodynamic EMU |
| **12015** | New Delhi – Ajmer Shatabdi Express | Premium Superfast | **Priority 2** | 120 km/h | WAP-7 + LHB Coaches |
| **12957** | Swarna Jayanti Rajdhani Express | Premium Superfast AC | **Priority 2** | 120 km/h | WAP-7 + LHB AC |
| **12988** | Ajmer – Sealdah Superfast Express | Superfast Express | **Priority 3** | 110 km/h | WAP-7 + LHB Coaches |
| **12414** | Pooja Superfast Express | Superfast Express | **Priority 3** | 110 km/h | WAP-7 + LHB Coaches |
| **19610** | Yog Nagari Rishikesh Express | Mail / Express | **Priority 4** | 100 km/h | Locomotive + Coaches |
| **14801** | Jodhpur – Indore Express | Mail / Express | **Priority 4** | 95 km/h | Locomotive + Coaches |
| **09605** | Ajmer – Jaipur Special Passenger | Passenger / Local | **Priority 5** | 75 km/h | Locomotive + Coaches |
| **59607** | Ajmer – Phulera Passenger Local | Passenger / Local | **Priority 5** | 70 km/h | Locomotive + Coaches |
| **BCN-7042**| Container Freight Express | Freight Cargo | **Priority 6** | 65 km/h | WAP-7 + Container Wagons |
| **BOXN-8812**| Heavy Mineral Freight Rake | Heavy Freight | **Priority 6** | 60 km/h | WAP-7 + Heavy Wagons |
| **DFC-909** | Dedicated Freight Corridor Rake | Dedicated Freight | **Priority 6** | 65 km/h | Locomotive + Wagons |

---

## 3. Indian Railways Failure AI Engine (19 Protocols)

AURORA models real-world Indian Railways **General & Subsidiary Rules (G&SR)**, Operating Manual, and Signal Engineering protocols across 19 distinct failure types:

1. **Track Obstruction** (Debris / Boulder): Danger signal clamp, detonators, physical crossover diversion or precedence hold.
2. **Rail Fracture** (USFD Defect): Axle counter trip, block clamped at Danger, 10 km/h pilot order.
3. **Signal Failure** (Aspect Blackout): Automated fail-safe to Danger; Operation under Caution Order T/369-3b at 15 km/h.
4. **Turnout / Switch Machine Failure**: Mechanical clamp & padlocking of point blades in normal straight alignment.
5. **Track Circuit / Axle Counter Anomaly**: Signal trip, manual track verification, pilot movement.
6. **Communication Loss** (MTRC/VHF radio): Automatic block spacing and time-interval method.
7. **OHE 25kV Traction Failure**: Pantograph lowering, coasting to neutral section or diesel assist loco.
8. **Train Breakdown** (Hot Axle Box): Protective rear spacing buffer of 800m; relief loco dispatch.
9. **Emergency Brake Application** (Passenger ACP): Tail lamp flashing; brake pipe pressure recharged after PEAV reset.
10. **Level Crossing Obstruction**: Gate distant signal at Danger; train held before gate until obstruction cleared.
11. **Bridge Restriction**: Structural flood alert; speed clamped to 20 km/h or bypass line diversion.
12. **Tunnel Blockage**: Portal signals locked at Danger; emergency smoke ventilation activated.
13. **Route Conflict**: High-priority train (Vande Bharat/Rajdhani) granted mainline run-through; lower-priority held in loop line.
14. **Junction Congestion**: Dynamic headway spacing; staggered departures to prevent interlocking gridlock.
15. **Temporary Speed Restriction (TSR)**: Caution Order speed clamp (30 km/h) over engineering section.
16. **Weather / Fog**: Fog Pilot in cab; speed capped at 60 km/h; audible detonator placements.
17. **Platform Blockage**: Diverted to Platform 2 loop line via facing points.
18. **Maintenance Mega Block**: Single Line Working (SLW) consolidation on alternate line.
19. **Cascading Delay**: Timetable buffer adjustment and regulated throttling.

---

## 4. 3D Assets & Quality

Modular, verified 3D assets generated in GLB 2.0 format:
- `AURORA_engine.glb` / `wap7/locomotive.glb`: WAP-7 electric locomotive with pantographs, windshields, headlights, bogies, and couplers.
- `AURORA_passenger_coach.glb` / `passenger_coach/coach.glb`: Stainless steel LHB passenger coach with tinted windows, gangways, and FIAT bogies.
- `AURORA_vande_bharat.glb` / `vande_bharat/vande_bharat.glb`: Aerodynamic Train 18 multiple unit driving cab and trailer cars.
- `AURORA_freight_wagon.glb` / `freight/wagon.glb`: BCN / CASNUB container wagons.
- `AURORA_bridge.glb` / `bridge/bridge.glb`: Steel truss railway bridge with concrete piers safely outside rail clearance.

---

## 5. Operations & Controls

### Main Toolbar:
- **START**: Grant movement authority and start simulation master clock.
- **PAUSE / RESUME**: Freeze simulation time and all train physics.
- **RESET SELECTED**: Return selected service to timetable start without destroying the 3D world.
- **DEMO INCIDENT**: Run automated scenario with track obstruction and physical diversion.
- **BRIDGE COLLISION TEST**: Controlled collision testing with particle explosion, locomotive derailment tilt, and emergency event logging.

### Simulation Speed Multipliers:
- **0.25X**, **0.5X** (Recommended presentation speeds), **1.0X** (Real-time), **2.0X**, **5.0X**.

### Camera Modes:
- **FOLLOW**: Smooth third-person dynamic chase camera.
- **CAB VIEW**: First-person driver cab perspective looking down track and signals.
- **FLYBY**: Trackside static camera watching train roar past.
- **JUNCTION**: Overhead interlocking perspective over switches and crossovers.
- **2.5D OCC**: Top-down linear control room view.

---

## 6. Local Startup & Testing

### 1. Installation:
```powershell
python -m pip install -r requirements.txt
```

### 2. Validate Assets:
```powershell
python scripts\setup_assets.py
```

### 3. Run Automated Tests:
```powershell
python -m unittest tests/test_aurora.py
```

### 4. Launch Backend & Control Center:
```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Open **`http://127.0.0.1:8000/`** in any modern web browser.
