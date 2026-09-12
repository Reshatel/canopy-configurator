export const MODEL_URL = './assets/Canopy_Models.glb';

export const PART = {
  COLUMN: 'balk_150x150x2200',
  BRACE: 'balk_corner',
  RING_BEAM: 'balk_150x150x1000',
  FRIEZE: 'Lodge_20x200x1000',
  DECK: 'Lodge_20x190x1000_bevel',
  RAFTER: 'lodge_150x50x1000',
  RAFTER_INSERT: 'lodge_150x50x200',
  ROOF_SHEET: 'ruberoid_1000x1000x2',
  EDGE_PROFILE: 'profile_canopy_perimeter_closed',
  EDGE_ROUND: 'roof_edge_1m',
  EDGE_ROUND_CORNER: 'roof_edge_corner',
  EDGE_STRAIGHT: 'roof_edge_1m2',
  EDGE_STRAIGHT_CORNER: 'roof_edge_corner2'
};

export const PARAM_RANGE = { min: 2, max: 8, step: 0.05 };

export const PART_INFO = {
  [PART.COLUMN]: { label: 'Колона', section: '150×150', axis: 1, base: 2.2 },
  [PART.BRACE]: { label: 'Кутова балка', section: '565' },
  [PART.RING_BEAM]: { label: 'Кільцева балка', section: '150×150', axis: 0, base: 1 },
  [PART.FRIEZE]: { label: 'Фриз', section: '20×200', axis: 0, base: 1 },
  [PART.DECK]: { label: 'Дошка настилу', section: '190×20', axis: 2, base: 1 },
  [PART.RAFTER]: { label: 'Кроква', section: '150×50', axis: 0, base: 1 },
  [PART.RAFTER_INSERT]: { label: 'Вставка', section: '150×50', axis: 0, base: 0.2 },
  [PART.ROOF_SHEET]: { label: 'Полотно покриття', section: 'руберойд', axis: 0, base: 1 },
  [PART.EDGE_PROFILE]: { label: 'Профіль периметру', section: '67×134', axis: 0, base: 1 },
  [PART.EDGE_ROUND]: { label: 'Профіль R20', section: 'зкруглений', axis: 0, base: 1 },
  [PART.EDGE_ROUND_CORNER]: { label: 'Кут профілю', section: 'зкруглений' },
  [PART.EDGE_STRAIGHT]: { label: 'Профіль зі скосом', section: 'прямий', axis: 0, base: 1 },
  [PART.EDGE_STRAIGHT_CORNER]: { label: 'Кут профілю', section: 'прямий' }
};

export const CLADDING_PARTS = [
  PART.FRIEZE,
  PART.DECK,
  PART.ROOF_SHEET,
  PART.EDGE_PROFILE,
  PART.EDGE_ROUND,
  PART.EDGE_ROUND_CORNER,
  PART.EDGE_STRAIGHT,
  PART.EDGE_STRAIGHT_CORNER
];

export const EDGE_PROFILES = {
  closed: {
    label: 'Суцільний 67×134',
    run: PART.EDGE_PROFILE,
    corner: null,
    nose: 0,
    height: 0.0668,
    cornerSize: 0,
    mitre: 0.134
  },
  round: {
    label: 'Зкруглений R20',
    run: PART.EDGE_ROUND,
    corner: PART.EDGE_ROUND_CORNER,
    nose: 0.04,
    height: 0.04,
    cornerSize: 0.1395,
    mitre: 0
  },
  straight: {
    label: 'Прямий зі скосом',
    run: PART.EDGE_STRAIGHT,
    corner: PART.EDGE_STRAIGHT_CORNER,
    nose: 0.0141,
    height: 0.05,
    cornerSize: 0.1,
    mitre: 0
  }
};

export const EDGE_COLORS = {
  silver: { label: 'Світлий', value: 0.6477, roughness: 0.35 },
  graphite: { label: 'Графіт', value: 0.3316, roughness: 0.35 },
  black: { label: 'Чорний', value: 0.1423, roughness: 0.35 }
};

export const DEFAULT_PARAMS = {
  width: 3,
  depth: 5,
  height: 2.2,
  profile: 'closed',
  color: 'silver'
};

export const GEO = {
  column: { section: 0.15, height: 2.2, maxSpan: 3 },
  brace: { reach: 0.565 },
  beam: { height: 0.15, halfWidth: 0.076, overhang: 0.001 },
  stock: { length: 2.5, remainder: 0.15 },
  frieze: {
    height: 0.2,
    thickness: 0.02,
    innerFace: 0.16,
    midFace: 0.18,
    outerFace: 0.2,
    innerRise: 0.1,
    outerRise: 0.2
  },
  rafter: { height: 0.15, width: 0.05, step: 0.5, length: 1 },
  insert: { length: 0.2, step: 0.6 },
  deck: { width: 0.19, thickness: 0.02, length: 1 },
  roof: { thickness: 0.002, profileHeight: 0.0668, profileDepth: 0.134, sheetSize: 1 }
};
