# Aurora data sources

| Source | Purpose | Authentication | Fallback |
| --- | --- | --- | --- |
| Configured GTFS-Realtime VehiclePositions endpoint | Live vehicle positions, identity, speed, bearing, route and timestamp when supplied | `RAIL_API_BASE_URL`, `RAIL_API_KEY`, optional `RAIL_API_AUTH_HEADER` | LIVE opens with `NOT CONFIGURED`; it never substitutes simulated positions. |
| Bundled reconstructed replay | Presentation replay context | None | Clearly labelled `REPLAY`; movement and intervention remain simulated. |
| Local deterministic simulation | Safety scenarios and telemetry | None | Default offline mode. |
| Demo Live Feed | Presentation-only fleet movement when the live provider is unavailable | None | Explicitly labelled `DEMO FEED`; never represented as real rail data. |

The GTFS-Realtime adapter uses the documented protobuf feed protocol and only calls a URL explicitly supplied by the operator. Consult the selected provider's terms, API documentation, and GTFS-Realtime licence before configuration.
