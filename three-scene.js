import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';

// AURORA 3D Railway Simulation & Renderer Engine
// Features: Infinite chunk streaming, modular consist assembly, zero-ghost mesh registry,
// physical crossover rerouting, MACLS multi-aspect signals, dynamic level crossing,
// 3D bridge structure, and controlled collision particle dynamics.

export function initAuroraScene(host, onReady) {
  if (!host || !window.WebGLRenderingContext) throw new Error('WebGL unavailable');

  // Renderer Setup
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.innerHTML = '';
  host.appendChild(renderer.domElement);

  const overlay = host.parentElement;
  overlay.querySelectorAll('.three-loading, .train-label').forEach(e => e.remove());
  overlay.insertAdjacentHTML('beforeend', `
    <div class="three-loading">AURORA 3D ENGINE<br><small>Loading railway assets and streaming topology…</small></div>
    <div class="train-label" id="scene-train-label"><span>TRAIN</span><strong>0 km/h</strong><small>STATUS: NORMAL</small></div>
  `);
  const loadingElem = overlay.querySelector('.three-loading');
  const labelElem = overlay.querySelector('#scene-train-label');

  // Scene & Lighting
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1b20);
  scene.fog = new THREE.FogExp2(0x0e1b20, 0.0018);

  const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.5, 1200);
  camera.position.set(25, 18, 40);

  const hemiLight = new THREE.HemisphereLight(0xdcf2f7, 0x1a2b24, 1.8);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfffae8, 2.8);
  sunLight.position.set(-60, 90, 45);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 280;
  sunLight.shadow.camera.left = -90;
  sunLight.shadow.camera.right = 90;
  sunLight.shadow.camera.top = 90;
  sunLight.shadow.camera.bottom = -90;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  // Materials Library
  const railMat = new THREE.MeshStandardMaterial({ color: 0xd8e4e8, metalness: 0.92, roughness: 0.22 });
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4a433d, roughness: 0.9 });
  const ballastMat = new THREE.MeshStandardMaterial({ color: 0x4c5652, roughness: 0.98 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x6e888d, metalness: 0.75, roughness: 0.35 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x768285, roughness: 0.85 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x24282b, roughness: 0.92 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x1f3b2f, roughness: 0.95 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x18424b, roughness: 0.1, metalness: 0.4 });
  const glowRed = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff1111, emissiveIntensity: 3 });
  const glowYellow = new THREE.MeshStandardMaterial({ color: 0xffb81c, emissive: 0xffa000, emissiveIntensity: 2.5 });
  const glowGreen = new THREE.MeshStandardMaterial({ color: 0x22ff77, emissive: 0x00e655, emissiveIntensity: 2.8 });
  const glowOff = new THREE.MeshStandardMaterial({ color: 0x1a2428, roughness: 0.9 });

  // GLB Models Storage
  const models = {
    engine: null,
    coach: null,
    vandeBharat: null,
    freight: null,
    bridge: null
  };

  // Train Mesh Registry: Strictly trainId -> THREE.Group
  const trainRegistry = new Map();
  let stateData = { trains: [], signals: {}, switches: {}, phase: 'normal', selected: '20977', failure: null };
  let cameraMode = 'follow'; // 'follow', 'cab', 'flyby', 'junction', 'overhead', 'free'
  let collisionActive = false;
  let collisionParticles = null;
  let switchPointsMesh = {};

  // Track Layout Constants
  // Track 0: Up Main Line (X = -4)
  // Track 1: Down Main Line (X = 4)
  // Track 2: Station Loop / Alternate Line (X = -9)
  const TRACK_X = { 0: -4.0, 1: 4.0, 2: -9.0 };
  const GAUGE = 1.676; // Broad Gauge 1676 mm
  const HALF_GAUGE = GAUGE / 2;

  // Station and Landmark Positions along corridor (in meters)
  const LANDMARKS = [
    { name: 'AJMER JN (AII)', km: 0, dist: 0, hasPlatform: true, hasCrossover: true },
    { name: 'MADAR JN (MD)', km: 7, dist: 700, hasPlatform: true, hasCrossover: true },
    { name: 'LADPURA (LR)', km: 17, dist: 1700, hasPlatform: false, hasCrossing: true },
    { name: 'KISHANGARH (KSG)', km: 29, dist: 2900, hasPlatform: true, hasCrossover: true, hasBridge: true },
    { name: 'MANDAWARIYA (MNHA)', km: 42, dist: 4200, hasPlatform: false, hasCrossing: true },
    { name: 'TILOR (TL)', km: 52, dist: 5200, hasPlatform: false },
    { name: 'NARAINA (NRI)', km: 65, dist: 6500, hasPlatform: true, hasCrossing: true },
    { name: 'PHULERA JN (FL)', km: 80, dist: 8000, hasPlatform: true, hasCrossover: true, hasBridge: true },
    { name: 'HIRNODA (HDA)', km: 90, dist: 9000, hasPlatform: false },
    { name: 'ASALPUR JOBNER (JOB)', km: 102, dist: 10200, hasPlatform: true, hasCrossing: true },
    { name: 'BOBAS (BOBS)', km: 112, dist: 11200, hasPlatform: false },
    { name: 'DHANKYA (DNK)', km: 122, dist: 12200, hasPlatform: false, hasCrossing: true },
    { name: 'KANAKPURA (KKU)', km: 128, dist: 12800, hasPlatform: true, hasCrossover: true },
    { name: 'JAIPUR JN (JP)', km: 135, dist: 13500, hasPlatform: true, hasCrossover: true }
  ];

  // Mathematical Track Curve Calculator
  // Given continuous distance along route and track/route choice, returns world (x, y, z) and tangent.
  // Z axis flows forward into negative Z (-distance).
  function getTrackWorldPosition(distance, trackIndex, route) {
    let x = TRACK_X[trackIndex] !== undefined ? TRACK_X[trackIndex] : -4.0;
    let y = 0.45;
    const z = -distance;

    // Physical Crossover & Diverging Route logic
    // Crossovers exist at every 800m interval and at stations
    if (route === 'EAST_ALTERNATE' || route === 'DIVERSION' || route === 'LOOP_LINE') {
      // Diverge smoothly from Track 0 (x = -4) across to Track 1 (x = 4) or Track 2 (x = -9)
      // Crossover zone: between d0 and d0 + 90 meters
      const crossoverBase = Math.floor(distance / 800) * 800 + 150;
      if (distance >= crossoverBase && distance <= crossoverBase + 90) {
        const u = (distance - crossoverBase) / 90;
        // Smooth Hermite S-Curve
        const s = u * u * (3 - 2 * u);
        const targetX = route === 'LOOP_LINE' ? TRACK_X[2] : TRACK_X[1];
        x = THREE.MathUtils.lerp(TRACK_X[0], targetX, s);
      } else if (distance > crossoverBase + 90) {
        x = route === 'LOOP_LINE' ? TRACK_X[2] : TRACK_X[1];
      }
    }

    // Gentle realistic curvature based on terrain sinusoidal variation
    const curveOffset = Math.sin(distance * 0.0012) * 12.0 + Math.cos(distance * 0.0004) * 6.0;
    x += curveOffset;

    // Bridge elevations over riverbeds (e.g. at KSG 2900m and FL 8000m)
    if ((distance >= 2750 && distance <= 3050) || (distance >= 7850 && distance <= 8150)) {
      y = 3.8; // Elevated bridge deck
    }

    return new THREE.Vector3(x, y, z);
  }

  function getTrackTangent(distance, trackIndex, route) {
    const p1 = getTrackWorldPosition(distance - 0.5, trackIndex, route);
    const p2 = getTrackWorldPosition(distance + 0.5, trackIndex, route);
    return p2.sub(p1).normalize();
  }

  // Level Crossing Animation State
  const crossingGates = [];
  let crossingRoadVehicles = [];

  // Procedural Chunk Manager for Infinite Streaming Track
  const CHUNK_SIZE = 120; // 120 meters per chunk
  const activeChunks = new Map();
  const chunkRoot = new THREE.Group();
  scene.add(chunkRoot);

  function createTrackChunk(chunkIndex) {
    const chunkGroup = new THREE.Group();
    const startDist = chunkIndex * CHUNK_SIZE;
    const endDist = startDist + CHUNK_SIZE;

    // 1. Terrain Ground
    const groundGeo = new THREE.PlaneGeometry(160, CHUNK_SIZE, 12, 12);
    const groundMesh = new THREE.Mesh(groundGeo, grassMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, 0, -(startDist + CHUNK_SIZE / 2));
    groundMesh.receiveShadow = true;
    chunkGroup.add(groundMesh);

    // River underneath bridge sections
    const isBridgeChunk = (startDist >= 2700 && endDist <= 3100) || (startDist >= 7800 && endDist <= 8200);
    if (isBridgeChunk) {
      groundMesh.position.y = -6.5; // Canyon depression
      const riverGeo = new THREE.PlaneGeometry(150, CHUNK_SIZE);
      const river = new THREE.Mesh(riverGeo, waterMat);
      river.rotation.x = -Math.PI / 2;
      river.position.set(0, -6.2, -(startDist + CHUNK_SIZE / 2));
      chunkGroup.add(river);
    }

    // 2. Track Ballast Beds & Sleepers for Tracks 0, 1, 2
    const tracksToBuild = [0, 1];
    // Add loop line near stations
    const nearStation = LANDMARKS.some(l => Math.abs(l.dist - startDist) < 500);
    if (nearStation) tracksToBuild.push(2);

    tracksToBuild.forEach(trackIdx => {
      const railPointsL = [];
      const railPointsR = [];

      for (let d = startDist; d <= endDist; d += 0.85) {
        const p = getTrackWorldPosition(d, trackIdx, 'MAIN');
        const t = getTrackTangent(d, trackIdx, 'MAIN');
        const n = new THREE.Vector3(-t.z, 0, t.x).normalize();

        // Sleepers
        const sleeper = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 0.26), sleeperMat);
        sleeper.position.copy(p).addScaledVector(new THREE.Vector3(0, -0.08, 0), 1);
        sleeper.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), n);
        sleeper.receiveShadow = true;
        chunkGroup.add(sleeper);

        // Ballast Segment
        if (Math.round(d * 10) % 20 === 0) {
          const bed = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 2.0), ballastMat);
          bed.position.copy(p).addScaledVector(new THREE.Vector3(0, -0.22, 0), 1);
          bed.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), n);
          bed.receiveShadow = true;
          chunkGroup.add(bed);
        }

        railPointsL.push(p.clone().addScaledVector(n, -HALF_GAUGE));
        railPointsR.push(p.clone().addScaledVector(n, HALF_GAUGE));
      }

      // Continuous Rail Extrusions
      if (railPointsL.length > 1) {
        const curveL = new THREE.CatmullRomCurve3(railPointsL);
        const curveR = new THREE.CatmullRomCurve3(railPointsR);
        const railGeoL = new THREE.TubeGeometry(curveL, 48, 0.065, 5, false);
        const railGeoR = new THREE.TubeGeometry(curveR, 48, 0.065, 5, false);
        const meshL = new THREE.Mesh(railGeoL, railMat);
        const meshR = new THREE.Mesh(railGeoR, railMat);
        meshL.castShadow = meshR.castShadow = true;
        chunkGroup.add(meshL, meshR);
      }
    });

    // 3. Physical Crossover Rails between Track 0 and Track 1 at interval
    const crossoverDist = Math.floor(startDist / 800) * 800 + 150;
    if (crossoverDist >= startDist && crossoverDist + 90 <= endDist) {
      const switchL = [];
      const switchR = [];
      for (let d = crossoverDist; d <= crossoverDist + 90; d += 1.2) {
        const p = getTrackWorldPosition(d, 0, 'EAST_ALTERNATE');
        const t = getTrackTangent(d, 0, 'EAST_ALTERNATE');
        const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
        switchL.push(p.clone().addScaledVector(n, -HALF_GAUGE));
        switchR.push(p.clone().addScaledVector(n, HALF_GAUGE));
      }
      if (switchL.length > 1) {
        const cGeoL = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(switchL), 32, 0.065, 5, false);
        const cGeoR = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(switchR), 32, 0.065, 5, false);
        const cMeshL = new THREE.Mesh(cGeoL, railMat);
        const cMeshR = new THREE.Mesh(cGeoR, railMat);
        chunkGroup.add(cMeshL, cMeshR);

        // Turnout Switch Blade Motor Machine
        const motorBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.6), steelMat);
        const pSwitch = getTrackWorldPosition(crossoverDist, 0, 'MAIN');
        motorBox.position.copy(pSwitch).add(new THREE.Vector3(-2.2, 0.1, 0));
        chunkGroup.add(motorBox);
      }
    }

    // 4. OHE Catenary Masts & Cantilevers
    for (let d = startDist; d < endDist; d += 45) {
      const p = getTrackWorldPosition(d, 0, 'MAIN');
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 7.8, 8), steelMat);
      mast.position.copy(p).add(new THREE.Vector3(-4.8, 3.8, 0));
      mast.castShadow = true;
      chunkGroup.add(mast);

      // Cantilever arm
      const arm = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.1, 0.1), steelMat);
      arm.position.copy(p).add(new THREE.Vector3(0, 7.2, 0));
      chunkGroup.add(arm);

      // Contact wire dropper
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4), steelMat);
      wire.position.copy(p).add(new THREE.Vector3(0, 6.4, 0));
      chunkGroup.add(wire);
    }

    // 5. Stations & Platforms
    const station = LANDMARKS.find(l => Math.abs(l.dist - startDist) < CHUNK_SIZE / 2 && l.hasPlatform);
    if (station) {
      const stPos = getTrackWorldPosition(station.dist, 1, 'MAIN');
      const platformGroup = new THREE.Group();

      // Concrete Platform
      const platMesh = new THREE.Mesh(new THREE.BoxGeometry(70, 0.9, 5.0), concreteMat);
      platMesh.position.set(5.8, 0.45, 0);
      platMesh.receiveShadow = platMesh.castShadow = true;
      platformGroup.add(platMesh);

      // Platform Canopy Shelter
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(50, 0.25, 4.8), steelMat);
      canopy.position.set(5.8, 4.2, 0);
      platformGroup.add(canopy);

      for (let xOff = -20; xOff <= 20; xOff += 10) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8), steelMat);
        pillar.position.set(5.8 + 1.8, 2.1, xOff);
        platformGroup.add(pillar);
      }

      // Station Nameboard Signboard
      const boardTex = createStationTextTexture(station.name, '#ffffff', '#002b49');
      const board = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.4), new THREE.MeshBasicMaterial({ map: boardTex, side: THREE.DoubleSide }));
      board.position.set(5.8, 3.2, 0);
      board.rotation.y = -Math.PI / 2;
      platformGroup.add(board);

      platformGroup.position.copy(stPos);
      chunkGroup.add(platformGroup);
    }

    // 6. Level Crossing
    const crossing = LANDMARKS.find(l => Math.abs(l.dist - startDist) < CHUNK_SIZE / 2 && l.hasCrossing);
    if (crossing) {
      const crossPos = getTrackWorldPosition(crossing.dist, 0, 'MAIN');
      const road = new THREE.Mesh(new THREE.BoxGeometry(32, 0.12, 8.5), asphaltMat);
      road.position.copy(crossPos).setY(0.18);
      chunkGroup.add(road);

      // Boom Barriers (Left and Right)
      const gateL = createBoomBarrierMesh();
      gateL.position.copy(crossPos).add(new THREE.Vector3(-7.5, 0.4, 4.5));
      const gateR = createBoomBarrierMesh();
      gateR.position.copy(crossPos).add(new THREE.Vector3(7.5, 0.4, -4.5));
      gateR.rotation.y = Math.PI;

      chunkGroup.add(gateL, gateR);
      crossingGates.push({ dist: crossing.dist, gateL, gateR, isClosed: false });

      // Waiting Road Vehicles
      const car1 = createVehicleMesh(0xbf2a2a); // Red car
      car1.position.copy(crossPos).add(new THREE.Vector3(-12.0, 0.5, 3.2));
      const bus = createVehicleMesh(0x28639e, 1.8, 2.2, 7.5); // Blue Bus
      bus.position.copy(crossPos).add(new THREE.Vector3(13.5, 1.1, -3.2));
      bus.rotation.y = Math.PI;
      chunkGroup.add(car1, bus);
    }

    // 7. 3D Bridge Truss
    if (isBridgeChunk) {
      const bridgeGroup = new THREE.Group();
      // Instantiate Bridge Model or Procedural Truss
      if (models.bridge) {
        const bInst = models.bridge.clone(true);
        bInst.position.set(0, 3.5, -(startDist + CHUNK_SIZE / 2));
        bInst.scale.set(1.2, 1.2, CHUNK_SIZE / 48);
        bridgeGroup.add(bInst);
      } else {
        const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, CHUNK_SIZE), concreteMat);
        bridgeDeck.position.set(0, 3.2, -(startDist + CHUNK_SIZE / 2));
        bridgeGroup.add(bridgeDeck);
        // Concrete Piers down into river
        for (let zOffset = 15; zOffset < CHUNK_SIZE; zOffset += 35) {
          const pier = new THREE.Mesh(new THREE.BoxGeometry(3.2, 12, 3.2), concreteMat);
          pier.position.set(0, -2.5, -(startDist + zOffset));
          bridgeGroup.add(pier);
        }
      }
      chunkGroup.add(bridgeGroup);
    }

    // 8. Nature: Trees and Terrain Props
    for (let i = 0; i < 6; i++) {
      const treeDist = startDist + Math.random() * CHUNK_SIZE;
      const side = Math.random() > 0.5 ? 1 : -1;
      const xOffset = side * (16 + Math.random() * 25);
      const tree = createTreeMesh();
      const p = getTrackWorldPosition(treeDist, 0, 'MAIN');
      tree.position.set(p.x + xOffset, isBridgeChunk ? -6.0 : 0, p.z);
      chunkGroup.add(tree);
    }

    return chunkGroup;
  }

  function updateStreamingChunks(primaryDistance) {
    const currentChunk = Math.floor(primaryDistance / CHUNK_SIZE);
    const visibleRange = 6; // Chunks forward and backward

    const neededKeys = new Set();
    for (let i = Math.max(0, currentChunk - 2); i <= currentChunk + visibleRange; i++) {
      neededKeys.add(i);
      if (!activeChunks.has(i)) {
        const chunkObj = createTrackChunk(i);
        chunkRoot.add(chunkObj);
        activeChunks.set(i, chunkObj);
      }
    }

    // Recycle / Cull chunks outside frustum
    for (const [key, chunkObj] of activeChunks.entries()) {
      if (!neededKeys.has(key)) {
        chunkRoot.remove(chunkObj);
        chunkObj.traverse(child => {
          if (child.geometry) child.geometry.dispose();
        });
        activeChunks.delete(key);
      }
    }
  }

  // Dynamic Multi-Aspect Colour Light Signals (MACLS)
  const signalMasts = new Map();

  function createSignalObject(id, dist, trackIdx) {
    const group = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.8, 8), steelMat);
    mast.position.y = 2.9;

    // Signal Target Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.8, 0.35), steelMat);
    head.position.set(0, 4.8, 0);

    // Lamps: 4-Aspect (Green, Yellow 1, Red, Yellow 2)
    const lamps = {
      green: new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowOff.clone()),
      yellow1: new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowOff.clone()),
      red: new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowRed.clone()),
      yellow2: new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowOff.clone()),
    };

    lamps.green.position.set(0, 5.3, 0.16);
    lamps.yellow1.position.set(0, 4.95, 0.16);
    lamps.red.position.set(0, 4.6, 0.16);
    lamps.yellow2.position.set(0, 4.25, 0.16);

    group.add(mast, head, lamps.green, lamps.yellow1, lamps.red, lamps.yellow2);

    const pos = getTrackWorldPosition(dist, trackIdx, 'MAIN');
    group.position.copy(pos).add(new THREE.Vector3(-2.8, 0, 0));
    scene.add(group);

    return { id, group, lamps, dist, trackIdx };
  }

  // Initial Signals along Ajmer-Jaipur Corridor
  const SIGNAL_DEFS = [
    { id: 'S-101', dist: 350, track: 0 },
    { id: 'S-204', dist: 720, track: 0 },
    { id: 'S-311', dist: 1450, track: 1 },
    { id: 'S-402', dist: 2850, track: 0 },
    { id: 'S-518', dist: 4150, track: 0 },
    { id: 'S-620', dist: 6450, track: 0 },
    { id: 'S-732', dist: 7950, track: 0 },
    { id: 'S-840', dist: 10150, track: 0 },
    { id: 'S-950', dist: 12750, track: 0 }
  ];

  SIGNAL_DEFS.forEach(s => signalMasts.set(s.id, createSignalObject(s.id, s.dist, s.track)));

  function updateSignalAspects(signalsState) {
    signalMasts.forEach((sigObj, id) => {
      const aspect = signalsState[id] || 'GREEN';
      // Reset all lamps
      sigObj.lamps.red.material = glowOff;
      sigObj.lamps.yellow1.material = glowOff;
      sigObj.lamps.yellow2.material = glowOff;
      sigObj.lamps.green.material = glowOff;

      if (aspect === 'RED' || aspect === 'DANGER') {
        sigObj.lamps.red.material = glowRed;
      } else if (aspect === 'CAUTION' || aspect === 'YELLOW') {
        sigObj.lamps.yellow1.material = glowYellow;
      } else if (aspect === 'ATTENTION' || aspect === 'DOUBLE_YELLOW') {
        sigObj.lamps.yellow1.material = glowYellow;
        sigObj.lamps.yellow2.material = glowYellow;
      } else {
        sigObj.lamps.green.material = glowGreen;
      }
    });
  }

  // Level Crossing Animation Cycle
  function updateCrossingGates(trains) {
    crossingGates.forEach(cross => {
      // Check if any train is within 400m approaching or passing
      const approaching = trains.some(t => t.active && !t.completed && (cross.dist - t.distance > -30 && cross.dist - t.distance < 450));
      const targetRot = approaching ? 0 : Math.PI * 0.44; // 0 = closed horizontal, ~80 deg = open

      cross.gateL.rotation.z = THREE.MathUtils.lerp(cross.gateL.rotation.z, targetRot, 0.08);
      cross.gateR.rotation.z = THREE.MathUtils.lerp(cross.gateR.rotation.z, -targetRot, 0.08);
      cross.isClosed = approaching;
    });
  }

  // Helper 3D Builders
  function createBoomBarrierMesh() {
    const group = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), steelMat);
    post.position.y = 0.6;
    const boom = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0xffdd22, roughness: 0.4 }));
    boom.position.set(3.2, 1.1, 0);
    const flasher = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), glowRed);
    flasher.position.set(0, 1.4, 0);
    group.add(post, boom, flasher);
    return group;
  }

  function createVehicleMesh(color, w = 1.6, h = 1.3, l = 4.0) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 }));
    body.position.y = h / 2 + 0.2;
    body.castShadow = true;
    g.add(body);
    return g;
  }

  function createTreeMesh() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.2, 6), new THREE.MeshStandardMaterial({ color: 0x4a3625, roughness: 0.9 }));
    trunk.position.y = 1.6;
    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), new THREE.MeshStandardMaterial({ color: 0x214f32, roughness: 0.9 }));
    foliage.position.y = 4.2;
    foliage.castShadow = true;
    g.add(trunk, foliage);
    return g;
  }

  function createStationTextTexture(text, fg = '#ffffff', bg = '#071822') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#4ed3db';
    ctx.fillRect(0, 0, 512, 8);
    ctx.fillRect(0, 120, 512, 8);
    ctx.fillStyle = fg;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function createTrainLabelSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(7, 18, 24, 0.88)';
    ctx.roundRect ? ctx.roundRect(4, 4, 376, 72, 8) : ctx.fillRect(4, 4, 376, 72);
    ctx.fill();
    ctx.strokeStyle = '#4ed3db';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffd159';
    ctx.font = 'bold 30px "DM Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 42);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Modular Consist Assembly
  function buildTrainConsist(trainObj) {
    const group = new THREE.Group();
    group.name = `TRAIN_${trainObj.number}`;

    const isVandeBharat = trainObj.type === 'Vande Bharat' || trainObj.number === '20977';
    const isFreight = trainObj.type === 'Freight';
    const carCount = isVandeBharat ? 4 : isFreight ? 5 : 4;
    const carUnits = [];

    for (let c = 0; c < carCount; c++) {
      let carModel;
      if (isVandeBharat) {
        carModel = models.vandeBharat ? models.vandeBharat.clone(true) : createVehicleMesh(0x0a3560, 2.8, 2.8, 20);
      } else if (isFreight) {
        carModel = c === 0 ? (models.engine ? models.engine.clone(true) : createVehicleMesh(0x8a2020, 2.9, 2.9, 18)) : (models.freight ? models.freight.clone(true) : createVehicleMesh(0x354b5e, 2.7, 2.5, 14));
      } else {
        // Standard Passenger Express / Shatabdi / Rajdhani
        carModel = c === 0 ? (models.engine ? models.engine.clone(true) : createVehicleMesh(0x8a2020, 2.9, 2.9, 18)) : (models.coach ? models.coach.clone(true) : createVehicleMesh(0xa32222, 2.8, 2.8, 21));
      }

      carModel.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      const carWrapper = new THREE.Group();
      carWrapper.add(carModel);
      group.add(carWrapper);

      carUnits.push({
        wrapper: carWrapper,
        length: isFreight ? 15.0 : 21.5,
        offsetFromLead: c * (isFreight ? 15.5 : 22.0)
      });
    }

    // Overhead Floating Identity Plate
    const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createTrainLabelSprite(`${trainObj.number} · ${trainObj.name}`),
      transparent: true,
      depthTest: false
    }));
    labelSprite.scale.set(7.5, 1.5, 1);
    labelSprite.position.set(0, 4.8, 0);
    group.add(labelSprite);

    group.userData = { carUnits, labelSprite };
    return group;
  }

  // Synchronize Train Meshes with Simulation State
  function syncTrainMeshes(trainsList) {
    // 1. Remove stale trains not in fleet
    const activeIds = new Set(trainsList.map(t => t.number));
    for (const [id, mesh] of trainRegistry.entries()) {
      if (!activeIds.has(id)) {
        scene.remove(mesh);
        mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); });
        trainRegistry.delete(id);
      }
    }

    // 2. Add or update meshes
    trainsList.forEach(t => {
      let mesh = trainRegistry.get(t.number);
      if (!mesh) {
        mesh = buildTrainConsist(t);
        scene.add(mesh);
        trainRegistry.set(t.number, mesh);
      }

      mesh.visible = Boolean(t.active) && !t.completed;
      if (!mesh.visible) return;

      // Position Lead Engine and Articulated Trailing Coaches along Track Curve
      const carUnits = mesh.userData.carUnits || [];
      carUnits.forEach((car, index) => {
        const carDist = Math.max(0, t.distance - car.offsetFromLead);
        const pos = getTrackWorldPosition(carDist, t.track, t.route);
        const tangent = getTrackTangent(carDist, t.track, t.route);

        car.wrapper.position.copy(pos);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangent);
        car.wrapper.quaternion.copy(q);

        // Controlled Collision Effect: Tilt and elevate locomotive if crash active
        if (collisionActive && index === 0 && t.number === stateData.selected) {
          car.wrapper.position.y += 1.8;
          car.wrapper.rotation.z += 0.35;
          car.wrapper.rotation.x += 0.25;
        }
      });
    });

    // Development Invariant Check
    if (window.__AURORA_DEV_ASSERT__) {
      const renderedCount = Array.from(trainRegistry.values()).filter(m => m.visible).length;
      const expectedCount = trainsList.filter(t => t.active && !t.completed).length;
      console.assert(renderedCount === expectedCount, `[AURORA ASSERT] Mesh count (${renderedCount}) !== active train count (${expectedCount})`);
    }
  }

  // Particle Effects for Controlled Collision Test
  function createCollisionParticles() {
    const particleCount = 180;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        Math.random() * 12 + 2,
        (Math.random() - 0.5) * 14
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff6622,
      size: 0.9,
      transparent: true,
      opacity: 0.9
    });

    const points = new THREE.Points(geo, mat);
    points.visible = false;
    scene.add(points);

    return { points, velocities, geo };
  }

  collisionParticles = createCollisionParticles();

  function triggerCollisionFX(pos) {
    collisionActive = true;
    if (collisionParticles) {
      collisionParticles.points.position.copy(pos).add(new THREE.Vector3(0, 1.5, 0));
      collisionParticles.points.visible = true;
      const posArr = collisionParticles.geo.attributes.position.array;
      for (let i = 0; i < posArr.length; i++) posArr[i] = 0;
      collisionParticles.geo.attributes.position.needsUpdate = true;
    }
  }

  // Load All GLB Assets via GLTFLoader
  const loader = new GLTFLoader();
  const assetPaths = [
    { key: 'engine', path: '/frontend/public/assets/trains/wap7/locomotive.glb' },
    { key: 'coach', path: '/frontend/public/assets/trains/passenger_coach/coach.glb' },
    { key: 'vandeBharat', path: '/frontend/public/assets/trains/vande_bharat/vande_bharat.glb' },
    { key: 'freight', path: '/frontend/public/assets/trains/freight/wagon.glb' },
    { key: 'bridge', path: '/frontend/public/assets/infrastructure/bridge/bridge.glb' }
  ];

  let loadedCount = 0;
  assetPaths.forEach(item => {
    loader.load(
      item.path,
      gltf => {
        models[item.key] = gltf.scene;
        loadedCount++;
        if (loadedCount === assetPaths.length) {
          loadingElem?.remove();
          onReady?.();
        }
      },
      undefined,
      err => {
        console.warn(`Asset ${item.key} fallback enabled:`, err.message);
        loadedCount++;
        if (loadedCount === assetPaths.length) {
          loadingElem?.remove();
          onReady?.();
        }
      }
    );
  });

  // State & Event Listeners
  document.addEventListener('aurora:state', e => {
    stateData = e.detail || stateData;
    if (stateData.trains) {
      syncTrainMeshes(stateData.trains);
      updateCrossingGates(stateData.trains);
    }
    if (stateData.signals) {
      updateSignalAspects(stateData.signals);
    }
    if (stateData.failure?.type === 'bridge_restriction' && stateData.failure.collisionTest) {
      const t = stateData.trains.find(x => x.number === stateData.selected);
      if (t) triggerCollisionFX(getTrackWorldPosition(t.distance, t.track, t.route));
    } else if (!stateData.failure) {
      collisionActive = false;
      if (collisionParticles) collisionParticles.points.visible = false;
    }
  });

  document.addEventListener('aurora:camera', e => {
    cameraMode = e.detail || 'follow';
  });

  // Animation & Camera Loop
  const camTarget = new THREE.Vector3();
  const screenPos = new THREE.Vector3();

  function animate() {
    requestAnimationFrame(animate);

    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width && height && (renderer.domElement.width !== width || renderer.domElement.height !== height)) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const selectedTrain = stateData.trains?.find(t => t.number === stateData.selected) || stateData.trains?.[0];
    const primaryDist = selectedTrain ? selectedTrain.distance : 0;

    // Stream track geometry ahead
    updateStreamingChunks(primaryDist);

    // Update Collision Particle Explosion
    if (collisionActive && collisionParticles && collisionParticles.points.visible) {
      const posArr = collisionParticles.geo.attributes.position.array;
      for (let i = 0; i < collisionParticles.velocities.length; i++) {
        const v = collisionParticles.velocities[i];
        posArr[i * 3] += v.x * 0.03;
        posArr[i * 3 + 1] += v.y * 0.03;
        posArr[i * 3 + 2] += v.z * 0.03;
        v.y -= 0.25; // Gravity
      }
      collisionParticles.geo.attributes.position.needsUpdate = true;
    }

    // Camera Modes
    if (selectedTrain) {
      const trainPos = getTrackWorldPosition(selectedTrain.distance, selectedTrain.track, selectedTrain.route);
      const tangent = getTrackTangent(selectedTrain.distance, selectedTrain.track, selectedTrain.route);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      if (cameraMode === 'follow') {
        const desiredPos = trainPos.clone().addScaledVector(tangent, -24).add(new THREE.Vector3(0, 11, 0)).addScaledVector(normal, 7);
        camera.position.lerp(desiredPos, 0.06);
        camTarget.lerp(trainPos.clone().add(new THREE.Vector3(0, 2.5, 0)), 0.08);
        camera.lookAt(camTarget);
      } else if (cameraMode === 'cab') {
        const cabPos = trainPos.clone().addScaledVector(tangent, 7.5).add(new THREE.Vector3(0, 2.8, 0));
        camera.position.copy(cabPos);
        const lookAhead = trainPos.clone().addScaledVector(tangent, 120).add(new THREE.Vector3(0, 1.8, 0));
        camera.lookAt(lookAhead);
      } else if (cameraMode === 'flyby') {
        const flyPos = trainPos.clone().addScaledVector(tangent, 35).addScaledVector(normal, 12).setY(1.8);
        camera.position.lerp(flyPos, 0.03);
        camera.lookAt(trainPos.clone().add(new THREE.Vector3(0, 2.0, 0)));
      } else if (cameraMode === 'junction') {
        const juncPos = trainPos.clone().add(new THREE.Vector3(0, 32, 25));
        camera.position.lerp(juncPos, 0.05);
        camera.lookAt(trainPos);
      } else if (cameraMode === 'overhead') {
        camera.position.set(trainPos.x, 85, trainPos.z + 10);
        camera.lookAt(trainPos.x, 0, trainPos.z);
      }

      // Update 2D Floating HUD Label
      if (labelElem) {
        screenPos.copy(trainPos).add(new THREE.Vector3(0, 4.5, 0)).project(camera);
        const isVisible = screenPos.z < 1 && screenPos.x >= -1 && screenPos.x <= 1 && screenPos.y >= -1 && screenPos.y <= 1;
        if (isVisible && selectedTrain.active && !selectedTrain.completed) {
          labelElem.style.display = 'block';
          labelElem.style.transform = `translate(-50%, -100%) translate(${(screenPos.x * 0.5 + 0.5) * width}px, ${(-screenPos.y * 0.5 + 0.5) * height}px)`;
          labelElem.querySelector('span').textContent = `${selectedTrain.number} · ${selectedTrain.name}`;
          labelElem.querySelector('strong').textContent = `${Math.round(selectedTrain.speed)} km/h`;
          labelElem.querySelector('small').textContent = `STATUS: ${selectedTrain.status}`;
          labelElem.className = `train-label ${stateData.phase === 'normal' ? '' : 'critical'}`;
        } else {
          labelElem.style.display = 'none';
        }
      }
    }

    renderer.render(scene, camera);
  }

  animate();
}
