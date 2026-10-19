// ===== REPTON GAME ENGINE =====

// Game state variables
let grid = [];
let MAP_W = 32;
let MAP_H = 32;
let currentLevelIndex = 0;

let player = {
  x: 0,
  y: 0,
  visualX: 0,
  visualY: 0,
  startX: 0,
  startY: 0,
  targetX: 0,
  targetY: 0,
  isMoving: false,
  moveProgress: 0,
  facing: 'down',
  walkCycle: 0
};

let pushedRock = null; // { fromX, fromY, toX, toY, progress }
const fallingRocks = new Set(); // tracks rocks currently mid-fall: "x,y"
let physicsTimer = 0;

let score = 0;
let totalDiamonds = 0;
let gameState = 'playing'; // 'playing', 'won', 'dead'
let moveCount = 0;

// Speed constants (in seconds)
const MOVE_DURATION = 0.135;    // ~135ms per tile step (~7.4 tiles/sec, fluid & responsive)
const PHYSICS_INTERVAL = 0.055; // ~55ms per tile: rocks fall fast and heavy (~18 tiles/sec)

// ===== CANVAS & CAMERA SETUP =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let TILE_SIZE = 32;
let viewportTilesX = 16, viewportTilesY = 12;
let cameraX = 0, cameraY = 0;

function setupCanvas() {
  const maxW = window.innerWidth - 24;
  const maxH = window.innerHeight - 130;

  const desiredViewTiles = Math.min(17, Math.max(MAP_W, MAP_H));
  TILE_SIZE = Math.floor(Math.min(maxW, maxH) / desiredViewTiles);
  if (TILE_SIZE < 18) TILE_SIZE = 18;
  if (TILE_SIZE > 52) TILE_SIZE = 52;

  viewportTilesX = Math.min(MAP_W, Math.floor(maxW / TILE_SIZE));
  viewportTilesY = Math.min(MAP_H, Math.floor(maxH / TILE_SIZE));
  if (viewportTilesX > MAP_W) viewportTilesX = MAP_W;
  if (viewportTilesY > MAP_H) viewportTilesY = MAP_H;

  canvas.width = viewportTilesX * TILE_SIZE;
  canvas.height = viewportTilesY * TILE_SIZE;
}

function updateCamera() {
  const idealX = player.visualX - (viewportTilesX - 1) / 2;
  const idealY = player.visualY - (viewportTilesY - 1) / 2;
  cameraX = Math.max(0, Math.min(MAP_W - viewportTilesX, idealX));
  cameraY = Math.max(0, Math.min(MAP_H - viewportTilesY, idealY));
}

// ===== GRAPHICS & DRAWING =====
function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return Math.abs(h ^ (h >> 16));
}

// 1. Classic Red Brick Wall ('W')
function drawWall(px, py, s) {
  ctx.fillStyle = '#8B1A1A';
  ctx.fillRect(px, py, s, s);

  const bh = Math.floor(s / 4);
  ctx.fillStyle = '#5C0E0E';

  for (let i = 1; i < 4; i++) {
    ctx.fillRect(px, py + i * bh - 1, s, 2);
  }

  const bw = Math.floor(s / 2);
  for (let row = 0; row < 4; row++) {
    const offset = (row % 2) ? 0 : Math.floor(bw / 2);
    for (let vx = offset; vx < s; vx += bw) {
      if (vx > 0 && vx < s) {
        ctx.fillRect(px + vx - 1, py + row * bh, 2, bh);
      }
    }
  }
}

// 2. Rounded Wall corners ('1' TL, '2' TR, '3' BL, '4' BR)
function drawRoundedWall(px, py, s, type) {
  const r = Math.floor(s * 0.55);

  ctx.save();
  ctx.beginPath();
  if (type === WALL_TL) {
    ctx.moveTo(px + r, py);
    ctx.lineTo(px + s, py);
    ctx.lineTo(px + s, py + s);
    ctx.lineTo(px, py + s);
    ctx.lineTo(px, py + r);
    ctx.arc(px + r, py + r, r, Math.PI, Math.PI * 1.5);
  } else if (type === WALL_TR) {
    ctx.moveTo(px, py);
    ctx.lineTo(px + s - r, py);
    ctx.arc(px + s - r, py + r, r, Math.PI * 1.5, Math.PI * 2);
    ctx.lineTo(px + s, py + s);
    ctx.lineTo(px, py + s);
    ctx.lineTo(px, py);
  } else if (type === WALL_BL) {
    ctx.moveTo(px, py);
    ctx.lineTo(px + s, py);
    ctx.lineTo(px + s, py + s);
    ctx.lineTo(px + r, py + s);
    ctx.arc(px + r, py + s - r, r, Math.PI * 0.5, Math.PI);
    ctx.lineTo(px, py);
  } else if (type === WALL_BR) {
    ctx.moveTo(px, py);
    ctx.lineTo(px + s, py);
    ctx.lineTo(px + s, py + s - r);
    ctx.arc(px + s - r, py + s - r, r, 0, Math.PI * 0.5);
    ctx.lineTo(px, py + s);
    ctx.lineTo(px, py);
  } else {
    ctx.rect(px, py, s, s);
  }
  ctx.closePath();
  ctx.clip();

  drawWall(px, py, s);
  ctx.restore();

  // Highlight curve edge
  ctx.strokeStyle = '#B22222';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (type === WALL_TL) {
    ctx.arc(px + r, py + r, r, Math.PI, Math.PI * 1.5);
  } else if (type === WALL_TR) {
    ctx.arc(px + s - r, py + r, r, Math.PI * 1.5, Math.PI * 2);
  } else if (type === WALL_BL) {
    ctx.arc(px + r, py + s - r, r, Math.PI * 0.5, Math.PI);
  } else if (type === WALL_BR) {
    ctx.arc(px + s - r, py + s - r, r, 0, Math.PI * 0.5);
  }
  ctx.stroke();
}

// 3. New Wall Type: Steel / Futuristic Metal Wall ('M')
function drawSteelWall(px, py, s) {
  // Base plate
  ctx.fillStyle = '#374151';
  ctx.fillRect(px, py, s, s);

  // Outer border & bevel
  ctx.fillStyle = '#6B7280';
  ctx.fillRect(px, py, s, 2); // Top bright highlight
  ctx.fillRect(px, py, 2, s); // Left bright highlight
  ctx.fillStyle = '#111827';
  ctx.fillRect(px, py + s - 2, s, 2); // Bottom shadow
  ctx.fillRect(px + s - 2, py, 2, s); // Right shadow

  // Inner recessed plate
  const inset = Math.max(3, Math.floor(s * 0.14));
  ctx.fillStyle = '#1F2937';
  ctx.fillRect(px + inset, py + inset, s - inset * 2, s - inset * 2);
  ctx.fillStyle = '#4B5563';
  ctx.fillRect(px + inset + 1, py + inset + 1, s - (inset + 1) * 2, s - (inset + 1) * 2);

  // Cross reinforcement groove
  const midX = px + s / 2;
  const midY = py + s / 2;
  ctx.fillStyle = '#111827';
  ctx.fillRect(midX - 1, py + inset + 2, 2, s - (inset + 2) * 2);
  ctx.fillRect(px + inset + 2, midY - 1, s - (inset + 2) * 2, 2);

  // 4 corner bolts / rivets
  const boltOffset = Math.max(2, Math.floor(s * 0.08));
  const boltSize = Math.max(2, Math.floor(s * 0.08));
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(px + boltOffset, py + boltOffset, boltSize, boltSize);
  ctx.fillRect(px + s - boltOffset - boltSize, py + boltOffset, boltSize, boltSize);
  ctx.fillRect(px + boltOffset, py + s - boltOffset - boltSize, boltSize, boltSize);
  ctx.fillRect(px + s - boltOffset - boltSize, py + s - boltOffset - boltSize, boltSize, boltSize);
}

// 4. New Wall Type: Dark Dungeon Cobblestone / Granite Wall ('S')
function drawStoneWall(px, py, s, gx, gy) {
  // Dark mortar background
  ctx.fillStyle = '#141414';
  ctx.fillRect(px, py, s, s);

  const blockRows = 3;
  const rh = Math.floor(s / blockRows);

  for (let r = 0; r < blockRows; r++) {
    const y0 = py + r * rh + 1;
    const h0 = rh - 2;
    const seed = hash(gx * 19 + r * 7, gy * 31 + r * 13);
    const split = Math.floor(s * (0.35 + (seed % 30) / 100));

    // Block 1
    const clr1 = (seed % 2 === 0) ? '#4A4E57' : '#3B3E45';
    ctx.fillStyle = clr1;
    ctx.fillRect(px + 1, y0, split - 2, h0);

    // Bevel top/left for block 1
    ctx.fillStyle = '#646973';
    ctx.fillRect(px + 1, y0, split - 2, 1);
    ctx.fillRect(px + 1, y0, 1, h0);

    // Block 2
    const clr2 = (seed % 3 === 0) ? '#535863' : '#32353B';
    ctx.fillStyle = clr2;
    ctx.fillRect(px + split, y0, s - split - 1, h0);

    // Bevel top/left for block 2
    ctx.fillStyle = '#6E737D';
    ctx.fillRect(px + split, y0, s - split - 1, 1);
    ctx.fillRect(px + split, y0, 1, h0);

    // Subtle moss speckle
    if ((seed % 5) === 0) {
      ctx.fillStyle = '#2D4E26';
      ctx.fillRect(px + 2 + (seed % (split - 4)), y0 + h0 - 2, 3, 2);
    }
  }

  // Thin outer border
  ctx.strokeStyle = '#22252A';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
}

// 5. New Wall Type: Golden Egyptian / Aztec Sandstone Wall ('G')
function drawSandstoneWall(px, py, s, gx, gy) {
  // Warm golden ochre base
  ctx.fillStyle = '#C28827';
  ctx.fillRect(px, py, s, s);

  // Horizontal stone layer seams
  const sh = Math.floor(s / 3);
  ctx.fillStyle = '#784E0B';
  ctx.fillRect(px, py + sh - 1, s, 2);
  ctx.fillRect(px, py + sh * 2 - 1, s, 2);

  // Vertical mortar joints
  ctx.fillRect(px + Math.floor(s * 0.45), py, 2, sh);
  ctx.fillRect(px + Math.floor(s * 0.7), py + sh, 2, sh);
  ctx.fillRect(px + Math.floor(s * 0.3), py + sh * 2, 2, sh);

  // Ancient etched hieroglyphic / rune relief band in middle section
  const midY = py + sh + Math.floor(sh / 2);
  ctx.fillStyle = '#E8B65A';
  ctx.fillRect(px + 3, py + 1, s - 6, 1); // Top sun highlight
  ctx.fillRect(px + 3, py + sh + 1, s - 6, 1);
  ctx.fillRect(px + 3, py + sh * 2 + 1, s - 6, 1);

  // Carved geometric diamond glyph
  const cx = px + s / 2;
  ctx.fillStyle = '#5C3802';
  const gr = Math.max(2, Math.floor(s * 0.08));
  ctx.beginPath();
  ctx.moveTo(cx, midY - gr);
  ctx.lineTo(cx + gr, midY);
  ctx.lineTo(cx, midY + gr);
  ctx.lineTo(cx - gr, midY);
  ctx.closePath();
  ctx.fill();

  // Subtle sandstone grain
  const seed = hash(gx * 23, gy * 41);
  ctx.fillStyle = '#A06B17';
  for (let i = 0; i < 4; i++) {
    const dx = (seed * (i + 1)) % (s - 4);
    const dy = (seed * (i + 3)) % (s - 4);
    ctx.fillRect(px + 2 + dx, py + 2 + dy, 2, 1);
  }
}

// 6. Earth / Dirt ('E')
function drawEarth(px, py, s, gx, gy) {
  ctx.fillStyle = '#3A1800';
  ctx.fillRect(px, py, s, s);

  ctx.fillStyle = '#2A0E00';
  const dots = 6;
  for (let i = 0; i < dots; i++) {
    const dx = hash(gx * 7 + i, gy * 13) % (s - 2);
    const dy = hash(gx * 11 + i, gy * 3 + i) % (s - 2);
    ctx.fillRect(px + dx, py + dy, 2, 2);
  }

  ctx.fillStyle = '#4A2800';
  for (let i = 0; i < 3; i++) {
    const dx = hash(gx * 17 + i * 5, gy * 23 + i) % (s - 2);
    const dy = hash(gx * 19 + i, gy * 29 + i * 3) % (s - 2);
    ctx.fillRect(px + dx, py + dy, 1, 1);
  }

  ctx.strokeStyle = '#2A0E00';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
}

// 7. Diamond ('D')
function drawDiamond(px, py, s) {
  const cx = px + s / 2;
  const cy = py + s / 2;
  const r = s * 0.35;

  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fillStyle = '#FFD700';
  ctx.fill();
  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.5);
  ctx.lineTo(cx + r * 0.4, cy);
  ctx.lineTo(cx, cy + r * 0.5);
  ctx.lineTo(cx - r * 0.4, cy);
  ctx.closePath();
  ctx.fillStyle = '#FFEC80';
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cx - 1, cy - r * 0.3, 2, 2);
}

// 8. Boulder / Rock ('R')
function drawRock(px, py, s) {
  const cx = px + s / 2;
  const cy = py + s / 2;
  const r = s * 0.42;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#CC1111';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + r * 0.1, cy + r * 0.1, r * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = '#990000';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = '#CC1111';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = '#FF3333';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#FF7777';
  ctx.fill();
}

// 9. Player character (Repton)
function drawPlayer(px, py, s, facing = 'down', isMoving = false, walkCycle = 0) {
  const cx = px + s / 2;
  const headR = s * 0.18;

  // Head
  ctx.beginPath();
  ctx.arc(cx, py + s * 0.22, headR, 0, Math.PI * 2);
  ctx.fillStyle = '#00EE00';
  ctx.fill();

  // Eyes with directional gaze
  let eyeOffsetX = 0;
  let eyeOffsetY = 0;
  if (facing === 'left') eyeOffsetX = -headR * 0.3;
  if (facing === 'right') eyeOffsetX = headR * 0.3;
  if (facing === 'up') eyeOffsetY = -headR * 0.25;
  if (facing === 'down') eyeOffsetY = headR * 0.1;

  if (facing !== 'up') {
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - headR * 0.5 + eyeOffsetX, py + s * 0.20 + eyeOffsetY, 2.5, 2.5);
    ctx.fillRect(cx + headR * 0.2 + eyeOffsetX, py + s * 0.20 + eyeOffsetY, 2.5, 2.5);
  }

  // Body
  ctx.fillStyle = '#00DD00';
  const bodyW = s * 0.22;
  const bodyH = s * 0.28;
  ctx.fillRect(cx - bodyW / 2, py + s * 0.36, bodyW, bodyH);

  // Arms with walking swing
  const armSwing = isMoving ? Math.sin(walkCycle) * (s * 0.05) : 0;
  ctx.fillRect(cx - s * 0.38, py + s * 0.40 + armSwing, s * 0.76, s * 0.07);

  // Legs with walking stride
  const legSwing = isMoving ? Math.sin(walkCycle) * (s * 0.07) : 0;
  const legW = s * 0.08;
  const legH = s * 0.24;
  ctx.fillRect(cx - bodyW / 2, py + s * 0.64 + legSwing, legW, legH - legSwing);
  ctx.fillRect(cx + bodyW / 2 - legW, py + s * 0.64 - legSwing, legW, legH + legSwing);

  // Belt
  ctx.fillStyle = '#008800';
  ctx.fillRect(cx - bodyW / 2, py + s * 0.50, bodyW, s * 0.04);
}

// Master Render Function
function render() {
  updateCamera();

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const minGx = Math.max(0, Math.floor(cameraX));
  const maxGx = Math.min(MAP_W - 1, Math.ceil(cameraX + viewportTilesX));
  const minGy = Math.max(0, Math.floor(cameraY));
  const maxGy = Math.min(MAP_H - 1, Math.ceil(cameraY + viewportTilesY));

  for (let gy = minGy; gy <= maxGy; gy++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      const px = (gx - cameraX) * TILE_SIZE;
      const py = (gy - cameraY) * TILE_SIZE;
      const tile = grid[gy][gx];

      switch (tile) {
        case EARTH:
          drawEarth(px, py, TILE_SIZE, gx, gy);
          break;
        case WALL:
          drawWall(px, py, TILE_SIZE);
          break;
        case WALL_TL:
        case WALL_TR:
        case WALL_BL:
        case WALL_BR:
          drawRoundedWall(px, py, TILE_SIZE, tile);
          break;
        case WALL_STEEL:
          drawSteelWall(px, py, TILE_SIZE);
          break;
        case WALL_STONE:
          drawStoneWall(px, py, TILE_SIZE, gx, gy);
          break;
        case WALL_SANDSTONE:
          drawSandstoneWall(px, py, TILE_SIZE, gx, gy);
          break;
        case DIAMOND:
          drawDiamond(px, py, TILE_SIZE);
          break;
        case ROCK:
          drawRock(px, py, TILE_SIZE);
          break;
      }
    }
  }

  // Render pushed rock sliding smoothly
  if (pushedRock) {
    const rx = pushedRock.fromX + (pushedRock.toX - pushedRock.fromX) * pushedRock.progress;
    const ry = pushedRock.fromY + (pushedRock.toY - pushedRock.fromY) * pushedRock.progress;
    const rpx = (rx - cameraX) * TILE_SIZE;
    const rpy = (ry - cameraY) * TILE_SIZE;
    drawRock(rpx, rpy, TILE_SIZE);
  }

  // Render player
  if (gameState !== 'dead') {
    const ppx = (player.visualX - cameraX) * TILE_SIZE;
    const ppy = (player.visualY - cameraY) * TILE_SIZE;
    drawPlayer(ppx, ppy, TILE_SIZE, player.facing, player.isMoving, player.walkCycle);
  } else {
    // Crushed death marker
    const sx = (player.visualX - cameraX) * TILE_SIZE;
    const sy = (player.visualY - cameraY) * TILE_SIZE;
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx + 4, sy + 4);
    ctx.lineTo(sx + TILE_SIZE - 4, sy + TILE_SIZE - 4);
    ctx.moveTo(sx + TILE_SIZE - 4, sy + 4);
    ctx.lineTo(sx + 4, sy + TILE_SIZE - 4);
    ctx.stroke();
  }
}

// ===== SOUND EFFECTS (Web Audio API) =====
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playStepSound(isEarth) {
  try {
    const actx = getAudioCtx();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    const now = actx.currentTime;
    if (isEarth) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.03);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    }
  } catch (e) { }
}

function playDiamondSound() {
  try {
    const actx = getAudioCtx();
    const now = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.04);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch (e) { }
}

function playPushSound() {
  try {
    const actx = getAudioCtx();
    const now = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) { }
}

function playDeathSound() {
  try {
    const actx = getAudioCtx();
    const now = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) { }
}

function playRockThudSound() {
  try {
    const actx = getAudioCtx();
    const now = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.09);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) { }
}

function playWinSound() {
  try {
    const actx = getAudioCtx();
    const now = actx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      const t = now + idx * 0.1;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  } catch (e) { }
}

// ===== PHYSICS ENGINE =====
function doPhysics() {
  if (gameState !== 'playing') return;

  const newFalling = new Set();
  let rockLanded = false;

  // Process rocks bottom-to-top, left-to-right
  for (let y = MAP_H - 2; y >= 0; y--) {
    for (let x = 0; x < MAP_W; x++) {
      if (grid[y][x] !== ROCK) continue;

      const key = `${x},${y}`;
      const isAlreadyFalling = fallingRocks.has(key);

      if (y + 1 < MAP_H) {
        const below = grid[y + 1][x];

        if (below === EMPTY) {
          // Check if player is directly underneath this rock
          const isPlayerUnder = (player.x === x && player.y === y + 1);
          const isPlayerMovingInto = (player.isMoving && player.targetX === x && player.targetY === y + 1);
          const isPlayerMovingAway = (player.isMoving && player.startX === x && player.startY === y + 1 && player.targetX !== x);

          if (isPlayerUnder || isPlayerMovingInto) {
            if (isPlayerMovingAway) {
              // Player is stepping away horizontally -> rock drops safely behind player
              grid[y + 1][x] = ROCK;
              grid[y][x] = EMPTY;
              newFalling.add(`${x},${y + 1}`);
              continue;
            }

            if (isAlreadyFalling) {
              // Rock was falling from above -> crushes player!
              gameState = 'dead';
              playDeathSound();
              showMessage('ROZDRCEN! 💀', 'lose');
              return;
            } else {
              // Rock resting on player: player supports it safely on their head
              continue;
            }
          }

          // Rock falls into empty space
          grid[y + 1][x] = ROCK;
          grid[y][x] = EMPTY;
          newFalling.add(`${x},${y + 1}`);
          continue;
        }

        // Slide off another rock or diamond
        if (below === ROCK || below === DIAMOND) {
          // Slide left
          if (x > 0 && grid[y][x - 1] === EMPTY && grid[y + 1][x - 1] === EMPTY) {
            const playerBlocked = (player.x === x - 1 && player.y === y) ||
              (player.isMoving && player.targetX === x - 1 && player.targetY === y) ||
              (player.x === x - 1 && player.y === y + 1) ||
              (player.isMoving && player.targetX === x - 1 && player.targetY === y + 1);
            if (!playerBlocked) {
              grid[y][x - 1] = ROCK;
              grid[y][x] = EMPTY;
              newFalling.add(`${x - 1},${y}`);
              continue;
            }
          }
          // Slide right
          if (x + 1 < MAP_W && grid[y][x + 1] === EMPTY && grid[y + 1][x + 1] === EMPTY) {
            const playerBlocked = (player.x === x + 1 && player.y === y) ||
              (player.isMoving && player.targetX === x + 1 && player.targetY === y) ||
              (player.x === x + 1 && player.y === y + 1) ||
              (player.isMoving && player.targetX === x + 1 && player.targetY === y + 1);
            if (!playerBlocked) {
              grid[y][x + 1] = ROCK;
              grid[y][x] = EMPTY;
              newFalling.add(`${x + 1},${y}`);
              continue;
            }
          }
        }

        // Slide off rounded wall (Top-Left): stone rolls LEFT
        if (below === WALL_TL) {
          if (x > 0 && grid[y][x - 1] === EMPTY && grid[y + 1][x - 1] === EMPTY) {
            const playerBlocked = (player.x === x - 1 && player.y === y) ||
              (player.isMoving && player.targetX === x - 1 && player.targetY === y) ||
              (player.x === x - 1 && player.y === y + 1) ||
              (player.isMoving && player.targetX === x - 1 && player.targetY === y + 1);
            if (!playerBlocked) {
              grid[y][x - 1] = ROCK;
              grid[y][x] = EMPTY;
              newFalling.add(`${x - 1},${y}`);
              continue;
            }
          }
        }

        // Slide off rounded wall (Top-Right): stone rolls RIGHT
        if (below === WALL_TR) {
          if (x + 1 < MAP_W && grid[y][x + 1] === EMPTY && grid[y + 1][x + 1] === EMPTY) {
            const playerBlocked = (player.x === x + 1 && player.y === y) ||
              (player.isMoving && player.targetX === x + 1 && player.targetY === y) ||
              (player.x === x + 1 && player.y === y + 1) ||
              (player.isMoving && player.targetX === x + 1 && player.targetY === y + 1);
            if (!playerBlocked) {
              grid[y][x + 1] = ROCK;
              grid[y][x] = EMPTY;
              newFalling.add(`${x + 1},${y}`);
              continue;
            }
          }
        }

        if (isAlreadyFalling) {
          rockLanded = true;
        }
      } else {
        if (isAlreadyFalling) {
          rockLanded = true;
        }
      }
    }
  }

  fallingRocks.clear();
  for (const k of newFalling) {
    fallingRocks.add(k);
  }

  if (rockLanded) {
    playRockThudSound();
  }
}

// ===== INPUT & MOVEMENT LOGIC =====
const KEY_MAP = {
  'ArrowUp': { dx: 0, dy: -1, dir: 'up' },
  'KeyW': { dx: 0, dy: -1, dir: 'up' },
  'w': { dx: 0, dy: -1, dir: 'up' },
  'W': { dx: 0, dy: -1, dir: 'up' },
  'ArrowDown': { dx: 0, dy: 1, dir: 'down' },
  'KeyS': { dx: 0, dy: 1, dir: 'down' },
  's': { dx: 0, dy: 1, dir: 'down' },
  'S': { dx: 0, dy: 1, dir: 'down' },
  'ArrowLeft': { dx: -1, dy: 0, dir: 'left' },
  'KeyA': { dx: -1, dy: 0, dir: 'left' },
  'a': { dx: -1, dy: 0, dir: 'left' },
  'A': { dx: -1, dy: 0, dir: 'left' },
  'ArrowRight': { dx: 1, dy: 0, dir: 'right' },
  'KeyD': { dx: 1, dy: 0, dir: 'right' },
  'd': { dx: 1, dy: 0, dir: 'right' },
  'D': { dx: 1, dy: 0, dir: 'right' }
};

let activeKeys = [];
let bufferedDir = null;
let touchDir = null;
let isSpaceHeld = false;

function tryGrab(dx, dy) {
  if (gameState !== 'playing') return false;
  if (player.isMoving) return false;
  if (fallingRocks.size > 0) return false;

  if (dx === 1) player.facing = 'right';
  else if (dx === -1) player.facing = 'left';
  else if (dy === 1) player.facing = 'down';
  else if (dy === -1) player.facing = 'up';

  const nx = player.x + dx;
  const ny = player.y + dy;

  if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return false;

  const target = grid[ny][nx];

  if (target === EARTH) {
    grid[ny][nx] = EMPTY;
    playStepSound(true);
    player.walkCycle += 1.8;
    return true;
  }

  if (target === DIAMOND) {
    grid[ny][nx] = EMPTY;
    score++;
    document.getElementById('diamonds').textContent = score;
    playDiamondSound();
    player.walkCycle += 1.8;

    if (score >= totalDiamonds && gameState === 'playing') {
      triggerWin();
    }
    return true;
  }

  return false;
}

function getDesiredDirection() {
  if (touchDir) return touchDir;
  if (bufferedDir) return bufferedDir;
  if (activeKeys.length > 0) {
    const lastKey = activeKeys[activeKeys.length - 1];
    return KEY_MAP[lastKey] || null;
  }
  return null;
}

function canMove(dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;

  if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) {
    return { canMove: false };
  }

  const target = grid[ny][nx];

  if (isWall(target)) {
    return { canMove: false };
  }

  if (target === ROCK) {
    if (dy !== 0) return { canMove: false }; // can't push rock vertically
    if (fallingRocks.size > 0) return { canMove: false }; // can't push while rocks are falling
    // Can't push a rock that has an empty gap below it (it must fall, cannot float!)
    if (ny + 1 < MAP_H && grid[ny + 1][nx] === EMPTY) return { canMove: false };
    const bx = nx + dx;
    if (bx < 0 || bx >= MAP_W) return { canMove: false };
    if (grid[ny][bx] !== EMPTY) return { canMove: false };
    return { canMove: true, isPush: true, bx, by: ny };
  }

  return { canMove: true, isPush: false };
}

function getNextMove() {
  const primary = getDesiredDirection();
  if (primary && canMove(primary.dx, primary.dy).canMove) {
    if (bufferedDir === primary) bufferedDir = null;
    return primary;
  }
  for (let i = activeKeys.length - 1; i >= 0; i--) {
    const candidate = KEY_MAP[activeKeys[i]];
    if (candidate && canMove(candidate.dx, candidate.dy).canMove) {
      return candidate;
    }
  }
  return null;
}

function startMove(dx, dy) {
  if (gameState !== 'playing') return false;

  const check = canMove(dx, dy);
  if (!check.canMove) {
    if (dx === 1) player.facing = 'right';
    else if (dx === -1) player.facing = 'left';
    else if (dy === 1) player.facing = 'down';
    else if (dy === -1) player.facing = 'up';
    return false;
  }

  // Under rock moving down -> crushed immediately!
  const rockAbove = (player.y > 0 && grid[player.y - 1][player.x] === ROCK);
  if (rockAbove && dy === 1) {
    const nx = player.x;
    const ny = player.y + 1;
    grid[player.y - 1][player.x] = EMPTY;
    grid[ny][nx] = ROCK;
    player.x = nx;
    player.y = ny;
    player.visualX = nx;
    player.visualY = ny;
    player.isMoving = false;
    gameState = 'dead';
    playDeathSound();
    showMessage('ROZDRCEN! 💀', 'lose');
    return false;
  }

  const nx = player.x + dx;
  const ny = player.y + dy;
  const target = grid[ny][nx];

  if (check.isPush) {
    pushedRock = {
      fromX: nx,
      fromY: ny,
      toX: check.bx,
      toY: check.by,
      progress: 0
    };
    grid[ny][nx] = EMPTY;
    playPushSound();
  } else if (target === DIAMOND) {
    score++;
    document.getElementById('diamonds').textContent = score;
    playDiamondSound();
    grid[ny][nx] = EMPTY;

    if (score >= totalDiamonds && gameState === 'playing') {
      triggerWin();
    }
  } else if (target === EARTH) {
    grid[ny][nx] = EMPTY;
    playStepSound(true);
  } else {
    playStepSound(false);
  }

  player.isMoving = true;
  player.startX = player.x;
  player.startY = player.y;
  player.targetX = nx;
  player.targetY = ny;
  player.moveProgress = 0;

  if (dx === 1) player.facing = 'right';
  else if (dx === -1) player.facing = 'left';
  else if (dy === 1) player.facing = 'down';
  else if (dy === -1) player.facing = 'up';

  return true;
}

function updatePlayer(dt) {
  if (gameState !== 'playing') return;

  if (player.isMoving) {
    player.moveProgress += dt / MOVE_DURATION;
    player.walkCycle += dt * 26;

    if (pushedRock) {
      pushedRock.progress = Math.min(1.0, player.moveProgress);
    }

    if (player.moveProgress >= 1.0) {
      player.x = player.targetX;
      player.y = player.targetY;
      player.visualX = player.x;
      player.visualY = player.y;
      player.isMoving = false;
      moveCount++;

      if (pushedRock) {
        const rx = pushedRock.toX;
        const ry = pushedRock.toY;
        grid[ry][rx] = ROCK;
        pushedRock = null;

        // Rock pushed over gap must fall immediately
        if (ry + 1 < MAP_H && grid[ry + 1][rx] === EMPTY) {
          fallingRocks.add(`${rx},${ry}`);
          doPhysics();
          return;
        }
        // Pushed onto another rock, diamond or rounded wall -> check roll
        if (ry + 1 < MAP_H && (grid[ry + 1][rx] === ROCK || grid[ry + 1][rx] === DIAMOND || grid[ry + 1][rx] === WALL_TL || grid[ry + 1][rx] === WALL_TR)) {
          doPhysics();
          if (fallingRocks.size > 0) {
            return;
          }
        }
      }

      // Wait if rocks are falling or Space is held
      if (fallingRocks.size > 0 || isSpaceHeld) {
        if (isSpaceHeld) {
          const dir = getDesiredDirection();
          if (dir) {
            player.facing = dir.dir;
            tryGrab(dir.dx, dir.dy);
          }
        }
        return;
      }

      // Continuous fluid movement
      const next = getNextMove();
      if (next) {
        const excess = player.moveProgress - 1.0;
        if (startMove(next.dx, next.dy)) {
          player.moveProgress = Math.min(0.25, excess);
          player.visualX = player.startX + (player.targetX - player.startX) * player.moveProgress;
          player.visualY = player.startY + (player.targetY - player.startY) * player.moveProgress;
        }
      }
    } else {
      player.visualX = player.startX + (player.targetX - player.startX) * player.moveProgress;
      player.visualY = player.startY + (player.targetY - player.startY) * player.moveProgress;
    }
  } else {
    player.visualX = player.x;
    player.visualY = player.y;

    if (fallingRocks.size > 0 || isSpaceHeld) {
      if (isSpaceHeld) {
        const dir = getDesiredDirection();
        if (dir) {
          player.facing = dir.dir;
          tryGrab(dir.dx, dir.dy);
        }
      }
      return;
    }

    const next = getNextMove();
    if (next) {
      startMove(next.dx, next.dy);
    }
  }
}

function handleInput(dx, dy) {
  if (gameState !== 'playing') return;
  const dirName = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up';
  bufferedDir = { dx, dy, dir: dirName };

  if (isSpaceHeld) {
    tryGrab(dx, dy);
    return;
  }

  if (!player.isMoving && fallingRocks.size === 0) {
    startMove(dx, dy);
  }
}

// ===== WIN / LOSE & UI MESSAGES =====
function triggerWin() {
  gameState = 'won';
  playWinSound();

  const isLast = currentLevelIndex >= LEVELS.length - 1;
  let btnHtml = '';
  if (!isLast) {
    btnHtml = '<button class="btn-action" onclick="nextLevel()">Další level ❯</button>';
  } else {
    btnHtml = '<button class="btn-action" onclick="loadLevel(0)">Hrát znovu od 1. levelu ↻</button>';
  }

  showMessage(`VÍTĚZSTVÍ! 🏆<div class="sub">Level dokončen!${btnHtml}</div>`, 'win');
}

function showMessage(htmlContent, type) {
  const msg = document.getElementById('message');
  if (type === 'lose') {
    msg.innerHTML = htmlContent + '<div class="sub"><button class="btn-action" onclick="restartGame()">Zkusit znovu ↻</button> (nebo stiskni R)</div>';
  } else {
    msg.innerHTML = htmlContent;
  }
  msg.className = type;
  msg.style.display = 'block';
}

// ===== LEVEL LOADING & SELECTOR =====
function populateLevelSelect() {
  const select = document.getElementById('level-select');
  if (!select) return;
  select.innerHTML = '';
  LEVELS.forEach((lvl, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = lvl.name;
    select.appendChild(opt);
  });

  const onSelectChange = (e) => {
    const newIdx = parseInt(e.target.value, 10);
    if (!isNaN(newIdx) && newIdx !== currentLevelIndex) {
      loadLevel(newIdx);
    }
    select.blur();
    canvas.focus();
  };

  select.addEventListener('change', onSelectChange);
  select.addEventListener('input', onSelectChange);
}

function loadLevel(index) {
  if (index < 0 || index >= LEVELS.length) index = 0;
  currentLevelIndex = index;

  const lvl = LEVELS[currentLevelIndex];
  MAP_W = lvl.width;
  MAP_H = lvl.height;

  grid = [];
  score = 0;
  totalDiamonds = 0;
  gameState = 'playing';
  moveCount = 0;

  for (let y = 0; y < MAP_H; y++) {
    grid[y] = [];
    const rowStr = (lvl.map[y] || '').padEnd(MAP_W, 'W').slice(0, MAP_W);
    for (let x = 0; x < MAP_W; x++) {
      const ch = rowStr[x];
      if (ch === 'P') {
        player.x = x;
        player.y = y;
        grid[y][x] = EMPTY;
      } else {
        grid[y][x] = CHAR_MAP[ch] !== undefined ? CHAR_MAP[ch] : WALL;
      }
      if (ch === 'D') totalDiamonds++;
    }
  }

  player.visualX = player.x;
  player.visualY = player.y;
  player.startX = player.x;
  player.startY = player.y;
  player.targetX = player.x;
  player.targetY = player.y;
  player.isMoving = false;
  player.moveProgress = 0;
  player.facing = 'down';
  player.walkCycle = 0;

  pushedRock = null;
  fallingRocks.clear();
  physicsTimer = 0;

  activeKeys = [];
  bufferedDir = null;
  touchDir = null;
  isSpaceHeld = false;

  document.getElementById('total').textContent = totalDiamonds;
  document.getElementById('diamonds').textContent = '0';
  document.getElementById('message').style.display = 'none';

  const select = document.getElementById('level-select');
  if (select) select.value = currentLevelIndex;

  setupCanvas();
}

function restartGame() {
  loadLevel(currentLevelIndex);
}

function nextLevel() {
  if (currentLevelIndex < LEVELS.length - 1) {
    loadLevel(currentLevelIndex + 1);
  } else {
    loadLevel(0);
  }
}

// ===== EVENT LISTENERS =====
canvas.addEventListener('pointerdown', () => {
  const select = document.getElementById('level-select');
  if (select) select.blur();
  canvas.focus();
});

window.addEventListener('keydown', (e) => {
  const select = document.getElementById('level-select');
  if (e.target === select) {
    if (e.key === 'Enter' || e.key === 'Escape') {
      select.blur();
      canvas.focus();
    }
    return;
  }

  if (e.key === 'r' || e.key === 'R') {
    restartGame();
    return;
  }

  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    isSpaceHeld = true;
    const activeDir = getDesiredDirection();
    if (activeDir) {
      tryGrab(activeDir.dx, activeDir.dy);
    }
    return;
  }

  const mapping = KEY_MAP[e.key] || KEY_MAP[e.code];
  if (mapping) {
    e.preventDefault();
    const code = e.code || e.key;
    if (!activeKeys.includes(code)) {
      activeKeys.push(code);
    }
    bufferedDir = mapping;

    if (isSpaceHeld) {
      tryGrab(mapping.dx, mapping.dy);
    } else if (!player.isMoving && fallingRocks.size === 0) {
      startMove(mapping.dx, mapping.dy);
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    isSpaceHeld = false;
  }

  const code = e.code || e.key;
  const idx = activeKeys.indexOf(code);
  if (idx !== -1) {
    activeKeys.splice(idx, 1);
  }
  if (activeKeys.length > 0) {
    const lastKey = activeKeys[activeKeys.length - 1];
    bufferedDir = KEY_MAP[lastKey] || null;
  } else {
    bufferedDir = null;
  }
});

window.addEventListener('blur', () => {
  activeKeys = [];
  bufferedDir = null;
  touchDir = null;
  isSpaceHeld = false;
});

function setupTouchControls() {
  const buttons = document.querySelectorAll('#touch-controls button[data-dir]');
  buttons.forEach(btn => {
    const dir = btn.dataset.dir;
    const mapping = {
      'up': { dx: 0, dy: -1, dir: 'up' },
      'down': { dx: 0, dy: 1, dir: 'down' },
      'left': { dx: -1, dy: 0, dir: 'left' },
      'right': { dx: 1, dy: 0, dir: 'right' }
    }[dir];

    const start = (e) => {
      e.preventDefault();
      touchDir = mapping;
      if (isSpaceHeld) {
        tryGrab(mapping.dx, mapping.dy);
      } else if (!player.isMoving && fallingRocks.size === 0) {
        startMove(mapping.dx, mapping.dy);
      }
    };
    const end = (e) => {
      e.preventDefault();
      if (touchDir === mapping) touchDir = null;
    };

    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('pointerleave', end);
  });

  const grabBtn = document.querySelector('#touch-controls button[data-action="grab"]');
  if (grabBtn) {
    const startGrab = (e) => {
      e.preventDefault();
      isSpaceHeld = true;
      grabBtn.style.background = '#444400';
      const activeDir = getDesiredDirection();
      if (activeDir) {
        tryGrab(activeDir.dx, activeDir.dy);
      }
    };
    const endGrab = (e) => {
      e.preventDefault();
      isSpaceHeld = false;
      grabBtn.style.background = '#2a2a00';
    };
    grabBtn.addEventListener('pointerdown', startGrab);
    grabBtn.addEventListener('pointerup', endGrab);
    grabBtn.addEventListener('pointercancel', endGrab);
    grabBtn.addEventListener('pointerleave', endGrab);
  }
}

// Canvas swipe support
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const threshold = 18;

  if (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold) {
    if (Math.abs(dx) > Math.abs(dy)) {
      handleInput(dx > 0 ? 1 : -1, 0);
    } else {
      handleInput(0, dy > 0 ? 1 : -1);
    }
  }
  e.preventDefault();
}, { passive: false });

window.addEventListener('resize', () => {
  setupCanvas();
});

// ===== MAIN GAME LOOP =====
let lastTime = performance.now();

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  if (gameState === 'playing') {
    physicsTimer += dt;
    while (physicsTimer >= PHYSICS_INTERVAL) {
      physicsTimer -= PHYSICS_INTERVAL;
      doPhysics();
    }

    updatePlayer(dt);
  }

  render();
  requestAnimationFrame(gameLoop);
}

// ===== INITIALIZATION =====
populateLevelSelect();
loadLevel(0);
setupTouchControls();
requestAnimationFrame(gameLoop);

console.log("Repton modular game engine initialized successfully.");
