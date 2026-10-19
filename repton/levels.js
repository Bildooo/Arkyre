// ===== TILE CONSTANTS =====
const EMPTY = 0;
const EARTH = 1;
const WALL = 2; // Classic Red Brick ('W')
const DIAMOND = 3; // Diamond ('D')
const ROCK = 4; // Boulder / Rock ('R')
const WALL_TL = 5; // Rounded top-left corner ('1', '[', '/')
const WALL_TR = 6; // Rounded top-right corner ('2', ']', '\')
const WALL_BL = 7; // Rounded bottom-left corner ('3', '{')
const WALL_BR = 8; // Rounded bottom-right corner ('4', '}')
const WALL_STEEL = 9; // Metal / Steel Tech Wall ('M')
const WALL_STONE = 10; // Granite / Dungeon Cobblestone Wall ('S')
const WALL_SANDSTONE = 11; // Golden Egyptian / Aztec Sandstone Wall ('G')

// Helper to determine if a tile is any wall type
function isWall(tile) {
  return tile === WALL ||
    tile === WALL_TL || tile === WALL_TR || tile === WALL_BL || tile === WALL_BR ||
    tile === WALL_STEEL || tile === WALL_STONE || tile === WALL_SANDSTONE;
}

// Character map for level parsing
const CHAR_MAP = {
  'W': WALL,
  'Z': EARTH,
  '.': EMPTY,
  'D': DIAMOND,
  'R': ROCK,
  'P': EMPTY,
  'Q': WALL_TL,
  '[': WALL_TL,
  '/': WALL_TL,
  'E': WALL_TR,
  ']': WALL_TR,
  '\\': WALL_TR,
  '3': WALL_BL,
  '{': WALL_BL,
  '4': WALL_BR,
  '}': WALL_BR,
  'M': WALL_STEEL,
  'm': WALL_STEEL,
  'S': WALL_STONE,
  's': WALL_STONE,
  'G': WALL_SANDSTONE,
  'g': WALL_SANDSTONE
};

// ===== LEVEL DEFINITIONS =====
const LEVELS = [
  {
    id: 1,
    name: "1. Tréninková komora (Malý level)",
    width: 6,
    height: 6,
    map: [
      'WWWWWW', //  0
      'WWRWWW', //  0
      'W.P..W', //  0
      'W.D..W', //  0
      'W.D..W', //  0
      'WWWWWW', //  0
    ]
  },
  {
    id: 2,
    name: "2. Starobylá krypta (Střední level)",
    width: 10,
    height: 10,
    map: [
      'WWWWWWWWWW', //  0
      'WZZZZZZZZW', //  0
      'WZDZZPZZDW', //  0
      'WZZZZZZZZW', //  0
      'WZZZZZZZZW', //  0
      'WZZZZZZZZW', //  0
      'WZZZZZZZZW', //  0
      'WZZZZZZZZW', //  0
      'WZZZZZZZZW', //  0
      'WWWWWWWWWW', //  0      
    ]
  },
  {
    id: 3,
    name: "3. Repton — Originální mapa (32x32)",
    width: 32,
    height: 32,
    map: [
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  0 - Horní zeď
      'WWWWWWWWWEEEE..REEEWWEE.D.EWWWWW', //  1
      'WWWWWWEEEEEE...EE..EE...EE.EWWWW', //  2
      'WWWWEE..RR...1WW2EE...E.D.EEWWWW', //  3 - Skála a diamanty nahoře
      'WWWEE...RRR..3WW4.1WW2...E.EWWWW', //  4
      'WWWEPE.RRRR.......3WW4..E.D.EWWW', //  5 - Hráč P na (4, 5)
      'WWEE...RRRR...1W2...EE....E.EWWW', //  6 - Shluk kamenů
      'WWEE....RR...1WWWW2...1W2..E.WWW', //  7
      'WWE..1WW2...E3WWWW4..1WWW2..EWWW', //  8 - Zaoblené rohy
      'WW.R.3WW4.E...1WW2...3WWW4..EWWW', //  9
      'WW1W2.....1W2.3WW4....1W2..D.WWW', // 10
      'WW3W4..D..3W4.....1W2.3W4.WWWWWW', // 11
      'WWMM..E....EE..R..3W4.1W2.E.RWWW', // 12 - Kovové zdi (M)
      'WWMM..1WW2..1WWWW2....3W4.WWWWWW', // 13
      'WWD1WWWWWWWWWWWWWWWW2.....WWWWWW', // 14 - Zvlněná centrální zeď
      'WWWWWWWWWWWWWWWWWWWW4..D..WWWWWW', // 15
      'WWEE..E...E...E.....1WWWWWWEEWWW', // 16
      'WWE.R...R...RRRRRR..3WWWW4EEEWWW', // 17 - Řada kamenů RRRRRR
      'WWEE..R...E.....R.R.EE..1WWEEWWW', // 18
      'WWEEE...E..1WWWW2.R.EE..3WW2EWWW', // 19
      'WWEE.D..E..3WWWW4...EE....1W2WWW', // 20 - Diamant
      'WWSSSEEE..1WWWWWW2.D.EE...3W4WWW', // 21 - Kamenné zdi (S)
      'WWSSSEEE..3WWWWWW4EE.EE....1WWWW', // 22
      'WWEE.D.EE...1WW2....EE.....3WWWW', // 23
      'WWEE..EE.R..3WW4.R.EE...1W2.EWWW', // 24
      'WWEEE..1WW2.....1WW2.D..3W4.EWWW', // 25
      'WWEE.D.3WW4..R..3WW4..1W2...EWWW', // 26
      'WWGGGEEE....1W2......1WW4..E.WWW', // 27 - Pískovcové zdi (G)
      'WWGGGE.R....3WWWWWW2.3WW2..E.WWW', // 28
      'WWEEE..1WW2.1WWWWWW4..3W4.D.EWWW', // 29
      'WWWWEE.3WW4.3WWWWWW4....1WW2EWWW', // 30
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'  // 31 - Spodní zeď
    ]
  }
];
