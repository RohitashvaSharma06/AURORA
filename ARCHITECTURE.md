# AURORA Architecture & Engineering Design

## 1. Subsystem Decomposition

```
                    ┌─────────────────────────┐
                    │      Browser GUI        │
                    │ (app.js + styles.css)   │
                    └───────────┬─────────────┘
                                │ State Events (aurora:state)
                                ▼
                    ┌─────────────────────────┐
                    │     3D WebGL Engine     │
                    │     (three-scene.js)    │
                    │ ┌─────────────────────┐ │
                    │ │ Mesh Registry (Map) │ │
                    │ ├─────────────────────┤ │
                    │ │ Procedural Chunks   │ │
                    │ ├─────────────────────┤ │
                    │ │ Signals & Crossings │ │
                    │ ├─────────────────────┤ │
                    │ │ Collision Particles │ │
                    │ └─────────────────────┘ │
                    └───────────┬─────────────┘
                                │ Telemetry Pings
                                ▼
                    ┌─────────────────────────┐
                    │      FastAPI Core       │
                    │    (backend/main.py)    │
                    │ ┌─────────────────────┐ │
                    │ │ Scenario Engine     │ │
                    │ ├─────────────────────┤ │
                    │ │ GTFS-RT Live Engine │ │
                    │ ├─────────────────────┤ │
                    │ │ Replay Provider     │ │
                    │ └─────────────────────┘ │
                    └─────────────────────────┘
```

## 2. Core Technical Invariants

### 1. Zero Ghost Train Mesh Registry
- Map `trainRegistry = new Map<string, THREE.Group>()`.
- Each train ID maps to exactly one composite consist in the 3D scene.
- Active train count strictly matches rendered train count:
  $$\text{Rendered Count} \equiv \text{Active Fleet Count}$$
- Selection changes camera interpolation and HUD bounding, never creating new meshes.

### 2. Infinite Chunk Streaming
- Route distance $d \in [0, 135000\text{ m}]$ is continuous and monotonic.
- Geometry is partitioned into $120\text{ m}$ chunks.
- The visible window streams $k \in [\lfloor d/120 \rfloor - 2, \lfloor d/120 \rfloor + 6]$ chunks dynamically.
- Distant chunks are disposed to bound GPU VRAM usage.

### 3. Hard Safety Headway & Zero-Overlap
- Headway between train $A$ and follower $B$ on same line:
  $$\Delta d = d_A - d_B \ge d_{\text{safe}} = 120\text{ m}$$
- If $\Delta d < 240\text{ m}$, caution throttling is enforced.
- If $\Delta d < 120\text{ m}$, full emergency service braking is applied.
- Lower-priority trains are staged in loop lines to yield mainline paths to higher-priority trains (Vande Bharat / Rajdhani).

### 4. Physical Rerouting Hermite Spline
- Crossover turnout transition from Up Line ($x_0 = -4$) to Down Line ($x_1 = 4$) over interval $[d_0, d_0 + 90]$:
  $$u = \frac{d - d_0}{90}, \quad s(u) = 3u^2 - 2u^3, \quad x(d) = x_0 + s(u)(x_1 - x_0)$$
- Point machine blades visually rotate to reverse alignment.

### 5. Multi-Aspect Signalling (MACLS) Interlocking
- Block Occupancy determines signal aspects:
  - Block occupied $\to$ **DANGER (RED)**
  - 1 Block clear ahead $\to$ **CAUTION (YELLOW)**
  - 2 Blocks clear ahead $\to$ **ATTENTION (DOUBLE YELLOW)**
  - 3+ Blocks clear ahead $\to$ **CLEAR (GREEN)**
