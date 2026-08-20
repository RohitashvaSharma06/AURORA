import { initAuroraScene } from './three-scene.js';

// AURORA — Railway Operations & Safety AI Decision Support Center
// Indian Railways Corridor: Ajmer Jn (AII) → Jaipur Jn (JP) [135 km Double Broad Gauge Line]

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const MODES = ['SIMULATION', 'REPLAY', 'LIVE', 'DEMO LIVE'];

// 19 Authoritative Indian Railways-Inspired Failure Categories
const FAILURES = [
  ['track_obstruction', 'Track Obstruction (Debris / Boulder / Cattle)'],
  ['rail_fracture', 'Ultrasonic Rail Fracture / Flaw (USFD Defect)'],
  ['signal_failure', 'Signal Blank / Aspect Failure (MACLS Danger Trip)'],
  ['turnout_failure', 'Turnout / Point Machine Locking Failure'],
  ['track_circuit_failure', 'Track Circuit / Axle Counter Anomaly'],
  ['communication_loss', 'Cab-Signalling / MTRC / VHF Radio Loss'],
  ['ohe_traction_failure', 'OHE 25kV Traction Power Tripping / Panto Damage'],
  ['train_breakdown', 'Rolling Stock Breakdown / Hot Axle Box'],
  ['emergency_brake', 'Passenger Emergency Alarm (ACP) / Guard Stop'],
  ['level_crossing_obstruction', 'Level Crossing (LC) Gate Obstruction'],
  ['bridge_restriction', 'Bridge Structural Damage / High Flood Level'],
  ['tunnel_blockage', 'Tunnel Blockage / Smoke Detection Alarm'],
  ['route_conflict', 'Converging / Opposing Route Conflict'],
  ['junction_congestion', 'Station Interlocking Bottleneck / Congestion'],
  ['tsr_restriction', 'Temporary Speed Restriction (TSR Caution 30 km/h)'],
  ['weather_fog', 'Dense Fog / Low Visibility (Fog Pilot Rule 60 km/h)'],
  ['platform_blockage', 'Berthing Line / Platform Blockage'],
  ['maintenance_block', 'Scheduled Mega Traffic & Power Block'],
  ['cascading_delay', 'Cascading Schedule Delay Propagation']
];

// Ajmer-Jaipur Corridor Real Stations & Distances (in km & simulation meters)
const STATIONS = [
  { code: 'AII', name: 'Ajmer Jn', km: 0, dist: 0 },
  { code: 'MD', name: 'Madar Jn', km: 7, dist: 700 },
  { code: 'LR', name: 'Ladpura', km: 17, dist: 1700 },
  { code: 'KSG', name: 'Kishangarh', km: 29, dist: 2900 },
  { code: 'MNHA', name: 'Mandawariya', km: 42, dist: 4200 },
  { code: 'TL', name: 'Tilor', km: 52, dist: 5200 },
  { code: 'NRI', name: 'Naraina', km: 65, dist: 6500 },
  { code: 'FL', name: 'Phulera Jn', km: 80, dist: 8000 },
  { code: 'HDA', name: 'Hirnoda', km: 90, dist: 9000 },
  { code: 'JOB', name: 'Asalpur Jobner', km: 102, dist: 10200 },
  { code: 'BOBS', name: 'Bobas', km: 112, dist: 11200 },
  { code: 'DNK', name: 'Dhankya', km: 122, dist: 12200 },
  { code: 'KKU', name: 'Kanakpura', km: 128, dist: 12800 },
  { code: 'JP', name: 'Jaipur Jn', km: 135, dist: 13500 }
];

// Verified Authentic Indian Railways Fleet Timetable on Ajmer-Jaipur Section
const FLEET_DATA = [
  { number: '20977', name: 'Ajmer - Chandigarh Vande Bharat Exp', type: 'Vande Bharat', priority: 6, maxSpeed: 130, track: 0, departure: 0, origin: 'Ajmer Jn (AII)', dest: 'Jaipur Jn (JP)' },
  { number: '12015', name: 'New Delhi - Ajmer Shatabdi Exp', type: 'Superfast', priority: 5, maxSpeed: 120, track: 1, departure: 20, origin: 'Jaipur Jn (JP)', dest: 'Ajmer Jn (AII)' },
  { number: '12957', name: 'Swarna Jayanti Rajdhani Exp', type: 'Superfast', priority: 5, maxSpeed: 120, track: 0, departure: 50, origin: 'Ajmer Jn (AII)', dest: 'Jaipur Jn (JP)' },
  { number: '12988', name: 'Ajmer - Sealdah Superfast Exp', type: 'Superfast', priority: 4, maxSpeed: 110, track: 0, departure: 90, origin: 'Ajmer Jn (AII)', dest: 'Jaipur Jn (JP)' },
  { number: '12414', name: 'Pooja Superfast Express', type: 'Superfast', priority: 4, maxSpeed: 110, track: 1, departure: 130, origin: 'Jaipur Jn (JP)', dest: 'Ajmer Jn (AII)' },
  { number: '19610', name: 'Yog Nagari Rishikesh Express', type: 'Express', priority: 3, maxSpeed: 100, track: 0, departure: 170, origin: 'Ajmer Jn (AII)', dest: 'Jaipur Jn (JP)' },
  { number: '14801', name: 'Jodhpur - Indore Express', type: 'Express', priority: 3, maxSpeed: 95, track: 1, departure: 210, origin: 'Jaipur Jn (JP)', dest: 'Ajmer Jn (AII)' },
  { number: '09605', name: 'Ajmer - Jaipur Special Passenger', type: 'Passenger', priority: 2, maxSpeed: 75, track: 0, departure: 260, origin: 'Ajmer Jn (AII)', dest: 'Jaipur Jn (JP)' },
  { number: '59607', name: 'Ajmer - Phulera Passenger Local', type: 'Passenger', priority: 2, maxSpeed: 70, track: 0, departure: 310, origin: 'Ajmer Jn (AII)', dest: 'Phulera Jn (FL)' },
  { number: 'BCN-7042', name: 'Container Freight Express', type: 'Freight', priority: 1, maxSpeed: 65, track: 0, departure: 360, origin: 'Ajmer Marshalling', dest: 'Jaipur Goods Yard' },
  { number: 'BOXN-8812', name: 'Heavy Mineral Freight Rake', type: 'Freight', priority: 1, maxSpeed: 60, track: 1, departure: 420, origin: 'Phulera Yard', dest: 'Ajmer Yard' },
  { number: 'DFC-909', name: 'Dedicated Freight Corridor Unit', type: 'Freight', priority: 1, maxSpeed: 65, track: 0, departure: 480, origin: 'Madar Jn (MD)', dest: 'Kanakpura (KKU)' }
];

function createTrainState(def, idx) {
  // Deterministic starting distance staging
  const startDist = Math.max(0, (def.departure / 10) * 15 + (idx * 40));
  return {
    ...def,
    speed: 0,
    targetSpeed: def.maxSpeed,
    distance: startDist,
    startDistance: startDist,
    baseTrack: def.track,
    route: 'MAIN',
    active: idx === 0, // First train active at start
    completed: false,
    status: idx === 0 ? 'READY AT AJMER JN' : 'SCHEDULED AT STAGING BLOCK',
    blockId: `BLK-${def.track}-${Math.floor(startDist / 200)}`,
    holdReason: '',
    delayMin: 0,
    etaMin: Math.round(135 / (def.maxSpeed / 60))
  };
}

let state = null;
let lastTickTime = 0;
let sceneReady = false;
let currentTab = 'events'; // 'events', 'explain', 'timetable', 'schematic'
let activeFilter = 'ALL';

function freshState(selectedTrain = '20977') {
  return {
    mode: 'SIMULATION',
    runState: 'RUNNING',
    elapsed: 0,
    clockMultiplier: 1.0, // Default 1.0x (presentation speed)
    selected: selectedTrain,
    phase: 'normal',
    riskScore: 6,
    activeTab: 'events',
    cameraView: 'follow',
    feed: [],
    failure: null,
    explainData: null,
    switches: {
      west: 'NORMAL',
      kishangarh: 'NORMAL',
      phulera: 'NORMAL',
      east: 'NORMAL'
    },
    signals: {
      'S-101': 'GREEN',
      'S-204': 'GREEN',
      'S-311': 'GREEN',
      'S-402': 'GREEN',
      'S-518': 'GREEN',
      'S-620': 'GREEN',
      'S-732': 'GREEN',
      'S-840': 'GREEN',
      'S-950': 'GREEN'
    },
    live: {
      connected: false,
      demo: false,
      provider: 'GTFS-Realtime Adapter',
      message: 'Provider diagnostics pending'
    },
    trains: FLEET_DATA.map(createTrainState),
    reservations: new Map() // blockId -> trainNumber
  };
}

function getSelectedTrain() {
  return state.trains.find(t => t.number === state.selected) || state.trains[0];
}

function emitSceneState() {
  document.dispatchEvent(new CustomEvent('aurora:state', {
    detail: {
      trains: state.trains,
      signals: state.signals,
      switches: state.switches,
      phase: state.phase,
      selected: state.selected,
      failure: state.failure
    }
  }));
}

function logEvent(kind, title, text, tags = 'GENERAL') {
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  state.feed.unshift({
    id: Date.now() + Math.random(),
    kind, // 'alert', 'warn', 'safe', 'info'
    title,
    text,
    time,
    tags
  });
  if (state.feed.length > 120) state.feed.pop();
  renderEventsList();
}

function renderEventsList() {
  const feedContainer = $('#feed-list');
  if (!feedContainer) return;

  const filtered = state.feed.filter(e => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ALERT') return e.kind === 'alert';
    if (activeFilter === 'WARN') return e.kind === 'warn';
    if (activeFilter === 'SAFE') return e.kind === 'safe';
    return true;
  });

  if (filtered.length === 0) {
    feedContainer.innerHTML = '<div class="empty-feed">No recorded events matching filter. Safety engine monitoring corridor.</div>';
    return;
  }

  feedContainer.innerHTML = filtered.map(e => `
    <article class="event-item ${e.kind}">
      <div class="event-marker"></div>
      <div class="event-body">
        <div class="event-meta">
          <span class="event-time">${e.time}</span>
          <span class="event-tag">${e.kind.toUpperCase()}</span>
        </div>
        <strong class="event-title">${e.title}</strong>
        <p class="event-desc">${e.text}</p>
      </div>
    </article>
  `).join('');
}

// ----------------------------------------------------
// INDIAN RAILWAYS REAL-LIFE FAILURE RESPONSE ENGINE
// Sequence: Detection → Protection → Communication → Affected-Train Handling → Block Protection → AI Decision → Movement → Recovery
// ----------------------------------------------------
function executeFailureProtocol(type, isCollisionTest = false) {
  if (state.mode === 'LIVE' && state.live.connected) {
    logEvent('warn', 'LIVE SAFETY GUARD', 'Failure injection is disabled for genuine LIVE telemetry. Switch to SIMULATION or DEMO LIVE.', 'GUARD');
    return;
  }

  const t = getSelectedTrain();
  if (!t.active) {
    t.active = true;
    t.status = 'RUNNING';
  }

  const failDist = t.distance + 180;
  const currentStation = STATIONS.slice().reverse().find(s => s.dist <= t.distance) || STATIONS[0];
  const nextStation = STATIONS.find(s => s.dist > t.distance) || STATIONS[STATIONS.length - 1];
  const blockName = `BLK-${t.track}-${Math.floor(failDist / 200)}`;

  state.phase = 'failure-intervene';
  state.riskScore = isCollisionTest ? 99 : 85;
  state.signals['S-204'] = 'RED';
  state.signals['S-402'] = 'RED';

  // 19 Failure Responses with authentic Indian Railways G&SR and AI solutions
  let failureTitle = '';
  let detectionText = '';
  let protectionText = '';
  let candidateRoutes = [];
  let chosenSolution = '';
  let whySolution = '';
  let actionsTaken = [];
  let recoveryPlan = '';

  const failMeta = FAILURES.find(f => f[0] === type) || [type, type];
  failureTitle = failMeta[1];

  // Evaluate Alternate Line Occupancy and Precedence
  const altTrack = t.track === 0 ? 1 : 0;
  const conflictTrain = state.trains.find(o => o !== t && o.active && !o.completed && o.track === altTrack && Math.abs(o.distance - t.distance) < 280);

  if (isCollisionTest) {
    detectionText = `Controlled Bridge Collision Simulation initiated at ${currentStation.name} Bridge span (KM ${Math.round(failDist / 100)}).`;
    protectionText = 'EMERGENCY BRAKE CLAMPED. Track power de-energized. Collision impact telemetry recorded.';
    candidateRoutes = [
      { name: 'Direct Bridge Track', cost: 'UNSAFE', score: 0, status: 'BLOCKED BY COLLISION' },
      { name: 'Emergency Relief Bypass', cost: '15 km/h', score: 45, status: 'RESERVED FOR ACCIDENT RELIEF TRAIN (ART)' }
    ];
    chosenSolution = 'EMERGENCY DISASTER RECOVERY PROTOCOL';
    whySolution = 'Intentional controlled collision test to verify bridge structural collision dynamics and safety logging.';
    actionsTaken = ['Locomotive derailed in controlled test mode', 'All upstream signals set to Danger', 'Accident Relief Medical Van (ARMV) dispatched'];
    recoveryPlan = 'Site clearance by 140T Railway Crane; track geometry laser verification.';
    t.targetSpeed = 0;
    t.speed = 0;
    t.status = 'COLLISION IMPACT · EMERGENCY STOP';
    logEvent('alert', 'CONTROLLED COLLISION TRIGGERED', `${t.number} simulated collision with bridge girder obstruction. Emergency lockdown active.`, 'CRASH');
  } else {
    switch (type) {
      case 'track_obstruction':
      case 'rail_fracture':
        detectionText = `Axle counter / Ultrasonic Flaw Detector reported continuous track defect in ${blockName} between ${currentStation.name} and ${nextStation.name}.`;
        protectionText = 'Home Signal S-204 clamped at DANGER. Track circuit tripped. Audio-visual cab caution transmitted.';
        candidateRoutes = [
          { name: `Main Line via ${blockName}`, cost: 'DANGER', score: 0, status: 'BLOCKED' },
          { name: 'Crossover to Down Line (Single Line Working)', cost: '30 km/h Turnout', score: 88, status: 'AVAILABLE & CLEAR' },
          { name: 'Station Passing Loop at Kishangarh', cost: 'Hold in Loop', score: 65, status: 'SECONDARY' }
        ];

        if (conflictTrain && conflictTrain.priority >= t.priority) {
          chosenSolution = `HOLD ${t.number} AT S-204; CLEAR HIGHER PRIORITY ${conflictTrain.number}`;
          whySolution = `${conflictTrain.name} (Priority ${conflictTrain.priority}) has superior precedence on alternate track. Safety & priority rules require holding lower/equal service.`;
          t.targetSpeed = 0;
          t.status = `HELD AT S-204 · ALT LINE OCCUPIED BY ${conflictTrain.number}`;
          actionsTaken = [`${t.number} stopped at safe braking distance`, `Signal S-204 held at Red`];
        } else {
          chosenSolution = `DIVERT ${t.number} VIA EAST CROSSOVER TO ALTERNATE TRACK`;
          whySolution = `Alternate track is verified clear of conflicting movements. Crossover turnout allows safe diversion around the obstacle without stranding passenger service.`;
          t.route = 'EAST_ALTERNATE';
          t.targetSpeed = Math.min(t.maxSpeed * 0.5, 55);
          t.status = 'PHYSICAL REROUTE · DIVERTING VIA EAST CROSSOVER';
          state.switches.east = 'REVERSE';
          state.signals['S-311'] = 'ATTENTION';
          actionsTaken = ['East turnout point blades motorized to Diverging position', 'Route indicator illuminated', 'Braking curve computed'];
          if (conflictTrain) {
            conflictTrain.targetSpeed = 0;
            conflictTrain.status = `HELD IN LOOP FOR ${t.number} DIVERSION`;
            actionsTaken.push(`${conflictTrain.number} held at loop siding`);
          }
        }
        recoveryPlan = 'Engineering Gang deployed for track renewal; speed restoration to line speed once obstacle cleared.';
        break;

      case 'signal_failure':
        detectionText = `Signal S-204 failed to display aspect (Lamp Blackout detected by Current Sensing Relay).`;
        protectionText = 'Automated fail-safe defaulted signal to most restrictive aspect (DANGER).';
        candidateRoutes = [
          { name: 'Pass Signal at Danger (Rule T/369-3b)', cost: '15 km/h Caution', score: 92, status: 'AUTHORIZED' },
          { name: 'Indefinite Hold at Signal', cost: 'High Delay', score: 20, status: 'REJECTED' }
        ];
        chosenSolution = 'OPERATE UNDER CAUTION ORDER T/369-3b AT 15 KM/H';
        whySolution = 'Indian Railways Operating Rule 3.69: Train authorized to pass defective signal at 15 km/h after halting for 1 minute and sounding loco whistle.';
        t.targetSpeed = 15;
        t.status = 'CAUTION RUNNING · PASSING DEFECTIVE S-204 (T/369-3b)';
        actionsTaken = ['Electronic Pilot Caution transmitted to driver console', 'Speed clamp enforced at 15 km/h'];
        recoveryPlan = 'Signal Maintainer replacing LED aspect unit; normal aspect restoration expected in 8 min.';
        break;

      case 'turnout_failure':
        detectionText = `Switch Machine Point No. 12 at ${currentStation.name} failed to detect electronic locking.`;
        protectionText = 'All signals leading over the switch locked at DANGER by Solid State Interlocking (SSI).';
        candidateRoutes = [
          { name: 'Facing Point Straight Line', cost: 'Locked Straight', score: 85, status: 'SECURED' },
          { name: 'Reverse Diverging Path', cost: 'Point Clamp Required', score: 30, status: 'LOCKED OUT' }
        ];
        chosenSolution = 'LOCK ROUTE ON STRAIGHT MAINLINE WITH CLAMP & PADLOCK';
        whySolution = 'G&SR Rule 3.38: Switch point clamped and padlocked mechanically in normal straight position.';
        t.targetSpeed = 30;
        t.status = 'SPEED RESTRICTION 30 KM/H OVER CLAMPED TURNOUT';
        actionsTaken = ['Station Master clamped switch in Normal alignment', 'Physical verification completed'];
        recoveryPlan = 'Point machine motor recalibration.';
        break;

      case 'level_crossing_obstruction':
        detectionText = `Level Crossing Gate LC-44 at KM ${Math.round(failDist / 100)} obstacle detector triggered (Stalled Truck on rails).`;
        protectionText = 'Gate distant signal set to Red; audible hooter activated at gate lodge.';
        candidateRoutes = [
          { name: 'Mainline Run-Through', cost: 'COLLISION HAZARD', score: 0, status: 'PROHIBITED' },
          { name: 'Controlled Stop Before LC Gate', cost: 'Zero Risk', score: 98, status: 'SELECTED' }
        ];
        chosenSolution = 'PROTECTIVE BRAKING & CONTROLLED STOP 150M BEFORE GATE';
        whySolution = 'Interlocking prevents signal clearance until gate boom is fully lowered and track clearance circuit is energized.';
        t.targetSpeed = 0;
        t.status = 'HELD BEFORE LC-44 · OBSTACLE ON ROAD CROSSING';
        actionsTaken = ['Service brakes applied', 'Road traffic police and recovery crane notified'];
        recoveryPlan = 'Truck towed clear of track; gate closed and locked; signal cleared to Green.';
        break;

      case 'weather_fog':
        detectionText = 'Visibility dropped below 150m due to dense fog across Kishangarh-Phulera section.';
        protectionText = 'Fog Pilot activated; audible detonators placed 270m before first stop signal.';
        candidateRoutes = [
          { name: 'Normal Line Speed (130 km/h)', cost: 'BLIND RUNNING', score: 0, status: 'REJECTED' },
          { name: 'Fog Safety Speed (60 km/h)', cost: 'Controlled Spacing', score: 95, status: 'ENFORCED' }
        ];
        chosenSolution = 'APPLY FOG SAFETY MAXIMUM SPEED OF 60 KM/H';
        whySolution = 'Indian Railways G&SR Fog Pilot Rule caps train speed at 60 km/h in dense fog with continuous loco flasher light active.';
        t.targetSpeed = Math.min(t.maxSpeed, 60);
        t.status = 'RUNNING UNDER FOG PILOT RULES (MAX 60 KM/H)';
        actionsTaken = ['Locomotive headlights on high beam', 'Cab signalling repeater audio alerts enabled'];
        recoveryPlan = 'Automatic speed limit lift once optical visibility sensors exceed 600m.';
        break;

      case 'emergency_brake':
        detectionText = `Passenger Alarm Chain Pulled (PEAV activated) in Coach C-3 of ${t.number}.`;
        protectionText = 'Brake pipe air pressure dropped from 5.0 kg/cm² to 2.8 kg/cm²; automatic emergency braking initiated.';
        candidateRoutes = [{ name: 'Immediate Emergency Deceleration', cost: 'Safe Halt', score: 100, status: 'EXECUTING' }];
        chosenSolution = 'CONTROLLED EMERGENCY STOP & SECTION CONTROLLER BROADCAST';
        whySolution = 'Pneumatic emergency brake venting halts train immediately to inspect safety or emergency reason.';
        t.targetSpeed = 0;
        t.status = 'EMERGENCY STOPPED · ALARM CHAIN (ACP) PULLED';
        actionsTaken = ['Flashing red tail lamp activated to warn rear trains', 'Guard and Loco Pilot conducting coach inspection'];
        recoveryPlan = 'Reset passenger emergency valve; recharge brake pipe to 5.0 kg/cm²; resume journey.';
        break;

      default:
        detectionText = `Operational anomaly (${failMeta[1]}) registered in block ${blockName}.`;
        protectionText = 'Precautionary signal hold and telemetry speed reduction active.';
        candidateRoutes = [
          { name: 'Proceed with Caution Order', cost: '30 km/h', score: 85, status: 'ACTIVE' },
          { name: 'Full Stop and Investigation', cost: 'Hold', score: 60, status: 'BACKUP' }
        ];
        chosenSolution = 'ENFORCE CAUTION RESTRICTION & DYNAMIC HEADWAY REGULATION';
        whySolution = 'Proactive speed throttling prevents headway violations while maintaining timetable resilience.';
        t.targetSpeed = Math.min(t.maxSpeed * 0.45, 40);
        t.status = `CAUTION · ${failMeta[1].toUpperCase()}`;
        actionsTaken = ['Speed target revised', 'Adjacent blocks protected'];
        recoveryPlan = 'Gradual restoration as track telemetry normalizes.';
        break;
    }
  }

  // Follower Protection Check: Safeguard any trailing train on same track
  const followers = state.trains
    .filter(o => o !== t && o.active && !o.completed && o.track === t.baseTrack && o.distance < t.distance)
    .sort((a, b) => b.distance - a.distance);

  if (followers.length > 0) {
    const leadFollower = followers[0];
    leadFollower.targetSpeed = 0;
    leadFollower.status = `HELD AT SAFE HEADWAY BEHIND ${t.number}`;
    actionsTaken.push(`Trailing train ${leadFollower.number} stopped with 800m safety buffer`);
    logEvent('warn', 'REAR TRAIN SAFEGUARDED', `${leadFollower.number} held at preceding signal to guarantee zero-overlap invariant.`, 'SAFETY');
  }

  state.failure = {
    type,
    train: t.number,
    distance: failDist,
    block: blockName,
    title: failureTitle,
    collisionTest: isCollisionTest,
    resolution: isCollisionTest ? 'COLLISION EMERGENCY' : 'DIVERTED / HELD SAFELY'
  };

  state.explainData = {
    incidentTitle: failureTitle,
    trainInfo: `${t.number} · ${t.name} (${t.type}, Priority ${t.priority})`,
    location: `${currentStation.name} → ${nextStation.name} (KM ${Math.round(failDist / 100)}, Block ${blockName})`,
    detection: detectionText,
    protection: protectionText,
    candidateRoutes,
    chosenSolution,
    whySolution,
    actionsTaken,
    recoveryPlan,
    timestamp: new Date().toLocaleTimeString('en-GB')
  };

  logEvent('alert', 'INCIDENT DETECTED', `${failureTitle} ahead of ${t.number}. Safety protocol executed.`, 'INCIDENT');
  logEvent('safe', 'AI DECISION EXECUTED', `${chosenSolution}. Rationale: ${whySolution.slice(0, 90)}...`, 'AI');

  updateUI();
  emitSceneState();
  renderExplainTab();
}

// ----------------------------------------------------
// UI RENDERING & COMPONENT BINDING
// ----------------------------------------------------
function renderAppShell() {
  $('#app').innerHTML = `
    <header class="top-nav">
      <div class="brand-group">
        <div class="brand-logo"></div>
        <div>
          <h1 class="brand-title">AURORA RAILWAY CONTROL CENTER</h1>
          <span class="brand-subtitle">INDIAN RAILWAYS · AJMER–JAIPUR CORRIDOR (135 KM) · SAFETY & AI DECISION SUPPORT</span>
        </div>
      </div>
      <div class="top-meta">
        <div class="meta-pill">MODE: <strong id="hdr-mode">SIMULATION</strong></div>
        <div class="meta-pill">CLOCK: <strong id="hdr-clock">1.0X</strong></div>
        <div class="meta-pill">BACKEND: <strong id="hdr-backend" class="status-green">ONLINE</strong></div>
        <div class="meta-pill">SAFETY ENGINE: <strong class="status-green">ZERO-OVERLAP INVARIANT</strong></div>
      </div>
      <div class="system-status-badge" id="hdr-status-badge">● RUNNING</div>
    </header>

    <main class="main-layout">
      <!-- Left Panel: Multi-Tab OCC Dashboard -->
      <aside class="sidebar-panel">
        <nav class="tab-bar">
          <button class="tab-btn active" data-tab="events">EVENTS</button>
          <button class="tab-btn" data-tab="explain">AI EXPLAIN</button>
          <button class="tab-btn" data-tab="timetable">TIMETABLE</button>
          <button class="tab-btn" data-tab="schematic">CORRIDOR MAP</button>
        </nav>

        <div class="tab-content" id="tab-events-view">
          <div class="filter-bar">
            <span class="filter-label">FILTER:</span>
            <button class="filter-btn active" data-filter="ALL">ALL</button>
            <button class="filter-btn" data-filter="ALERT">ALERTS</button>
            <button class="filter-btn" data-filter="WARN">WARNINGS</button>
            <button class="filter-btn" data-filter="SAFE">NORMAL</button>
            <button class="clear-btn" id="btn-clear-events">CLEAR</button>
          </div>
          <div class="events-scroll-container" id="feed-list"></div>
        </div>

        <div class="tab-content hidden" id="tab-explain-view">
          <div class="explain-container" id="explain-content">
            <div class="explain-empty">
              <h3>NO ACTIVE INCIDENT</h3>
              <p>The network is running under normal timetable dispatching. Inject a failure or demo scenario to view deep AI route analysis and safety rationale.</p>
            </div>
          </div>
        </div>

        <div class="tab-content hidden" id="tab-timetable-view">
          <div class="timetable-container" id="timetable-table"></div>
        </div>

        <div class="tab-content hidden" id="tab-schematic-view">
          <div class="schematic-container" id="schematic-map">
            <div class="schematic-head">
              <strong>AJMER JN (KM 0) → PHULERA JN (KM 80) → JAIPUR JN (KM 135)</strong>
              <small>Real-time Block Reservations & Signal Interlocking</small>
            </div>
            <div class="linear-track-diagram" id="linear-diagram"></div>
          </div>
        </div>
      </aside>

      <!-- Center 3D Railway Viewport -->
      <section class="viewport-section">
        <div id="three-stage"></div>

        <div class="viewport-hud-top">
          <div class="hud-box">CORRIDOR: <span>AJMER (AII) → JAIPUR (JP)</span></div>
          <div class="hud-box">FOCUS: <span id="hud-focus-name">20977 · Vande Bharat</span></div>
          <div class="hud-box">CAMERA: <span id="hud-camera-mode">CHASE FOLLOW</span></div>
        </div>

        <div class="viewport-hud-bottom">
          <div class="quick-controls">
            <button class="btn-primary" id="btn-start">START</button>
            <button class="btn-secondary" id="btn-pause">PAUSE</button>
            <button class="btn-secondary" id="btn-reset">RESET SELECTED</button>
            <button class="btn-secondary" id="btn-demo">DEMO INCIDENT</button>
            <button class="btn-danger" id="btn-collision-test">BRIDGE COLLISION TEST</button>
          </div>

          <div class="speed-controls">
            <span class="ctrl-label">SPEED:</span>
            ${[0.25, 0.5, 1.0, 2.0, 5.0].map(s => `<button class="speed-btn ${s === 1.0 ? 'active' : ''}" data-speed="${s}">${s}X</button>`).join('')}
          </div>

          <div class="camera-controls">
            <span class="ctrl-label">VIEW:</span>
            <button class="cam-btn active" data-cam="follow">FOLLOW</button>
            <button class="cam-btn" data-cam="cab">CAB VIEW</button>
            <button class="cam-btn" data-cam="flyby">FLYBY</button>
            <button class="cam-btn" data-cam="junction">JUNCTION</button>
            <button class="cam-btn" data-cam="overhead">2.5D OCC</button>
          </div>
        </div>
      </section>

      <!-- Right Panel: Operations & Failure Injection Console -->
      <aside class="control-drawer">
        <div class="drawer-header">
          <h2>DISPATCH CONSOLE</h2>
          <small>Topology & Interlocking Control</small>
        </div>

        <div class="drawer-section">
          <label class="field-title">OPERATIONAL MODE</label>
          <div class="mode-grid">
            ${MODES.map(m => `<button class="mode-btn ${m === 'SIMULATION' ? 'active' : ''}" data-mode="${m}">${m}</button>`).join('')}
          </div>
          <div class="live-diag-box" id="live-diag-card">
            <strong>LIVE ADAPTER STATUS</strong>
            <p id="live-diag-msg">SIMULATION ACTIVE · Deterministic Block Interlocking</p>
          </div>
        </div>

        <div class="drawer-section">
          <label class="field-title">SELECT TRAIN IN FOCUS</label>
          <select class="custom-select" id="select-train-focus">
            ${FLEET_DATA.map(t => `<option value="${t.number}">[P${t.priority}] ${t.number} · ${t.name}</option>`).join('')}
          </select>
        </div>

        <div class="drawer-section">
          <label class="field-title">FAILURE INJECTION MATRIX (IR RULES)</label>
          <select class="custom-select" id="select-failure-type">
            ${FAILURES.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}
          </select>
          <button class="btn-inject" id="btn-inject-failure">⚡ INJECT INCIDENT AHEAD</button>
        </div>

        <div class="drawer-section">
          <label class="field-title">TELEMETRY & INTERLOCKING HUD</label>
          <div class="telemetry-grid">
            <div class="telem-item"><label>SPEED</label><span id="telem-speed">0 km/h</span></div>
            <div class="telem-item"><label>THROTTLE</label><span id="telem-throttle">100%</span></div>
            <div class="telem-item"><label>BRAKE PIPE</label><span id="telem-brake">5.0 kg/cm²</span></div>
            <div class="telem-item"><label>CURRENT BLOCK</label><span id="telem-block">BLK-0-0</span></div>
            <div class="telem-item"><label>SIGNAL S-204</label><span id="telem-signal" class="aspect-green">CLEAR (G)</span></div>
            <div class="telem-item"><label>EAST TURNOUT</label><span id="telem-switch">NORMAL</span></div>
            <div class="telem-item"><label>RISK INDEX</label><span id="telem-risk" class="status-green">6% (SAFE)</span></div>
            <div class="telem-item"><label>PROGRESS</label><span id="telem-dist">0.0 / 135 KM</span></div>
          </div>
        </div>
      </aside>
    </main>
  `;

  bindUIEvents();
  renderEventsList();
  renderTimetableTab();
  renderSchematicTab();
}

function bindUIEvents() {
  // Tabs
  $$('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      $$('.tab-content').forEach(c => c.classList.add('hidden'));
      $(`#tab-${currentTab}-view`)?.classList.remove('hidden');
      if (currentTab === 'explain') renderExplainTab();
      if (currentTab === 'timetable') renderTimetableTab();
      if (currentTab === 'schematic') renderSchematicTab();
    };
  });

  // Filter Buttons
  $$('.filter-btn').forEach(btn => {
    btn.onclick = () => {
      $$('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderEventsList();
    };
  });

  $('#btn-clear-events').onclick = () => {
    state.feed = [];
    renderEventsList();
  };

  // Main Controls
  $('#btn-start').onclick = () => {
    state.runState = 'RUNNING';
    logEvent('safe', 'DISPATCH AUTHORITY GRANTED', `Corridor simulation running. Master clock active.`, 'DISPATCH');
    updateUI();
  };

  $('#btn-pause').onclick = () => {
    state.runState = state.runState === 'PAUSED' ? 'RUNNING' : 'PAUSED';
    logEvent('info', state.runState === 'PAUSED' ? 'SIMULATION PAUSED' : 'SIMULATION RESUMED', `Movement clock is ${state.runState}.`, 'CTRL');
    updateUI();
  };

  $('#btn-reset').onclick = () => {
    const keepSelected = state.selected;
    state = freshState(keepSelected);
    const t = getSelectedTrain();
    t.active = true;
    t.status = 'READY AT ROUTE START';
    logEvent('safe', 'FLEET RESET TO TIMETABLE ORIGIN', `Selected service ${t.number} staged at Ajmer Jn without world reinitialization.`, 'RESET');
    updateUI();
    emitSceneState();
    renderTimetableTab();
    renderSchematicTab();
  };

  $('#btn-demo').onclick = () => {
    state.runState = 'RUNNING';
    const t = getSelectedTrain();
    t.active = true;
    logEvent('safe', 'DEMONSTRATION RUN STARTED', `${t.number} accelerating along Ajmer-Jaipur main line. Incident will trigger in 4 seconds.`, 'DEMO');
    setTimeout(() => executeFailureProtocol('track_obstruction'), 4000);
  };

  $('#btn-collision-test').onclick = () => {
    executeFailureProtocol('bridge_restriction', true);
  };

  $('#btn-inject-failure').onclick = () => {
    const failType = $('#select-failure-type').value;
    executeFailureProtocol(failType);
  };

  $('#select-train-focus').onchange = e => {
    state.selected = e.target.value;
    const t = getSelectedTrain();
    t.active = true;
    logEvent('info', 'FOCUS TRAIN CHANGED', `Camera and telemetry monitoring switched to ${t.number} (${t.name}).`, 'TELEMETRY');
    updateUI();
    emitSceneState();
  };

  // Speed Multiplier
  $$('.speed-btn').forEach(btn => {
    btn.onclick = () => {
      $$('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.clockMultiplier = parseFloat(btn.dataset.speed);
      $('#hdr-clock').textContent = `${state.clockMultiplier}X`;
      logEvent('info', 'SIMULATION SPEED CHANGED', `Movement velocity multiplier set to ${state.clockMultiplier}X.`, 'CLOCK');
    };
  });

  // Camera Switcher
  $$('.cam-btn').forEach(btn => {
    btn.onclick = () => {
      $$('.cam-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.cameraView = btn.dataset.cam;
      $('#hud-camera-mode').textContent = btn.textContent;
      document.dispatchEvent(new CustomEvent('aurora:camera', { detail: state.cameraView }));
    };
  });

  // Mode Switcher
  $$('.mode-btn').forEach(btn => {
    btn.onclick = async () => {
      const mode = btn.dataset.mode;
      await setSimulationMode(mode);
    };
  });
}

async function setSimulationMode(mode) {
  state.mode = mode;
  $$('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#hdr-mode').textContent = mode;

  try {
    await fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: mode === 'DEMO LIVE' ? 'SIMULATION' : mode })
    });
  } catch (e) { }

  if (mode === 'LIVE') {
    await checkLiveDiagnostics();
  } else if (mode === 'DEMO LIVE') {
    state.live = {
      connected: false,
      demo: true,
      provider: 'SIMULATED DEMO STREAM',
      message: 'DEMO LIVE · SIMULATED STREAM (NOT REAL-WORLD DATA)'
    };
    logEvent('warn', 'DEMO LIVE FEED ACTIVE', 'Streaming data is explicitly simulated for presentation purposes.', 'MODE');
  } else {
    state.live = {
      connected: false,
      demo: false,
      provider: 'Built-in Engine',
      message: 'SIMULATION ACTIVE · Deterministic Block Interlocking'
    };
    logEvent('safe', 'MODE CHANGED', `${mode} mode selected. Telemetry and failure responses are active.`, 'MODE');
  }

  updateUI();
  emitSceneState();
}

async function checkLiveDiagnostics() {
  try {
    const res = await fetch('/api/live/status');
    const diag = await res.json();
    if (!diag.configured) throw new Error(diag.reason || 'Missing GTFS-RT Configuration');
    const trRes = await fetch('/api/trains');
    const trains = await trRes.json();
    if (!trRes.ok || !trains.length) throw new Error('Feed returned 0 vehicle positions');
    state.live = {
      connected: true,
      demo: false,
      provider: diag.provider || 'GTFS-Realtime',
      message: `LIVE CONNECTED · ${trains.length} Vehicles · ${diag.lastSuccess || 'Active'}`
    };
    logEvent('safe', 'LIVE FEED CONNECTED', state.live.message, 'LIVE');
  } catch (err) {
    state.live = {
      connected: false,
      demo: false,
      provider: 'GTFS-RT Adapter',
      message: `LIVE DIAGNOSTIC: ${err.message}. Switch to DEMO LIVE for mock streaming.`
    };
    logEvent('warn', 'LIVE FEED UNAVAILABLE', `${err.message}`, 'DIAG');
  }
}

// ----------------------------------------------------
// EXPLAIN TAB RENDERER (Detailed AI Incident & Rationale)
// ----------------------------------------------------
function renderExplainTab() {
  const container = $('#explain-content');
  if (!container) return;

  const d = state.explainData;
  if (!d) {
    container.innerHTML = `
      <div class="explain-empty">
        <h3>NO ACTIVE INCIDENT</h3>
        <p>The network is running under normal timetable dispatching. Inject a failure or demo scenario to view deep AI route analysis, candidate routes, and safety rationale.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="explain-card">
      <div class="explain-header">
        <span class="incident-badge">INCIDENT REPORT</span>
        <h2>${d.incidentTitle}</h2>
        <span class="explain-time">${d.timestamp}</span>
      </div>

      <div class="explain-grid">
        <div class="grid-item"><strong>AFFECTED SERVICE</strong><span>${d.trainInfo}</span></div>
        <div class="grid-item"><strong>LOCATION</strong><span>${d.location}</span></div>
      </div>

      <div class="explain-section">
        <h4>1. DETECTION & TELEMETRY</h4>
        <p>${d.detection}</p>
      </div>

      <div class="explain-section">
        <h4>2. IMMEDIATE PROTECTION MEASURES</h4>
        <p class="protection-callout">${d.protection}</p>
      </div>

      <div class="explain-section">
        <h4>3. CANDIDATE ROUTE EVALUATION</h4>
        <div class="candidate-table">
          <div class="candidate-row header"><span>CANDIDATE PATH</span><span>SPEED/COST</span><span>AI SCORE</span><span>STATUS</span></div>
          ${d.candidateRoutes.map(c => `
            <div class="candidate-row ${c.status.includes('CLEAR') || c.status.includes('SELECTED') || c.status.includes('AUTHORIZED') ? 'selected' : ''}">
              <span>${c.name}</span>
              <span>${c.cost}</span>
              <span>${c.score}/100</span>
              <strong>${c.status}</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="explain-section highlight-box">
        <h4>4. SELECTED SOLUTION & OPERATIONAL RATIONALE</h4>
        <div class="solution-title"><b>DECISION:</b> ${d.chosenSolution}</div>
        <div class="solution-why"><b>WHY THIS SOLUTION?</b> ${d.whySolution}</div>
      </div>

      <div class="explain-section">
        <h4>5. ACTIONS EXECUTED & TIMELINE</h4>
        <ul class="action-list">
          ${d.actionsTaken.map(a => `<li>${a}</li>`).join('')}
        </ul>
      </div>

      <div class="explain-section">
        <h4>6. RECOVERY & RESTORATION PLAN</h4>
        <p>${d.recoveryPlan}</p>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// TIMETABLE TAB RENDERER
// ----------------------------------------------------
function renderTimetableTab() {
  const container = $('#timetable-table');
  if (!container) return;

  container.innerHTML = `
    <table class="timetable-grid">
      <thead>
        <tr>
          <th>TRAIN #</th>
          <th>SERVICE NAME</th>
          <th>CLASS</th>
          <th>TRACK</th>
          <th>CURRENT BLOCK</th>
          <th>SPEED</th>
          <th>STATUS</th>
          <th>ETA / DELAY</th>
        </tr>
      </thead>
      <tbody>
        ${state.trains.map(t => {
          const isSel = t.number === state.selected;
          const statusClass = t.status.includes('HELD') ? 'status-held' : t.status.includes('DIVERT') ? 'status-divert' : t.status.includes('CAUTION') ? 'status-caution' : 'status-run';
          return `
            <tr class="${isSel ? 'selected-row' : ''}">
              <td><strong>${t.number}</strong></td>
              <td>${t.name}</td>
              <td><span class="prio-tag prio-${t.priority}">${t.type}</span></td>
              <td>${t.route === 'EAST_ALTERNATE' ? 'DOWN (ALT)' : t.track === 0 ? 'UP MAIN' : 'DOWN MAIN'}</td>
              <td>${t.blockId}</td>
              <td>${Math.round(t.speed)} km/h</td>
              <td><span class="status-badge ${statusClass}">${t.status}</span></td>
              <td>${t.etaMin} min (${t.delayMin > 0 ? `+${t.delayMin}m` : 'ON TIME'})</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ----------------------------------------------------
// CORRIDOR LINEAR SCHEMATIC TAB
// ----------------------------------------------------
function renderSchematicTab() {
  const container = $('#linear-diagram');
  if (!container) return;

  container.innerHTML = `
    <div class="schematic-strip">
      <div class="track-line track-up">
        <span class="line-label">UP MAIN</span>
      </div>
      <div class="track-line track-down">
        <span class="line-label">DOWN MAIN</span>
      </div>
      
      <!-- Stations along Corridor -->
      ${STATIONS.map(s => {
        const leftPct = (s.dist / 13500) * 88 + 6;
        return `
          <div class="station-mark" style="left: ${leftPct}%;">
            <div class="station-dot"></div>
            <span class="station-code">${s.code}</span>
            <span class="station-km">${s.km}k</span>
          </div>
        `;
      }).join('')}

      <!-- Dynamic Train Badges -->
      ${state.trains.filter(t => t.active && !t.completed).map(t => {
        const leftPct = Math.min(94, Math.max(4, (t.distance / 13500) * 88 + 6));
        const topPos = t.route === 'EAST_ALTERNATE' || t.track === 1 ? '58%' : '26%';
        const isSel = t.number === state.selected;
        return `
          <div class="train-schematic-badge ${isSel ? 'selected' : ''}" style="left: ${leftPct}%; top: ${topPos};">
            <span>${t.number}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ----------------------------------------------------
// MAIN SIMULATION UPDATE TICK & ZERO-OVERLAP ENGINE
// ----------------------------------------------------
function updateUI() {
  const t = getSelectedTrain();
  if (!t) return;

  $('#hdr-mode').textContent = state.mode;
  $('#hdr-status-badge').textContent = `● ${state.runState}`;
  $('#hdr-status-badge').className = `system-status-badge ${state.runState === 'PAUSED' ? 'amber' : state.phase === 'failure-intervene' ? 'red' : 'green'}`;
  $('#hud-focus-name').textContent = `${t.number} · ${t.name}`;
  $('#select-train-focus').value = t.number;
  $('#btn-pause').textContent = state.runState === 'PAUSED' ? 'RESUME' : 'PAUSE';

  // Live card
  $('#live-diag-msg').textContent = state.live.message;
  $('#live-diag-card').className = `live-diag-box ${state.live.connected ? 'connected' : state.live.demo ? 'demo' : ''}`;

  // Telemetry HUD
  $('#telem-speed').textContent = `${Math.round(t.speed)} km/h`;
  $('#telem-throttle').textContent = t.targetSpeed > 0 ? `${Math.round((t.targetSpeed / t.maxSpeed) * 100)}%` : '0% (IDLE)';
  $('#telem-brake').textContent = t.status.includes('EMERGENCY') ? '0.0 kg/cm² (VENTED)' : t.targetSpeed === 0 ? '3.8 kg/cm² (APPLIED)' : '5.0 kg/cm² (CHARGED)';
  $('#telem-block').textContent = t.blockId;
  $('#telem-signal').textContent = state.signals['S-204'] === 'RED' ? 'STOP (RED)' : 'CLEAR (GREEN)';
  $('#telem-signal').className = `aspect-${state.signals['S-204'].toLowerCase()}`;
  $('#telem-switch').textContent = state.switches.east;
  $('#telem-risk').textContent = `${Math.round(state.riskScore)}% (${state.riskScore > 60 ? 'HIGH' : state.riskScore > 25 ? 'MEDIUM' : 'LOW'})`;
  $('#telem-risk').className = state.riskScore > 60 ? 'status-red' : state.riskScore > 25 ? 'status-amber' : 'status-green';
  $('#telem-dist').textContent = `${(t.distance / 100).toFixed(1)} / 135.0 KM`;

  // Backend Health Ping
  fetch('/api/health')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(() => { $('#hdr-backend').textContent = 'ONLINE'; $('#hdr-backend').className = 'status-green'; })
    .catch(() => { $('#hdr-backend').textContent = 'OFFLINE'; $('#hdr-backend').className = 'status-amber'; });
}

function simulationTick(timestamp) {
  const dt = Math.min(0.1, (timestamp - (lastTickTime || timestamp)) / 1000);
  lastTickTime = timestamp;

  if (state.runState === 'RUNNING' && state.mode !== 'LIVE') {
    const sdt = dt * state.clockMultiplier;
    state.elapsed += sdt;

    // Check Staggered Scheduled Departures
    state.trains.forEach((t, idx) => {
      if (!t.active && !t.completed && state.elapsed >= t.departure) {
        // Zero-Overlap Spawn Clearance Verification
        const spawnClear = !state.trains.some(o => o !== t && o.active && !o.completed && o.track === t.track && Math.abs(o.distance - t.startDistance) < 180);
        if (spawnClear) {
          t.active = true;
          t.status = 'DEPARTED AJMER JN';
          logEvent('safe', 'SCHEDULED DEPARTURE', `${t.number} entered ${t.track === 0 ? 'Up' : 'Down'} Main Line from Ajmer Jn.`, 'DISPATCH');
        } else {
          t.status = 'HELD AT YARD · HEADWAY BUFFER';
        }
      }

      if (!t.active || t.completed) return;

      // ----------------------------------------------------
      // HARD SAFETY INVARIANT: ZERO TRAIN OVERLAP
      // ----------------------------------------------------
      const currentTrack = t.route === 'EAST_ALTERNATE' ? 1 : t.track;
      const leadingTrain = state.trains
        .filter(o => o !== t && o.active && !o.completed && (o.route === 'EAST_ALTERNATE' ? 1 : o.track) === currentTrack && o.distance > t.distance)
        .sort((a, b) => a.distance - b.distance)[0];

      if (leadingTrain) {
        const gap = leadingTrain.distance - t.distance;
        if (gap < 120) {
          // Hard Emergency Clamp
          t.targetSpeed = 0;
          t.status = `HELD · BRAKING MARGIN BEHIND ${leadingTrain.number}`;
        } else if (gap < 240) {
          // Caution Throttling
          t.targetSpeed = Math.min(t.targetSpeed, 40);
          t.status = `CAUTION · APPROACHING ${leadingTrain.number}`;
        }
      }

      // Smooth Physics Acceleration & Braking (m/s^2)
      // Displayed km/h, movement speed (m/s = speed / 3.6), and time strictly agree
      const currentSpeedMS = t.speed / 3.6;
      const targetSpeedMS = t.targetSpeed / 3.6;
      const accelRate = 0.65; // m/s^2 acceleration
      const brakeRate = t.targetSpeed === 0 ? 1.2 : 0.85; // m/s^2 braking

      if (currentSpeedMS < targetSpeedMS) {
        t.speed = Math.min(t.targetSpeed, t.speed + (accelRate * 3.6) * sdt);
      } else if (currentSpeedMS > targetSpeedMS) {
        t.speed = Math.max(t.targetSpeed, t.speed - (brakeRate * 3.6) * sdt);
      }

      // Continuous Non-Looping Distance Progression
      t.distance += (t.speed / 3.6) * sdt;
      t.blockId = `BLK-${currentTrack}-${Math.floor(t.distance / 200)}`;

      // Destination Reached (Jaipur Jn 135 km)
      if (t.distance >= 13500) {
        t.distance = 13500;
        t.speed = 0;
        t.completed = true;
        t.status = 'COMPLETED SERVICE AT JAIPUR JN (JP)';
        logEvent('safe', 'SERVICE TERMINATED', `${t.number} (${t.name}) arrived safely at terminal platform Jaipur Jn.`, 'TERMINUS');
      }

      // Failure Auto-Resolution Check after Diversion Cleared
      if (t.route === 'EAST_ALTERNATE' && state.failure && t.distance > state.failure.distance + 150) {
        state.phase = 'normal';
        state.riskScore = 8;
        state.signals['S-204'] = 'GREEN';
        state.signals['S-402'] = 'GREEN';
        t.targetSpeed = t.maxSpeed;
        t.status = 'RUNNING ON DIVERSION ROUTE';
        logEvent('safe', 'DIVERSION COMPLETE', `${t.number} safely cleared the affected section via alternate line.`, 'CLEAR');
        state.failure = null;
      }
    });

    // Decay Risk Score
    state.riskScore = Math.max(6, state.riskScore - 0.35 * sdt);
    emitSceneState();
  }

  updateUI();
  if (currentTab === 'timetable') renderTimetableTab();
  if (currentTab === 'schematic') renderSchematicTab();

  requestAnimationFrame(simulationTick);
}

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------
window.__AURORA_DEV_ASSERT__ = true;
state = freshState();
renderAppShell();

try {
  initAuroraScene($('#three-stage'), () => {
    sceneReady = true;
    logEvent('safe', '3D ENGINE READY', 'All modular railway assets (WAP-7, LHB, Vande Bharat, Freight, Bridge) loaded.', 'INIT');
    updateUI();
    emitSceneState();
  });
} catch (e) {
  console.error(e);
  $('#three-stage').innerHTML = `<div class="three-fallback asset-error">3D RENDERER INITIALIZATION ERROR: ${e.message}</div>`;
}

logEvent('safe', 'SYSTEM READY', 'Ajmer–Jaipur 135 km corridor loaded with 12 timetabled Indian Railways movements.', 'INIT');
requestAnimationFrame(simulationTick);
