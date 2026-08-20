# Data Sources & Operational Provenance

## 1. Verified Indian Railways Ajmer–Jaipur Corridor (NWR)

All stations, distances, train numbers, and schedules used in the default scenario are derived from authoritative **Indian Railways / North Western Railway (NWR) timetables**:

- **Corridor**: Ajmer Jn (AII) to Jaipur Jn (JP) via Kishangarh (KSG) and Phulera Jn (FL).
- **Corridor Distance**: 135 Route Kilometres.
- **Gauge**: 1,676 mm Broad Gauge (Electrified 25 kV AC OHE).

### Real Timetabled Services:
- `20977` / `20978` Ajmer – Chandigarh Vande Bharat Express (8-Car / 16-Car Trainset)
- `12015` / `12016` New Delhi – Ajmer Shatabdi Express
- `12957` / `12958` Swarna Jayanti Rajdhani Express
- `12987` / `12988` Ajmer – Sealdah Superfast Express
- `12413` / `12414` Pooja Superfast Express
- `19609` / `19610` Yog Nagari Rishikesh Express
- `14801` / `14802` Jodhpur – Indore Express
- `09605` / `09606` Ajmer – Jaipur Special Passenger
- `59607` Ajmer – Phulera Passenger Local
- `BCN-7042` CONCOR Freight Container Service
- `BOXN-8812` Heavy Mineral Rake
- `DFC-909` Dedicated Freight Corridor Container Express

---

## 2. Live GTFS-Realtime Integration Boundary

- **Adapter**: Standard GTFS-Realtime VehiclePositions protobuf stream.
- **Environment Variables**:
  - `RAIL_API_BASE_URL` or `GTFS_RT_URL`: Authorized feed endpoint.
  - `RAIL_API_KEY` or `GTFS_RT_API_KEY`: API key.
  - `RAIL_API_AUTH_HEADER`: Default `x-api-key`.
- **Verified Public Provider Example**: Transport for NSW (TfNSW) Open Data GTFS-RT feed.
- **Safe Fallback**: If unconfigured, the backend reports honest `LIVE_UNAVAILABLE` diagnostics and allows the user to run `DEMO LIVE` (which is visibly labelled as simulated data).
