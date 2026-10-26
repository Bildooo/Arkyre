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

let pushedRock = null; // { fromX, fromY, toX, toY, progress, type }
const fallingRocks = new Set(); // tracks rocks and eggs currently mid-fall: "x,y"
let physicsTimer = 0;
let monsters = []; // active monsters hatched from eggs
let hatchingEggs = []; // eggs currently hatching: { x, y, timeLeft, totalTime }
let eggCrackParticles = []; // visual particles when egg hatches

let score = 0;
let totalDiamonds = 0;
let gameState = 'playing'; // 'playing', 'won', 'dead'
let moveCount = 0;

// Speed constants (in seconds)
const MOVE_DURATION = 0.135;    // ~135ms per tile step (~7.4 tiles/sec, fluid & responsive)
const PHYSICS_INTERVAL = 0.055; // ~55ms per tile: rocks fall fast and heavy (~18 tiles/sec)
const EGG_HATCH_DELAY = 1.5;    // 1.5s delay between egg cracking and monster emergence

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
  if (TILE_SIZE > 64) TILE_SIZE = 64;

  viewportTilesX = Math.min(MAP_W, Math.floor(maxW / TILE_SIZE));
  viewportTilesY = Math.min(MAP_H, Math.floor(maxH / TILE_SIZE));
  if (viewportTilesX > MAP_W) viewportTilesX = MAP_W;
  if (viewportTilesY > MAP_H) viewportTilesY = MAP_H;

  canvas.width = viewportTilesX * TILE_SIZE;
  canvas.height = viewportTilesY * TILE_SIZE;
  ctx.imageSmoothingEnabled = false;
}

function updateCamera() {
  const idealX = player.visualX - (viewportTilesX - 1) / 2;
  const idealY = player.visualY - (viewportTilesY - 1) / 2;
  cameraX = Math.max(0, Math.min(MAP_W - viewportTilesX, idealX));
  cameraY = Math.max(0, Math.min(MAP_H - viewportTilesY, idealY));
}

// ===== SPRITE ASSET LOADING =====
const spriteSheetImg = new Image();
spriteSheetImg.src = 'sprites.png';
let spritesReady = false;

// Coordinates in sprites.png (exact bounding boxes avoiding divider lines)
const SPRITE_RECTS = {
  rock:        { x: 2,   y: 2,   w: 250, h: 250 },
  diamond:     { x: 260, y: 2,   w: 248, h: 250 },
  player:      { x: 516, y: 2,   w: 249, h: 250 },
  empty:       { x: 772, y: 2,   w: 250, h: 250 },
  wall_tl:     { x: 2,   y: 260, w: 250, h: 248 },
  wall_t:      { x: 260, y: 260, w: 248, h: 248 },
  wall_tr:     { x: 516, y: 260, w: 249, h: 248 },
  wall_portal: { x: 772, y: 260, w: 250, h: 248 },
  wall_l:      { x: 2,   y: 516, w: 250, h: 248 },
  wall_gateway:{ x: 260, y: 516, w: 248, h: 248 },
  wall_r:      { x: 516, y: 516, w: 249, h: 248 },
  wall_cage:   { x: 772, y: 516, w: 250, h: 248 },
  wall_bl:     { x: 2,   y: 772, w: 250, h: 250 },
  wall_b:      { x: 260, y: 772, w: 248, h: 250 },
  wall_br:     { x: 516, y: 772, w: 249, h: 250 },
  wall:        { x: 772, y: 772, w: 250, h: 250 }
};

spriteSheetImg.onload = () => {
  spritesReady = true;
};
spriteSheetImg.onerror = () => {
  if (spriteSheetImg.src.includes('sprites.png')) {
    spriteSheetImg.src = 'sprite sheet.jpg';
  }
};
if (spriteSheetImg.complete && spriteSheetImg.naturalWidth > 0) {
  spritesReady = true;
}

function drawSprite(name, dx, dy, dw, dh) {
  if (!spritesReady) return false;
  const r = SPRITE_RECTS[name];
  if (!r) return false;
  ctx.drawImage(spriteSheetImg, r.x, r.y, r.w, r.h, dx, dy, dw, dh);
  return true;
}

function getWallSpriteKey(gx, gy) {
  if (gx === undefined || gy === undefined || !grid || !grid[gy]) return 'wall';
  const up = gy > 0 && isWall(grid[gy - 1][gx]);
  const down = gy < MAP_H - 1 && isWall(grid[gy + 1][gx]);
  const left = gx > 0 && isWall(grid[gy][gx - 1]);
  const right = gx < MAP_W - 1 && isWall(grid[gy][gx + 1]);

  if (!up && !left && down && right) return 'wall_tl';
  if (!up && !right && down && left) return 'wall_tr';
  if (!down && !left && up && right) return 'wall_bl';
  if (!down && !right && up && left) return 'wall_br';

  if (!up && down) return 'wall_t';
  if (!down && up) return 'wall_b';
  if (!left && right) return 'wall_l';
  if (!right && left) return 'wall_r';

  return 'wall';
}

// ===== GRAPHICS & DRAWING =====
function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return Math.abs(h ^ (h >> 16));
}

// 1. Classic Red Brick Wall ('W')
function drawWall(px, py, s, gx, gy) {
  if (spritesReady) {
    const key = getWallSpriteKey(gx, gy);
    if (drawSprite(key, px, py, s, s)) return;
  }

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
  if (spritesReady) {
    let key = 'wall_tl';
    if (type === WALL_TR) key = 'wall_tr';
    else if (type === WALL_BL) key = 'wall_bl';
    else if (type === WALL_BR) key = 'wall_br';
    if (drawSprite(key, px, py, s, s)) return;
  }
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
  if (spritesReady && drawSprite('wall_cage', px, py, s, s)) return;

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
  if (spritesReady && drawSprite('wall_portal', px, py, s, s)) return;

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
  if (spritesReady && drawSprite('wall_gateway', px, py, s, s)) return;

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
  if (spritesReady && drawSprite('diamond', px, py, s, s)) return;

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
  if (spritesReady && drawSprite('rock', px, py, s, s)) return;

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

// 8b. Egg / White Stone ('O')
function drawEgg(px, py, s) {
  const cx = px + s / 2;
  const cy = py + s / 2 + s * 0.04;
  const rx = s * 0.33;
  const ry = s * 0.41;

  ctx.save();

  // Drop shadow
  ctx.beginPath();
  ctx.ellipse(cx, py + s * 0.86, rx * 0.85, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  // 3D Egg shape using bezier curves
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.bezierCurveTo(cx + rx * 0.9, cy - ry * 0.85, cx + rx * 1.15, cy + ry * 0.35, cx + rx * 0.8, cy + ry * 0.85);
  ctx.bezierCurveTo(cx + rx * 0.5, cy + ry * 1.05, cx - rx * 0.5, cy + ry * 1.05, cx - rx * 0.8, cy + ry * 0.85);
  ctx.bezierCurveTo(cx - rx * 1.15, cy + ry * 0.35, cx - rx * 0.9, cy - ry * 0.85, cx, cy - ry);
  ctx.closePath();

  // Gradient fill (pearl / ivory white with subtle 3D lighting)
  const grad = ctx.createRadialGradient(
    cx - rx * 0.35, cy - ry * 0.35, rx * 0.1,
    cx, cy, ry * 1.1
  );
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.35, '#F7F6EE');
  grad.addColorStop(0.7, '#DED6C4');
  grad.addColorStop(1, '#968C76');
  ctx.fillStyle = grad;
  ctx.fill();

  // Shell outline
  ctx.strokeStyle = '#5E5440';
  ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.stroke();

  // Glossy highlight
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.32, cy - ry * 0.38, rx * 0.22, ry * 0.14, -Math.PI / 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fill();

  ctx.restore();
}

// 8b-2. Hatching Egg (Cracking open during the 1.5s delay)
function drawHatchingEgg(px, py, s, he) {
  const cx = px + s / 2;
  const cy = py + s / 2 + s * 0.04;
  const rx = s * 0.33;
  const ry = s * 0.41;
  const progress = Math.max(0, Math.min(1, 1 - (he.timeLeft / he.totalTime))); // 0.0 -> 1.0

  // Trembling / shaking increases as hatch moment nears
  const shakeIntensity = 0.5 + progress * 2.5;
  const shakeX = (Math.sin(performance.now() * 0.045) + Math.cos(performance.now() * 0.07)) * (s * 0.015 * shakeIntensity);
  const shakeY = Math.cos(performance.now() * 0.05) * (s * 0.01 * shakeIntensity);

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Drop shadow
  ctx.beginPath();
  ctx.ellipse(cx, py + s * 0.86, rx * 0.85, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  // Egg shell shape
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.bezierCurveTo(cx + rx * 0.9, cy - ry * 0.85, cx + rx * 1.15, cy + ry * 0.35, cx + rx * 0.8, cy + ry * 0.85);
  ctx.bezierCurveTo(cx + rx * 0.5, cy + ry * 1.05, cx - rx * 0.5, cy + ry * 1.05, cx - rx * 0.8, cy + ry * 0.85);
  ctx.bezierCurveTo(cx - rx * 1.15, cy + ry * 0.35, cx - rx * 0.9, cy - ry * 0.85, cx, cy - ry);
  ctx.closePath();

  const grad = ctx.createRadialGradient(
    cx - rx * 0.35, cy - ry * 0.35, rx * 0.1,
    cx, cy, ry * 1.1
  );
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.35, '#F7F6EE');
  grad.addColorStop(0.7, '#DED6C4');
  grad.addColorStop(1, '#968C76');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = '#5E5440';
  ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.stroke();

  // Widening jagged fissure cracks
  const crackWidth = Math.max(1.5, s * (0.04 + progress * 0.08));
  ctx.strokeStyle = '#1A0033'; // Alien darkness inside
  ctx.lineWidth = crackWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.8, cy + ry * 0.1);
  ctx.lineTo(cx - rx * 0.35, cy - ry * 0.1);
  ctx.lineTo(cx - rx * 0.05, cy + ry * 0.15);
  ctx.lineTo(cx + rx * 0.35, cy - ry * 0.05);
  ctx.lineTo(cx + rx * 0.75, cy + ry * 0.2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.05, cy + ry * 0.15);
  ctx.lineTo(cx + rx * 0.08, cy + ry * 0.55);
  ctx.stroke();

  // Alien glowing eyes peeking out from the opening crack
  if (progress > 0.25) {
    const eyeAlpha = Math.min(1.0, (progress - 0.25) * 2.0);
    ctx.fillStyle = `rgba(255, 234, 0, ${eyeAlpha})`;
    const eyeSize = Math.max(1.5, s * (0.04 + progress * 0.03));
    // Left eye
    ctx.beginPath();
    ctx.arc(cx - rx * 0.22, cy - ry * 0.02, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(cx + rx * 0.15, cy + ry * 0.04, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Red pupil
    ctx.fillStyle = `rgba(213, 0, 0, ${eyeAlpha})`;
    ctx.beginPath();
    ctx.arc(cx - rx * 0.22, cy - ry * 0.02, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + rx * 0.15, cy + ry * 0.04, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// 8c. Enemy / Monster
function drawMonster(px, py, s, monster) {
  const cx = px + s / 2;
  const cy = py + s / 2;
  const r = s * 0.36;
  const tick = performance.now() * 0.008;

  ctx.save();

  // Monster shadow
  ctx.beginPath();
  ctx.ellipse(cx, py + s * 0.88, r * 0.9, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fill();

  // Animated twitching legs (6 legs)
  ctx.strokeStyle = '#7B1FA2';
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const angle = (i / 5) * Math.PI - Math.PI / 2;
    const legWiggle = Math.sin(tick * 3 + i * 1.3) * (s * 0.08);
    const lx1 = cx + Math.cos(angle) * (r * 0.7);
    const ly1 = cy + Math.sin(angle) * (r * 0.7);
    const lx2 = cx + Math.cos(angle) * (r * 1.25) + legWiggle;
    const ly2 = cy + Math.sin(angle) * (r * 1.25) + Math.abs(legWiggle);
    ctx.beginPath();
    ctx.moveTo(lx1, ly1);
    ctx.lineTo(lx2, ly2);
    ctx.stroke();
  }

  // Pulsing body (deep alien purple / venomous magenta)
  const pulse = Math.sin(tick * 2) * (s * 0.02);
  const bodyGrad = ctx.createRadialGradient(
    cx - r * 0.25, cy - r * 0.25, r * 0.1,
    cx, cy, r + pulse
  );
  bodyGrad.addColorStop(0, '#E040FB');
  bodyGrad.addColorStop(0.4, '#AA00FF');
  bodyGrad.addColorStop(0.85, '#4A148C');
  bodyGrad.addColorStop(1, '#1A0033');

  ctx.beginPath();
  ctx.arc(cx, cy, r + pulse, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = '#EA80FC';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Menacing glowing eyes
  let eyeDx = 0, eyeDy = 0;
  if (monster.facing === 'left') eyeDx = -s * 0.08;
  else if (monster.facing === 'right') eyeDx = s * 0.08;
  else if (monster.facing === 'up') eyeDy = -s * 0.08;
  else if (monster.facing === 'down') eyeDy = s * 0.08;

  const eyeY = cy - r * 0.15 + eyeDy;
  const eyeR = s * 0.10;
  const eyeSpread = s * 0.13;

  // Left Eye
  ctx.beginPath();
  ctx.arc(cx - eyeSpread + eyeDx, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fillStyle = '#FFEA00';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - eyeSpread + eyeDx + (eyeDx * 0.4), eyeY + (eyeDy * 0.4), eyeR * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#D50000';
  ctx.fill();

  // Right Eye
  ctx.beginPath();
  ctx.arc(cx + eyeSpread + eyeDx, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fillStyle = '#FFEA00';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + eyeSpread + eyeDx + (eyeDx * 0.4), eyeY + (eyeDy * 0.4), eyeR * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#D50000';
  ctx.fill();

  ctx.restore();
}

// Particle effects when egg breaks
function createEggCrackEffect(gx, gy) {
  for (let i = 0; i < 16; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 3.8;
    eggCrackParticles.push({
      x: gx + 0.5,
      y: gy + 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      size: 2 + Math.random() * 4,
      color: Math.random() > 0.4 ? '#FFFFFF' : '#E8E4D8',
      life: 0.55
    });
  }
}

function updateAndRenderParticles(dt) {
  for (let i = eggCrackParticles.length - 1; i >= 0; i--) {
    const p = eggCrackParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 8 * dt; // gravity
    p.life -= dt;
    if (p.life <= 0) {
      eggCrackParticles.splice(i, 1);
      continue;
    }
    const px = (p.x - cameraX) * TILE_SIZE;
    const py = (p.y - cameraY) * TILE_SIZE;
    ctx.fillStyle = p.color;
    ctx.fillRect(px, py, p.size, p.size);
  }
}

// 8d. Golden Key ('K')
function drawKey(px, py, s) {
  const cx = px + s / 2;
  const cy = py + s / 2;

  ctx.save();

  // Subtle floating shadow
  ctx.beginPath();
  ctx.ellipse(cx, py + s * 0.78, s * 0.38, s * 0.09, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  // Golden metallic key lying horizontally
  const bowX = cx - s * 0.20;
  const bowY = cy;
  const outerR = s * 0.20;
  const innerR = s * 0.10;

  const goldGrad = ctx.createLinearGradient(px, py, px + s, py + s);
  goldGrad.addColorStop(0, '#FFF59D');
  goldGrad.addColorStop(0.3, '#FFD700');
  goldGrad.addColorStop(0.7, '#FFA000');
  goldGrad.addColorStop(1, '#FF6F00');

  // Key Bow
  ctx.beginPath();
  ctx.arc(bowX, bowY, outerR, 0, Math.PI * 2);
  ctx.arc(bowX, bowY, innerR, 0, Math.PI * 2, true);
  ctx.fillStyle = goldGrad;
  ctx.fill();

  ctx.strokeStyle = '#B78103';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Collar between bow and shaft
  ctx.fillStyle = '#FFE082';
  ctx.fillRect(bowX + outerR - 1, cy - s * 0.08, s * 0.06, s * 0.16);

  // Key shaft extending to the right
  const shaftX = bowX + outerR + s * 0.04;
  const shaftW = s * 0.38;
  const shaftH = Math.max(3, s * 0.09);
  const shaftY = cy - shaftH / 2;

  ctx.fillStyle = goldGrad;
  ctx.fillRect(shaftX, shaftY, shaftW, shaftH);
  ctx.strokeStyle = '#B78103';
  ctx.lineWidth = 1;
  ctx.strokeRect(shaftX, shaftY, shaftW, shaftH);

  // Key teeth pointing downward
  const bitX1 = shaftX + shaftW - s * 0.16;
  const bitX2 = shaftX + shaftW - s * 0.06;
  const bitW = Math.max(2, s * 0.06);
  const bitH1 = s * 0.16;
  const bitH2 = s * 0.12;

  ctx.fillRect(bitX1, shaftY + shaftH - 1, bitW, bitH1);
  ctx.strokeRect(bitX1, shaftY + shaftH - 1, bitW, bitH1);

  ctx.fillRect(bitX2, shaftY + shaftH - 1, bitW, bitH2);
  ctx.strokeRect(bitX2, shaftY + shaftH - 1, bitW, bitH2);

  // Shiny highlight along the shaft
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillRect(shaftX + 2, shaftY + 1, shaftW - 4, 1.2);

  ctx.restore();
}

// 8e. Blue Locked Wall / Safe ('B')
function drawSafe(px, py, s) {
  ctx.save();

  // Dark steel outer border
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(px, py, s, s);

  // Blue metallic plate
  const bevel = Math.max(2, Math.floor(s * 0.08));
  ctx.fillStyle = '#1E3A8A';
  ctx.fillRect(px + bevel, py + bevel, s - bevel * 2, s - bevel * 2);

  // Cyan-blue metallic bevel highlights
  ctx.fillStyle = '#60A5FA';
  ctx.fillRect(px, py, s, bevel); // Top highlight
  ctx.fillRect(px, py, bevel, s); // Left highlight
  ctx.fillStyle = '#091E42';
  ctx.fillRect(px, py + s - bevel, s, bevel); // Bottom shadow
  ctx.fillRect(px + s - bevel, py, bevel, s); // Right shadow

  // Recessed inner door panel
  const inset = Math.max(4, Math.floor(s * 0.16));
  const innerW = s - inset * 2;
  const innerH = s - inset * 2;
  const doorGrad = ctx.createLinearGradient(px + inset, py + inset, px + s - inset, py + s - inset);
  doorGrad.addColorStop(0, '#2563EB');
  doorGrad.addColorStop(0.5, '#1D4ED8');
  doorGrad.addColorStop(1, '#1E3A8A');
  ctx.fillStyle = doorGrad;
  ctx.fillRect(px + inset, py + inset, innerW, innerH);

  // Vault inner border
  ctx.strokeStyle = '#172554';
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.strokeRect(px + inset, py + inset, innerW, innerH);

  // 4 Corner Rivets
  const boltSize = Math.max(2, Math.floor(s * 0.07));
  const bOff = Math.max(2, Math.floor(s * 0.09));
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(px + bOff, py + bOff, boltSize, boltSize);
  ctx.fillRect(px + s - bOff - boltSize, py + bOff, boltSize, boltSize);
  ctx.fillRect(px + bOff, py + s - bOff - boltSize, boltSize, boltSize);
  ctx.fillRect(px + s - bOff - boltSize, py + s - bOff - boltSize, boltSize, boltSize);

  // Center combination lock / keyhole vault dial
  const cx = px + s / 2;
  const cy = py + s / 2;
  const dialR = s * 0.20;

  // Dial outer ring (metallic silver)
  ctx.beginPath();
  ctx.arc(cx, cy, dialR, 0, Math.PI * 2);
  ctx.fillStyle = '#94A3B8';
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Dial inner circle (brass gold)
  ctx.beginPath();
  ctx.arc(cx, cy, dialR * 0.65, 0, Math.PI * 2);
  ctx.fillStyle = '#F59E0B';
  ctx.fill();

  // Keyhole
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(cx, cy - dialR * 0.15, dialR * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - dialR * 0.12, cy - dialR * 0.1);
  ctx.lineTo(cx + dialR * 0.12, cy - dialR * 0.1);
  ctx.lineTo(cx + dialR * 0.18, cy + dialR * 0.35);
  ctx.lineTo(cx - dialR * 0.18, cy + dialR * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Particle burst when safe unlocks and turns into diamond
function createSafeUnlockEffect(gx, gy) {
  const colors = ['#67E8F9', '#38BDF8', '#FDE047', '#FFFFFF', '#60A5FA', '#F59E0B'];
  for (let i = 0; i < 22; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 4.5;
    eggCrackParticles.push({
      x: gx + 0.5,
      y: gy + 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      size: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0.65
    });
  }
}

// Unlock all safes across the map into diamonds
function unlockSafes() {
  let count = 0;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (grid[y][x] === SAFE) {
        grid[y][x] = DIAMOND;
        createSafeUnlockEffect(x, y);
        count++;
      }
    }
  }
  playUnlockSound();
}

// 9. Player character (Repton)
function drawPlayer(px, py, s, facing = 'down', isMoving = false, walkCycle = 0) {
  if (spritesReady) {
    const bob = isMoving ? Math.sin(walkCycle * 2) * (s * 0.05) : 0;
    ctx.save();
    if (facing === 'left') {
      ctx.translate(px + s, py);
      ctx.scale(-1, 1);
      drawSprite('player', 0, bob, s, s);
    } else {
      drawSprite('player', px, py + bob, s, s);
    }
    ctx.restore();
    return;
  }

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

  ctx.imageSmoothingEnabled = false;
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
          drawWall(px, py, TILE_SIZE, gx, gy);
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
        case EGG:
          drawEgg(px, py, TILE_SIZE);
          break;
        case KEY:
          drawKey(px, py, TILE_SIZE);
          break;
        case SAFE:
          drawSafe(px, py, TILE_SIZE);
          break;
      }
    }
  }

  // Render pushed rock or egg sliding smoothly
  if (pushedRock) {
    const rx = pushedRock.fromX + (pushedRock.toX - pushedRock.fromX) * pushedRock.progress;
    const ry = pushedRock.fromY + (pushedRock.toY - pushedRock.fromY) * pushedRock.progress;
    const rpx = (rx - cameraX) * TILE_SIZE;
    const rpy = (ry - cameraY) * TILE_SIZE;
    if (pushedRock.type === EGG) {
      drawEgg(rpx, rpy, TILE_SIZE);
    } else {
      drawRock(rpx, rpy, TILE_SIZE);
    }
  }

  // Render hatching eggs (cracking open during the 1.5s delay)
  for (const he of hatchingEggs) {
    const hpx = (he.x - cameraX) * TILE_SIZE;
    const hpy = (he.y - cameraY) * TILE_SIZE;
    drawHatchingEgg(hpx, hpy, TILE_SIZE, he);
  }

  // Render active monsters
  for (const m of monsters) {
    const mpx = (m.visualX - cameraX) * TILE_SIZE;
    const mpy = (m.visualY - cameraY) * TILE_SIZE;
    drawMonster(mpx, mpy, TILE_SIZE, m);
  }

  // Render egg crack particles
  updateAndRenderParticles(0.016);

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

function playEggCrackSound() {
  try {
    const actx = getAudioCtx();
    const now = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(820, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) { }
}

function playMonsterSquishSound() {
  try {
    const actx = getAudioCtx();
    const now = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  } catch (e) { }
}

function playUnlockSound() {
  try {
    const actx = getAudioCtx();
    const now = actx.currentTime;

    // Mechanical click 1
    const click1 = actx.createOscillator();
    const gClick1 = actx.createGain();
    click1.type = 'square';
    click1.frequency.setValueAtTime(1400, now);
    click1.frequency.exponentialRampToValueAtTime(300, now + 0.03);
    gClick1.gain.setValueAtTime(0.18, now);
    gClick1.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    click1.connect(gClick1);
    gClick1.connect(actx.destination);
    click1.start(now);
    click1.stop(now + 0.03);

    // Mechanical click 2
    const click2 = actx.createOscillator();
    const gClick2 = actx.createGain();
    click2.type = 'square';
    click2.frequency.setValueAtTime(1800, now + 0.06);
    click2.frequency.exponentialRampToValueAtTime(400, now + 0.09);
    gClick2.gain.setValueAtTime(0.2, now + 0.06);
    gClick2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    click2.connect(gClick2);
    gClick2.connect(actx.destination);
    click2.start(now + 0.06);
    click2.stop(now + 0.09);

    // Ascending celebratory chime
    const notes = [698.46, 880.00, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      const t = now + 0.11 + idx * 0.07;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch (e) { }
}

// ===== MONSTER AI & PATHFINDING =====
const MONSTER_MOVE_DURATION = 0.22; // ~4.5 tiles/sec, smooth pursuit
const MONSTER_STEP_INTERVAL = 0.28; // time between steps

function spawnMonster(x, y) {
  monsters.push({
    id: Date.now() + Math.random(),
    x,
    y,
    visualX: x,
    visualY: y,
    startX: x,
    startY: y,
    targetX: x,
    targetY: y,
    isMoving: false,
    moveProgress: 0,
    facing: 'down',
    cooldown: 0.25
  });
}

function findMonsterPath(fromX, fromY, toX, toY) {
  if (Math.abs(fromX - toX) + Math.abs(fromY - toY) === 1) {
    return { dx: toX - fromX, dy: toY - fromY };
  }

  const queue = [{ x: fromX, y: fromY, path: [] }];
  const visited = new Set([`${fromX},${fromY}`]);
  const maxDepth = 45;

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
  ];

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.path.length >= maxDepth) break;

    for (const d of dirs) {
      const nx = curr.x + d.dx;
      const ny = curr.y + d.dy;
      const key = `${nx},${ny}`;

      if (nx === toX && ny === toY) {
        return curr.path.length > 0 ? curr.path[0] : d;
      }

      if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && !visited.has(key)) {
        visited.add(key);
        // Monsters can ONLY walk through EMPTY cells!
        if (grid[ny][nx] === EMPTY) {
          queue.push({
            x: nx,
            y: ny,
            path: curr.path.length === 0 ? [d] : curr.path
          });
        }
      }
    }
  }

  return null;
}

function updateMonsters(dt) {
  if (gameState !== 'playing') return;

  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];

    if (m.isMoving) {
      m.moveProgress += dt / MONSTER_MOVE_DURATION;
      if (m.moveProgress >= 1) {
        m.moveProgress = 1;
        m.x = m.targetX;
        m.y = m.targetY;
        m.visualX = m.x;
        m.visualY = m.y;
        m.isMoving = false;
        m.cooldown = MONSTER_STEP_INTERVAL;

        if (player.x === m.x && player.y === m.y) {
          gameState = 'dead';
          playDeathSound();
          showMessage('ROZTRHÁN PŘÍŠEROU! 👾', 'lose');
          return;
        }
      } else {
        m.visualX = m.startX + (m.targetX - m.startX) * m.moveProgress;
        m.visualY = m.startY + (m.targetY - m.startY) * m.moveProgress;

        const dist = Math.hypot(m.visualX - player.visualX, m.visualY - player.visualY);
        if (dist < 0.55) {
          gameState = 'dead';
          playDeathSound();
          showMessage('ROZTRHÁN PŘÍŠEROU! 👾', 'lose');
          return;
        }
      }
    } else {
      m.cooldown = (m.cooldown || 0) - dt;
      if (m.cooldown <= 0) {
        // Path towards player through EMPTY cells
        let step = findMonsterPath(m.x, m.y, player.x, player.y);

        // If no direct path to player, wander among adjacent EMPTY cells
        if (!step) {
          const emptyNeighbors = [];
          const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
          for (const d of dirs) {
            const nx = m.x + d.dx;
            const ny = m.y + d.dy;
            if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && grid[ny][nx] === EMPTY) {
              const occupied = monsters.some(other => other !== m && ((other.x === nx && other.y === ny) || (other.isMoving && other.targetX === nx && other.targetY === ny)));
              if (!occupied) emptyNeighbors.push(d);
            }
          }
          if (emptyNeighbors.length > 0) {
            step = emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];
          }
        }

        if (step) {
          const nx = m.x + step.dx;
          const ny = m.y + step.dy;
          const occupied = monsters.some(other => other !== m && ((other.x === nx && other.y === ny) || (other.isMoving && other.targetX === nx && other.targetY === ny)));
          if (!occupied && grid[ny][nx] === EMPTY) {
            m.isMoving = true;
            m.moveProgress = 0;
            m.startX = m.x;
            m.startY = m.y;
            m.targetX = nx;
            m.targetY = ny;
            if (step.dx === 1) m.facing = 'right';
            else if (step.dx === -1) m.facing = 'left';
            else if (step.dy === 1) m.facing = 'down';
            else if (step.dy === -1) m.facing = 'up';
          }
        }
      }
    }
  }
}

function updateHatchingEggs(dt) {
  if (gameState !== 'playing') return;

  for (let i = hatchingEggs.length - 1; i >= 0; i--) {
    const he = hatchingEggs[i];
    he.timeLeft -= dt;

    // Small ambient cracking particles during the 1.5s gestation
    if (Math.random() < 0.15) {
      eggCrackParticles.push({
        x: he.x + 0.3 + Math.random() * 0.4,
        y: he.y + 0.4 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 1.8,
        size: 1.5 + Math.random() * 2,
        color: Math.random() > 0.5 ? '#FFFFFF' : '#E8E4D8',
        life: 0.35
      });
    }

    if (he.timeLeft <= 0) {
      const hx = he.x;
      const hy = he.y;
      hatchingEggs.splice(i, 1);
      spawnMonster(hx, hy);
      createEggCrackEffect(hx, hy);

      // If player is on the same tile when the monster bursts out:
      if (player.x === hx && player.y === hy) {
        gameState = 'dead';
        playDeathSound();
        showMessage('ROZTRHÁN PŘÍŠEROU! 👾', 'lose');
      }
    }
  }
}

// ===== PHYSICS ENGINE =====
function doPhysics() {
  if (gameState !== 'playing') return;

  const newFalling = new Set();
  let rockLanded = false;

  // Process rocks and eggs bottom-to-top, left-to-right
  for (let y = MAP_H - 2; y >= 0; y--) {
    for (let x = 0; x < MAP_W; x++) {
      const item = grid[y][x];
      if (item !== ROCK && item !== EGG) continue;

      const key = `${x},${y}`;
      const isAlreadyFalling = fallingRocks.has(key);

      if (y + 1 < MAP_H) {
        const below = grid[y + 1][x];
        const monsterBelowIdx = monsters.findIndex(m =>
          (m.x === x && m.y === y + 1) ||
          (m.isMoving && m.targetX === x && m.targetY === y + 1)
        );

        if (below === EMPTY) {
          // Check if player is directly underneath this rock/egg
          const isPlayerUnder = (player.x === x && player.y === y + 1);
          const isPlayerMovingInto = (player.isMoving && player.targetX === x && player.targetY === y + 1);
          const isPlayerMovingAway = (player.isMoving && player.startX === x && player.startY === y + 1 && player.targetX !== x);

          if (isPlayerUnder || isPlayerMovingInto) {
            if (isPlayerMovingAway) {
              grid[y + 1][x] = item;
              grid[y][x] = EMPTY;
              newFalling.add(`${x},${y + 1}`);
              continue;
            }

            if (isAlreadyFalling) {
              gameState = 'dead';
              playDeathSound();
              showMessage('ROZDRCEN! 💀', 'lose');
              return;
            } else {
              continue;
            }
          }

          // Check if falling onto a monster (including moving monsters) -> SQUASH IT!
          if (monsterBelowIdx !== -1 && isAlreadyFalling) {
            monsters.splice(monsterBelowIdx, 1);
            playMonsterSquishSound();
            createEggCrackEffect(x, y + 1);
            grid[y][x] = EMPTY;
            grid[y + 1][x] = DIAMOND; // Classic reward: monster turns into diamond
            totalDiamonds++;
            document.getElementById('total').textContent = totalDiamonds;
            continue;
          }

          // Check if falling onto an egg currently hatching -> SQUASH IT!
          const hatchingBelowIdx = hatchingEggs.findIndex(he => he.x === x && he.y === y + 1);
          if (hatchingBelowIdx !== -1 && isAlreadyFalling) {
            hatchingEggs.splice(hatchingBelowIdx, 1);
            playMonsterSquishSound();
            createEggCrackEffect(x, y + 1);
            grid[y][x] = EMPTY;
            grid[y + 1][x] = DIAMOND;
            totalDiamonds++;
            document.getElementById('total').textContent = totalDiamonds;
            continue;
          }

          // Item falls into empty space
          grid[y + 1][x] = item;
          grid[y][x] = EMPTY;
          newFalling.add(`${x},${y + 1}`);
          continue;
        }

        // Slide off another rock, diamond, or egg
        if (below === ROCK || below === DIAMOND || below === EGG) {
          // Slide left
          if (x > 0 && grid[y][x - 1] === EMPTY && grid[y + 1][x - 1] === EMPTY) {
            const playerBlocked = (player.x === x - 1 && player.y === y) ||
              (player.isMoving && player.targetX === x - 1 && player.targetY === y) ||
              (player.x === x - 1 && player.y === y + 1) ||
              (player.isMoving && player.targetX === x - 1 && player.targetY === y + 1);
            if (!playerBlocked) {
              grid[y][x - 1] = item;
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
              grid[y][x + 1] = item;
              grid[y][x] = EMPTY;
              newFalling.add(`${x + 1},${y}`);
              continue;
            }
          }
        }

        // Slide off rounded wall (Top-Left): rolls LEFT
        if (below === WALL_TL) {
          if (x > 0 && grid[y][x - 1] === EMPTY && grid[y + 1][x - 1] === EMPTY) {
            const playerBlocked = (player.x === x - 1 && player.y === y) ||
              (player.isMoving && player.targetX === x - 1 && player.targetY === y) ||
              (player.x === x - 1 && player.y === y + 1) ||
              (player.isMoving && player.targetX === x - 1 && player.targetY === y + 1);
            if (!playerBlocked) {
              grid[y][x - 1] = item;
              grid[y][x] = EMPTY;
              newFalling.add(`${x - 1},${y}`);
              continue;
            }
          }
        }

        // Slide off rounded wall (Top-Right): rolls RIGHT
        if (below === WALL_TR) {
          if (x + 1 < MAP_W && grid[y][x + 1] === EMPTY && grid[y + 1][x + 1] === EMPTY) {
            const playerBlocked = (player.x === x + 1 && player.y === y) ||
              (player.isMoving && player.targetX === x + 1 && player.targetY === y) ||
              (player.x === x + 1 && player.y === y + 1) ||
              (player.isMoving && player.targetX === x + 1 && player.targetY === y + 1);
            if (!playerBlocked) {
              grid[y][x + 1] = item;
              grid[y][x] = EMPTY;
              newFalling.add(`${x + 1},${y}`);
              continue;
            }
          }
        }

        // Landed!
        if (isAlreadyFalling) {
          rockLanded = true;
          // EGG CRACKS AND HATCHES AFTER 1.5s DELAY!
          if (item === EGG) {
            grid[y][x] = EMPTY;
            playEggCrackSound();
            createEggCrackEffect(x, y);
            hatchingEggs.push({ x, y, timeLeft: EGG_HATCH_DELAY, totalTime: EGG_HATCH_DELAY });
            continue;
          }
        }
      } else {
        if (isAlreadyFalling) {
          rockLanded = true;
          if (item === EGG) {
            grid[y][x] = EMPTY;
            playEggCrackSound();
            createEggCrackEffect(x, y);
            hatchingEggs.push({ x, y, timeLeft: EGG_HATCH_DELAY, totalTime: EGG_HATCH_DELAY });
            continue;
          }
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

  if (target === KEY) {
    grid[ny][nx] = EMPTY;
    unlockSafes();
    player.walkCycle += 1.8;
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

  if (target === ROCK || target === EGG) {
    if (dy !== 0) return { canMove: false }; // can't push vertically
    if (fallingRocks.size > 0) return { canMove: false }; // can't push while objects are falling
    // Can't push an object that has an empty gap below it (it must fall!)
    if (ny + 1 < MAP_H && grid[ny + 1][nx] === EMPTY) return { canMove: false };
    const bx = nx + dx;
    if (bx < 0 || bx >= MAP_W) return { canMove: false };
    if (grid[ny][bx] !== EMPTY) return { canMove: false };
    return { canMove: true, isPush: true, bx, by: ny, type: target };
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

  // Under rock or egg moving down -> crushed immediately!
  const itemAbove = (player.y > 0 && (grid[player.y - 1][player.x] === ROCK || grid[player.y - 1][player.x] === EGG));
  if (itemAbove && dy === 1) {
    const nx = player.x;
    const ny = player.y + 1;
    const aboveType = grid[player.y - 1][player.x];
    grid[player.y - 1][player.x] = EMPTY;
    grid[ny][nx] = aboveType;
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
      progress: 0,
      type: check.type || ROCK
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
  } else if (target === KEY) {
    grid[ny][nx] = EMPTY;
    unlockSafes();
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
        const pushedType = pushedRock.type || ROCK;
        grid[ry][rx] = pushedType;
        pushedRock = null;

        // Rock or egg pushed over gap must fall immediately
        if (ry + 1 < MAP_H && grid[ry + 1][rx] === EMPTY) {
          fallingRocks.add(`${rx},${ry}`);
          doPhysics();
          return;
        }
        // Pushed onto another rock, diamond, egg or rounded wall -> check roll
        if (ry + 1 < MAP_H && (grid[ry + 1][rx] === ROCK || grid[ry + 1][rx] === DIAMOND || grid[ry + 1][rx] === EGG || grid[ry + 1][rx] === WALL_TL || grid[ry + 1][rx] === WALL_TR)) {
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

  showMessage(`VÍTĚZSTVÍ! 🏆<div class="sub">Level dokončen!${btnHtml}<div style="margin-top:6px;font-size:14px;color:#aaa;">(stiskni Enter nebo Mezerník)</div></div>`, 'win');
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
      if (ch === 'D' || ch === 'B') totalDiamonds++;
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
  monsters = [];
  hatchingEggs = [];
  eggCrackParticles = [];

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

  // Next level on Enter or Space when level is completed
  if (gameState === 'won') {
    if (e.key === 'Enter' || e.code === 'Enter' || e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      nextLevel();
      return;
    }
  }

  // Quick retry on Enter or Space when dead
  if (gameState === 'dead') {
    if (e.key === 'Enter' || e.code === 'Enter' || e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      restartGame();
      return;
    }
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
    updateMonsters(dt);
    updateHatchingEggs(dt);
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
