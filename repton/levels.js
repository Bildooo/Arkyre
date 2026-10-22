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
  '1': WALL_TL,
  '[': WALL_TL,
  '/': WALL_TL,
  'E': WALL_TR,
  '2': WALL_TR,
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
    width: 7,
    height: 6,
    map: [
      'WWWWWWW', //  0
      'WWWRWWW', //  0
      'WDDPDDW', //  0
      'W..R..W', //  0
      'W.RRR.W', //  0
      'WWWWWWW', //  0
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
    width: 36,
    height: 50,
    map: [
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  0 - Horní zeď
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  0 - Horní zeď
      'WWWWWWWWWWZZZZZZRZZZDZZZZZWWWWWWWWWW', //  0 - Horní zeď
      'WWWWWWWZZZZZZWWZ12ZZZZZZZZZZZWWWWWWW', //  0 - Horní zeď
      'WWWWWZZZZZWZZWWWWWZZZZZDZZZZZZZWWWWW', //  0 - Horní zeď
      'WWWWZZZZZWWWZWWWZZZWWZZZZZDZZZZZWWWW', //  0 - Horní zeď
      'WWWWZZPZWWWWZWWZZZZWWZZZZZZZZZZZWWWW', //  0 - Horní zeď
      'WWWZZZZZZZZWZWWZZZZZZWWZZZZZDZZZZWWW', //  0 - Horní zeď
      'WWWZZZZZZZWRZWWWWZZZZWWZWWZZZZZZZWWW', //  0 - Horní zeď
      'WWWZZZZZZWW2ZZZWWWZZZZZWWWWZZZZZDWWW', //  0 - Horní zeď
      'WWZZZZZZWZWWWWZDWWWZZZZWWWWZZZZZZZWw', //  0 - Horní zeď
      'WWZR12ZWZZZWW4ZZZWWZZZZZ34Z4ZZZZZZWW', //  0 - Horní zeď
      'WWZRWWZWZZZWW4ZZZWWZZZZZ34Z12ZZZZZWW', //  0 - Horní zeď
      'WWZZWWWDZZZ34ZZZZ34ZZDZZZZZ34ZDWWWWW', //  0 - Horní zeď
      'WW2Z34ZWZZZZZZZZZZZWZZZZZ12ZZZZ3WWWW', //  0 - Horní zeď
      'WW4ZZZZZWZZZZZ12ZZ1W2ZZZZ34ZZZZR..WW', //  0 - Horní zeď
      'WWZZZZZZZZZZZDWW2ZWW4ZZZZZWZZZ1W2.WW', //  0 - Horní zeď
      'WWDZ12ZZ12ZZ1WDW4DWWZZZZZZWWZZWWW.WW', //  0 - Horní zeď
      'WWWWWWWWWWWWWWZZZWWWZWWZZ1WWWWD...WW', //  0 - Horní zeď
      'WWWWDZ34ZZ34ZZZZZ3W4Z34ZZW4D34...1WW', //  0 - Horní zeď
      'WWZZZZZZZZZZZZZZZZZZZZZWW4ZZZ...1WWW', //  0 - Horní zeď
      'WWZZZZZRZZZZZZRRRRRRZZZW4ZZZ...1WWWW', //  0 - Horní zeď
      'WWZZZZZZZZRZZZZZZZZZRZRWZZZ...14.WWW', //  0 - Horní zeď
      'WWZZRZZZZZZZZZZZZZZZRZZWZZ...14..DWW', //  0 - Horní zeď
      'WWZZZZZRZZZZZZZWWWWWWWZWDZ..14ZZZZWW', //  0 - Horní zeď
      'WWZZZZZZZZWWWWWRWWWWWRWWZ..14ZZZZZWW', //  0 - Horní zeď
      'WWDZZZZZZZZWRWZZZZZZZZDWZ.1W..WW..WW', //  0 - Horní zeď
      'WWWWWWWWWWZZZZZWZZZZZZZWZ.34D.34.WWW', //  0 - Horní zeď
      'WWWZZDZZZWWWWWWWZZZZZZZWZ...12...WWW', //  0 - Horní zeď
      'WWWZZZZZZZWWWWWWRZZZZWWZZ...34...WWW', //  0 - Horní zeď
      'WWWWZZZZWZZWRWZZZZZZWZZZZ.......WWWW', //  0 - Horní zeď
      'WWWWDZZZWZZZZZZWZZZWZZZZZ.......WWWW', //  0 - Horní zeď      
      'WWWWWZZZWZWWWWWWWWWZZZZ12.12...WWWWW', //  0 - Horní zeď
      'WWWWWWWZZZZWRWZZZZZZZZZWW.WW.WWWWWWW', //  0 - Horní zeď
      'WWWWWWWWWWZZZZZ12ZZZZZZWWDWWWWWWWWWW', //  0 - Horní zeď
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  0 - Horní zeď
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  0 - Horní zeď
    ]
  }
];
