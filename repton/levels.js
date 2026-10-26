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
const EGG = 12; // Egg / Vejce ('O', 'V')
const KEY = 13; // Key / Klíč ('K')
const SAFE = 14; // Blue locked wall / Sejf ('B')

// Helper to determine if a tile is any wall type
function isWall(tile) {
  return tile === WALL ||
    tile === WALL_TL || tile === WALL_TR || tile === WALL_BL || tile === WALL_BR ||
    tile === WALL_STEEL || tile === WALL_STONE || tile === WALL_SANDSTONE ||
    tile === SAFE;
}

// Character map for level parsing
const CHAR_MAP = {
  'W': WALL,
  'Z': EARTH,
  '.': EMPTY,
  'D': DIAMOND,
  'R': ROCK,
  'P': EMPTY,
  'O': EGG,
  'o': EGG,
  'V': EGG,
  'v': EGG,
  '0': EGG,
  'K': KEY,
  'k': KEY,
  'B': SAFE,
  'b': SAFE,
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
      'W..P..W', //  0
      'WD....W', //  0
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
      'WD..RPZZZW', //  0
      'W..1WWWWWW', //  0      
      'W.1WWWWWWW', //  0      
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
      'WWWWWWWZZZZZZ12Z12ZZZZZZZZZZZWWWWWWW', //  0 - Horní zeď
      'WWWWWZZZZZWZZWWW34ZZZZZDZZZZZZZWWWWW', //  0 - Horní zeď
      'WWWWZZZZZWWWZWWWZZZ12ZZZZZDZZZZZWWWW', //  0 - Horní zeď
      'WWWWZZPZWWWWZWWZZZZ34ZZZZZZZZZZZWWWW', //  0 - Horní zeď
      'WWWZZZZZZZZWZWWZZZZZZ12ZZZZZDZZZZWWW', //  0 - Horní zeď
      'WWWZZZZZZZWRZWW12ZZZZ34Z12ZZZZZZZWWW', //  0 - Horní zeď
      'WWWZZZZZZW12ZZZWW2ZZZZZ1WW2ZZZZZDWWW', //  0 - Horní zeď
      'WWZZZZZZWZ3WW2ZD1W2ZZZZ3WW4ZZZZZZZWW', //  0 - Horní zeď
      'WWZR12ZWZZZ3W4ZZWW4ZZZZZ34Z12ZZZZZWW', //  0 - Horní zeď
      'WWZRWWZWZZZ34ZZZ34ZZZZZZZZZ34ZZZZZWW', //  0 - Horní zeď
      'WWZZWWWDZZZZZZZZZZZZZDZZZZZZZZDWWWWW', //  0 - Horní zeď
      'WW2Z34ZWZZZZZZZZZZZWZZZZZ12ZZZZ3WWWW', //  0 - Horní zeď
      'WW4ZZZZZWZZZZZ12ZZ1W2ZZZZ34ZZZZR..WW', //  0 - Horní zeď
      'WWZZZZZZZZZZZDWW2ZWW4ZZZZZWZZZ1W2.WW', //  0 - Horní zeď
      'WWDZ12ZZ12ZZ1WD34DWWZZZZZZWWZZ3W4.WW', //  0 - Horní zeď
      'WWWWWWWWWWWWWWZZZWWWZ12ZZ1WWWWD...WW', //  0 - Horní zeď
      'WWWWDZ34ZZ34ZZZZZ3W4Z34ZZW4D34...1WW', //  0 - Horní zeď
      'WWZZZZZZZZZZZZZZZZZZZZZWW4ZZZ...1WWW', //  0 - Horní zeď
      'WWZZZZZRZZZZZZRRRRRRZZZW4ZZZ...1WWWW', //  0 - Horní zeď
      'WWZZZZZZZZRZZZZZZZZZRZRWZZZ...14.WWW', //  0 - Horní zeď
      'WWZZRZZZZZZZZZZZZZZZRZZWZZ...14..DWW', //  0 - Horní zeď
      'WWZZZZZRZZZZZZZWWWWWWWZWDZ..14ZZZZWW', //  0 - Horní zeď
      'WWZZZZZZZZWWWWWRWWWWWRWWZ..14ZZZZZWW', //  0 - Horní zeď
      'WWDZZZZZZZZWRWZZZZZZZZDWZ.12..12..WW', //  0 - Horní zeď
      'WWWWWWWWWWZZZZZWZZZZZZZWZ.34D.34.WWW', //  0 - Horní zeď
      'WWWZZDZZZWWWWWWWZZZZZZZWZ...12...WWW', //  0 - Horní zeď
      'WWWZZZZZZZWWWWWWRZZZZWWZZ...34...WWW', //  0 - Horní zeď
      'WWWWZZZZWZZWRWZZZZZZWZZZZ.......WWWW', //  0 - Horní zeď
      'WWWWDZZZWZZZZZZWZZZWZZZZZ.......WWWW', //  0 - Horní zeď      
      'WWWWWZZZWZWWWWWWWWWZZZZ12.12...WWWWW', //  0 - Horní zeď
      'WWWWWWWZZZZWRWZZZZZZZZZ34.34.WWWWWWW', //  0 - Horní zeď
      'WWWWWWWWWWZZZZZ12ZZZZZZWWDWWWWWWWWWW', //  0 - Horní zeď
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  0 - Horní zeď
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  0 - Horní zeď
    ]
  },
  {
    id: 4,
    name: "4. Labyrint s vejci (36x36)",
    width: 36,
    height: 36,
    map: [
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  0
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  1
      'WWZZZZZZZDW..WD.....WRWWWWWWWWWWWZWW', //  2
      'WWZWWWWWZWW.W.W.W..WZZZZZZZZRZZZZZWW', //  3
      'WWZWRWZZZZW....WDW..WZWWWRWWWZWZWZWW', //  4
      'WWZZZWRWWRW..W..O..WZZZZZZZZZZWZWZWW', //  5 - Vejce O na (16, 5)
      'WWWWZWPZZZW....WWW..WZWWWZWWWZWDWZWW', //  6 - Hráč P na (6, 6)
      'WWZZZZ.ZW.WRW....W.WZZZZZZZZRZZZZZWW', //  7
      'WWZWWZWZW..Z..WW...DWZWWWZWZWZWWWZWW', //  8
      'WWZZZZWZW.W.W.WW...WZZZDZZWZWZZZZZWW', //  9
      'WWWZWZZZZ.W.........WZWWWZWZWZWRWZWW', // 10
      'WWZZWZWWW.W.W.R....WZZZZZZZZZZZZZZWW', // 11
      'WWZWWZZZZ.W..WWW....WZZRWZWZWZWZWZWW', // 12
      'WWZZZZWWW.Z...W.Z..WZZZZWZZZZZZZZZWW', // 13
      'WWWWZWWDZWZW...ZZZ..WZZZWZWWWZWWWZWW', // 14
      'WWWWZZZZZZZW..ZZZZZ..WZZWZWWWZWWWZWW', // 15
      'WWWWWWWWWWWW.ZZZRZZZ.ZWZWZWWWZWWWZWW', // 16
      'WWZZZZ.Z.Z.ZZZZZRZZZZZZZDZZZZZZDZZWW', // 17
      'WWZZZZZRZ.Z.WZZRRRZZWZRZWZWWWZWWWZWW', // 18 - Kříž z kamenů R
      'WWWZZZ.Z.Z.Z.WZZRZZWZZZZWZWWWZWWWZWW', // 19
      'WWWWWZZ.W.ZRZ.W.Z.WRZRZZWZWWWZWWWZWW', // 20
      'WWOWWZ.Z.Z.Z..W.Z.WZWZZRWZZZZZZZZZWW', // 21 - Vejce O na (2, 21)
      'WWDZZZZ.Z.Z.Z..ZZZZZZZZZWZDZGZZZZZWW', // 22
      'WWZWRWWWWW.Z.R.ZWZZZDZRZWZZGGGGGGZWW', // 23 - Pískovcové zdi G
      'WWZWRWRDRWZ.ZZZZWZWZWZZZWZZGDZGZZZWW', // 24
      'WWZWZZZRZZ.Z.ZZZWZZZZZZZZZZGGZZZGZWW', // 25
      'WWZZZZZZZZZRZZZZWWZWRZZZWWZGGGGGGZWW', // 26
      'WWWZZZWWWZZZZZDZWWZWWZRRWWZZZZZZZZWW', // 27
      'WWWWWWWDWWZZZZZZWWDWWZZZWWZWWWWWWWWW', // 28
      'WWWDWWWRWZZZZZZZWWWWWWWZWWZZ..RZZZWW', // 29
      'WW..RZZZZZRWWZZZWDDDDDDZWWZW.WWWWDWW', // 30 - Řada diamantů D
      'WWZRZZZWWWRWWWZZWRRRRRRRRWZWWWWWWZWW', // 31 - Řada kamenů R
      'WWZRZWWWWWRWWZZRWZZZZZZZZZZR..ZZZZWW', // 32
      'WWRDZWWWWWZZZZRRWWWW.WWWWWWWW.WWWWWW', // 33
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 34
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'  // 35
    ]
  },
  {
    id: 5,
    name: "5. Pevnost klíčů a trezorů (36x36)",
    width: 36,
    height: 36,
    map: [
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  0
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  1
      'WWWW....WDW.D.D.WWW.D...RZZZZZRZZZWW', //  2
      'WWWD..W.W.WDWWWD.WWDWDWWWWWZWWWWWZWW', //  3
      'WWW.W.W...W.WWDWDWD.W.WDZRWZW.RZWZWW', //  4
      'WWW.W...W.WDWD.D.D.W.DWZZZWZWDRZWZWW', //  5
      'WWD.WWPWW.W.W.W.W.W.W.WZBZWZZZZZWZWW', //  6 - Hráč P na (6, 6), Sejf B na (24, 6)
      'WWW.......WDWD.W.W.D.DWWWZWZWWWWWZWW', //  7
      'WWWW.WW.W.WWWWD.DWDWD.ZZZZZZZZZZZZWW', //  8
      'WW..DW.DW....D.WWDWD.WWWWWWZZZWWWZWW', //  9
      'WW.WWW.WW.WWW.W.W.D.D.W.RZZZWZRDWZWW', // 10
      'WW.......DWDW..D.W.W.DWDRZWRWZR.WZWW', // 11
      'WWWWWWW.WWW.WWWWDWD.W.WZZZWDWZZDWZWW', // 12
      'WW....R..D.D.DWD.W.D.WWWWWWZWWWWWZWW', // 13
      'WW.WW2ZWD.D.W...W.W.W..W.ZZZZZZZZZWW', // 14
      'WW.ZDWZW.WWW.WWD.D.D.DWD.ZZZRZZZZZWW', // 15
      'WWZWWWZWDWDWD.W.WWWW.WD.WZZZZZZZZZWW', // 16
      'WWZZZDWWWD.D.D.W.D.DWD.W.ZZZDZZRZZWW', // 17
      'WWWWWWWWWWWWWWD.D.W.DWDWWWZZZZWZZZWW', // 18
      'WWRKWRRRWWWWWWBBBWWD.W.W.WZWZRZZZWWW', // 19 - Klíč K na (3, 19), 3 Sejfy B na (14..16, 19)
      'WWZZWZDZ..RZZZZZ..W.W.WWDWZZZDZWZZWW', // 20
      'WWZWWWWWZRZZZWZZDZZZZZZZZWZZZZRZDZWW', // 21
      'WWZRWRWWZRZWWWZZZZZZZDZZZWZRZZWZRZWW', // 22
      'WW.D.D..RDZWWWZZZZZZZZZZZWZZWZZZZZWW', // 23
      'WW.W.W.WW.WWZZZZZZZZZZZRZWZZZZRZZZWW', // 24
      'WW.WWWWWWWWZZDZZZZZZZWZZWWZZRZZZZZWW', // 25
      'WWWWZZZWWZZZZZZZZZZDZWZRDWZZZZZRZZWW', // 26
      'WWZZZZZZZZZZZZZZZZZZZWZZZWDZWZZZZZWW', // 27
      'WWZZZZZZZZZZZZZZZZZWWWWWWWWWWWZWWZWW', // 28
      'WWZWZZZZZZZZZZZDWZZWZZR..ZZZRZZWWZWW', // 29
      'WWZWZZZRZZGGGGZZWZZZZRWW.WZZZZWWZZWW', // 30 - Pískovcové zdi G
      'WWZRZWZRZGGDZGZZZZRWZZZZ.WWRZZWWZZWW', // 31
      'WWRRZWZRZGZRRGZZGGZWWZZW.DZZZZZZZZWW', // 32
      'WWZDZWZDZGDZZZZZGGDZZZWW.WZZZWWWWWWW', // 33
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 34
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'  // 35
    ]
  },
  {
    id: 6,
    name: "6. Tim Tyler (36x36)",
    width: 36,
    height: 36,
    map: [
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  0
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  1
      'WW................................WW', //  2
      'WW................................WW', //  3
      'WW.........DDDDD.DDD.D...D........WW', //  4 - TIM v diamantech D
      'WW...........D....D..DD.DD........WW', //  5
      'WW....P......D....D..DDDDD........WW', //  6 - Hráč P na (6, 6)
      'WW...........D....D..D.D.D........WW', //  7
      'WW...........D...DDD.D...D........WW', //  8
      'WW................................WW', //  9
      'WW.......ZZZ.Z.Z.Z...ZZZ.ZZ.......WW', // 10 - TYLER v hlíně Z
      'WW........Z..Z.Z.Z...Z...Z.Z......WW', // 11
      'WW........Z..ZZZ.Z...ZZ..ZZ.......WW', // 12
      'WW........Z...Z..Z...Z...Z.Z......WW', // 13
      'WW........Z...Z..ZZZ.ZZZ.Z.Z......WW', // 14
      'WW................................WW', // 15
      'WW......................WW........WW', // 16
      'WWW.W...WWW......W.W...WWW.W.W.W..WW', // 17
      'WWW.W.WWWDWW..W..W.W..WWD..W.W.W..WW', // 18
      'WWZZWWWBZZZWWWWWWWZZWWZZWWWZWZRZWWWW', // 19 - Sejf B na (7, 19), Kámen R na (30, 19)
      'WWZZWDWWW.OZZZZZWZZZZZZZZWWZZZZZZZWW', // 20 - Vejce O na (10, 20)
      'WWZZWZZRW.WW....W.W.W.W..WW.......WW', // 21 - Kámen R na (7, 21)
      'WWZZWZZZWWW.....W.WBW.W..WW..D....WW', // 22 - Sejf B na (19, 22)
      'WWZWWWWZW.......W.WWW.W...DWW.....WW', // 23
      'WWZWZZZZW.......W.....WWWWWWW..O..WW', // 24 - Vejce O na (31, 24)
      'WWZWZWZWW.......WWW...WB...DWWWB..WW', // 25 - Sejfy B na (23, 25) a (31, 25)
      'WWZZZWWW........WDWWD.W......WW.D.WW', // 26
      'WWZWZWZZ........W.WWWWW.....WW....WW', // 27
      'WWZWZWZZ........W.W.........WW....WW', // 28
      'WWZWZWZZ..........W........WW.....WW', // 29
      'WWZWZBZWRWW..W...WW.R......WW...D.WW', // 30 - Sejf B na (5, 30), Kameny R na (8, 30) a (20, 30)
      'WWZWZWZWZZZZZWZWWWWWZZZZZWW.......WW', // 31
      'WWZWZWWWZWZWZWZZWRWZZWZZZWW.......WW', // 32 - Kámen R na (17, 32)
      'WWZZZZZZZWZZZWWZZZZZWWZZZKB.......WW', // 33 - Klíč K na (25, 33), Sejf B na (26, 33)
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 34
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'  // 35
    ]
  },
  {
    id: 7,
    name: "7. Chrám dvou světů (28x26)",
    width: 28,
    height: 26,
    map: [
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWW', //  0
      'W..R.......WWWWWW.......D.W', //  1
      'W.DDD.D...WWWWWWWW......D.W', //  2
      'W..P.....WWWWWWWWWW.......W', //  3
      'W........WWWWWKWWWW.......W', //  4
      'WWWW.R..BBBBWWWWBBBB.....WW', //  5
      'W.D.....BDDWWWWWWDDB....R.W', //  6
      'W.R.D....WWWWWWWWWW.....D.W', //  7
      'W........WWWWWWWWWW.......W', //  8
      'W...D.....WWWWWWWW........W', //  9
      'W.........DDD.D..........DW', // 10
      'W..........DDD...........DW', // 11
      'W..D.......D.D...........DW', // 12
      'W.........GGGGGG.........DW', // 13
      'W........GGGGGGGGG........W', // 14
      'W.......ZZZGGGZZZZWWW.....W', // 15
      'W......ZZZZGGZZZZZZWWW..D.W', // 16
      'WW....ZZZZGGGZZZZZZZ......W', // 17
      'WW...ZZDDZZGZZZZZZZZZ.D..WW', // 18
      'WBBZZZZZZZGZZZZZZD.ZZZBBRWW', // 19
      'WZZZZZZZZZZZZZZDZZZZZZZZZZW', // 20
      'WZZZZZZZZZZZZZZZZZZZZZZZZRW', // 21
      'WZZZZDZZZZWWWWZZDZZZZZDZZZW', // 22
      'WZZZZZZZZWWWWWWZZZZZZZZOZZW', // 23
      'WZZZZZDZZZZWWZZZZZDZZZZDZZW', // 24
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWW'  // 25
    ]
  }
];


