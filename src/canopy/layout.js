import { EDGE_PROFILES, GEO, PART } from '../config.js';

const HALF_PI = Math.PI / 2;
const TOLERANCE = 1e-6;

const ROOF_LEVEL =
  GEO.beam.height + GEO.rafter.height + GEO.deck.thickness + GEO.roof.thickness;

const DIRECTION_ROTATION = {
  '+x': 0,
  '-x': Math.PI,
  '+z': -HALF_PI,
  '-z': HALF_PI
};

function columnLines(halfAxis) {
  const span = halfAxis * 2;
  const bays = Math.max(1, Math.ceil(span / GEO.column.maxSpan));
  const lines = [];
  for (let i = 0; i <= bays; i++) lines.push(-halfAxis + (span * i) / bays);
  return lines;
}

function subdivide(lines, maxStep) {
  const positions = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const from = lines[i];
    const to = lines[i + 1];
    const steps = Math.max(1, Math.ceil((to - from) / maxStep));
    for (let k = 0; k < steps; k++) positions.push(from + ((to - from) * k) / steps);
  }
  positions.push(lines[lines.length - 1]);
  return positions;
}

function cutLengths(total) {
  const unit = GEO.stock.length;
  const whole = Math.floor(total / unit + TOLERANCE);
  const rest = total - whole * unit;
  const lengths = new Array(whole).fill(unit);

  if (rest > TOLERANCE) {
    if (lengths.length && rest < unit * GEO.stock.remainder) lengths[lengths.length - 1] += rest;
    else lengths.push(rest);
  }
  return lengths.length ? lengths : [total];
}

function pushRun(push, part, position, rotationY, total, extra) {
  const dx = Math.cos(rotationY);
  const dz = -Math.sin(rotationY);
  let offset = 0;

  for (const length of cutLengths(total)) {
    push(
      part,
      [position[0] + dx * offset, position[1], position[2] + dz * offset],
      rotationY,
      [length, 1, 1],
      extra
    );
    offset += length;
  }
}

function runPlacement(side, offset, length) {
  switch (side) {
    case '+z':
      return { rotationY: 0, x: -length / 2, z: offset };
    case '-z':
      return { rotationY: Math.PI, x: length / 2, z: -offset };
    case '+x':
      return { rotationY: HALF_PI, x: offset, z: length / 2 };
    default:
      return { rotationY: -HALF_PI, x: -offset, z: -length / 2 };
  }
}

function addColumns(push, height, xLines, zLines) {
  const scaleY = height / GEO.column.height;
  const edgeX = [xLines[0], xLines[xLines.length - 1]];
  const edgeZ = [zLines[0], zLines[zLines.length - 1]];
  let count = 0;
  for (const x of xLines) {
    for (const z of zLines) {
      if (!edgeX.includes(x) && !edgeZ.includes(z)) continue;
      push(PART.COLUMN, [x, 0, z], 0, [1, scaleY, 1]);
      count++;
    }
  }
  return count;
}

function addBraces(push, height, xLines, zLines) {
  const y = height - GEO.column.height;
  const edgeX = [xLines[0], xLines[xLines.length - 1]];
  const edgeZ = [zLines[0], zLines[zLines.length - 1]];
  for (const z of edgeZ) {
    for (let i = 0; i < xLines.length - 1; i++) {
      push(PART.BRACE, [xLines[i], y, z], DIRECTION_ROTATION['+x']);
      push(PART.BRACE, [xLines[i + 1], y, z], DIRECTION_ROTATION['-x']);
    }
  }
  for (const x of edgeX) {
    for (let i = 0; i < zLines.length - 1; i++) {
      push(PART.BRACE, [x, y, zLines[i]], DIRECTION_ROTATION['+z']);
      push(PART.BRACE, [x, y, zLines[i + 1]], DIRECTION_ROTATION['-z']);
    }
  }
}

function addRingBeams(push, { width, depth, height }) {
  const throughX = width <= depth;
  const inset = GEO.column.section / 2 + GEO.beam.halfWidth;
  const axisX = width / 2 - GEO.column.section / 2;
  const axisZ = depth / 2 - GEO.column.section / 2;
  const lengthX = throughX ? width : width - 2 * inset;
  const lengthZ = throughX ? depth - 2 * inset : depth;
  for (const z of [axisZ, -axisZ]) {
    pushRun(push, PART.RING_BEAM, [-lengthX / 2, height, z], 0, lengthX);
  }
  for (const x of [axisX, -axisX]) {
    pushRun(push, PART.RING_BEAM, [x, height, -lengthZ / 2], -HALF_PI, lengthZ);
  }
}

function addFriezeRing(push, { width, depth, height }, row) {
  const y = height + row.base;
  const throughX = width <= depth;
  const xInner = width / 2 + row.inner;
  const xOuter = width / 2 + row.outer;
  const zInner = depth / 2 + row.inner;
  const zOuter = depth / 2 + row.outer;
  const lengthAlongX = throughX ? 2 * xOuter : 2 * xInner;
  const lengthAlongZ = throughX ? 2 * zInner : 2 * zOuter;
  for (const side of ['+z', '-z']) {
    const p = runPlacement(side, zInner, lengthAlongX);
    pushRun(push, PART.FRIEZE, [p.x, y, p.z], p.rotationY, lengthAlongX);
  }
  for (const side of ['+x', '-x']) {
    const p = runPlacement(side, xInner, lengthAlongZ);
    pushRun(push, PART.FRIEZE, [p.x, y, p.z], p.rotationY, lengthAlongZ);
  }
}

function addRoofFraming(push, { width, depth, height }, xLines, zLines) {
  const spanIsX = width <= depth;
  const y = height + GEO.beam.height;
  const rw = GEO.rafter.width;
  const spanHalf = (spanIsX ? width : depth) / 2;
  const runHalf = (spanIsX ? depth : width) / 2;
  const edgeAxis = spanHalf + GEO.beam.overhang;
  const runLines = spanIsX ? zLines : xLines;
  const spanLines = spanIsX ? xLines : zLines;

  const columnAxis = spanHalf - GEO.column.section / 2;
  const halfLength = spanHalf + GEO.frieze.innerFace;

  const rafterPositions = subdivide(runLines, GEO.rafter.step);
  for (const runCoord of rafterPositions) {
    if (spanIsX) {
      push(PART.RAFTER, [-halfLength, y, runCoord - rw / 2], 0, [halfLength * 2, 1, 1]);
    } else {
      push(PART.RAFTER, [runCoord + rw / 2, y, -halfLength], -HALF_PI, [halfLength * 2, 1, 1]);
    }
  }

  const insertStart = runLines[runLines.length - 1] + rw / 2;
  const insertLength = runHalf + GEO.frieze.innerFace - insertStart;
  const insertScale = insertLength / GEO.insert.length;
  const insertLimit = columnAxis;
  for (const raw of subdivide(spanLines, GEO.insert.step)) {
    const spanCoord = Math.min(insertLimit, Math.max(-insertLimit, raw));
    if (spanIsX) {
      push(PART.RAFTER_INSERT, [spanCoord, y, insertStart], -HALF_PI, [insertScale, 1, 1]);
      push(PART.RAFTER_INSERT, [spanCoord, y, -insertStart], HALF_PI, [insertScale, 1, 1]);
    } else {
      push(PART.RAFTER_INSERT, [insertStart, y, spanCoord], 0, [insertScale, 1, 1]);
      push(PART.RAFTER_INSERT, [-insertStart, y, spanCoord], Math.PI, [insertScale, 1, 1]);
    }
  }

  return rafterPositions.length;
}

function addDeck(push, { width, depth, height }) {
  const spanIsX = width <= depth;
  const y = height + GEO.beam.height + GEO.rafter.height;
  const spanExtent = (spanIsX ? width : depth) / 2 + GEO.frieze.midFace;
  const runExtent = (spanIsX ? depth : width) / 2 + GEO.frieze.midFace;
  const boardLength = runExtent * 2;
  const total = spanExtent * 2;
  const rows = Math.ceil(total / GEO.deck.width);
  let boards = 0;
  for (let i = 0; i < rows; i++) {
    const from = -spanExtent + i * GEO.deck.width;
    const boardWidth = Math.min(GEO.deck.width, spanExtent - from);
    const center = from + boardWidth / 2;
    const widthScale = boardWidth / GEO.deck.width;

    let end = runExtent;
    let first = true;
    while (end > -runExtent + TOLERANCE) {
      const nominal = first && i % 2 === 1 ? GEO.deck.length / 2 : GEO.deck.length;
      const length = Math.min(nominal, end + runExtent);
      const scale = [widthScale, 1, length];
      if (spanIsX) push(PART.DECK, [center, y, end], 0, scale);
      else push(PART.DECK, [end, y, center], HALF_PI, scale);
      end -= length;
      first = false;
      boards++;
    }
  }
  return boards;
}

function addRoofSheet(push, { width, depth, height }) {
  const y = height + GEO.beam.height + GEO.rafter.height + GEO.deck.thickness;
  const halfX = width / 2 + GEO.frieze.midFace;
  const halfZ = depth / 2 + GEO.frieze.midFace;
  const tile = GEO.roof.sheetSize;
  let sheets = 0;

  for (let x = -halfX; x < halfX - TOLERANCE; x += tile) {
    const sx = Math.min(tile, halfX - x);
    for (let z = halfZ; z > -halfZ + TOLERANCE; z -= tile) {
      const sz = Math.min(tile, z + halfZ);
      push(PART.ROOF_SHEET, [x, y, z], 0, [sx, 1, sz]);
      sheets++;
    }
  }
  return sheets;
}

function addEdgeProfile(push, { width, depth, height, profile, color }) {
  const spec = EDGE_PROFILES[profile] ?? EDGE_PROFILES.closed;
  const y = height + ROOF_LEVEL + GEO.roof.bedding;
  const boundX = width / 2 + GEO.frieze.outerFace + GEO.roof.projection;
  const boundZ = depth / 2 + GEO.frieze.outerFace + GEO.roof.projection;
  const tint = { material: color };

  if (!spec.corner) {
    const lengthAlongX = 2 * boundX;
    const lengthAlongZ = 2 * boundZ;
    for (const side of ['+z', '-z']) {
      const p = runPlacement(side, boundZ, lengthAlongX);
      push(spec.run, [p.x, y, p.z], p.rotationY, [lengthAlongX, 1, 1], tint);
    }
    for (const side of ['+x', '-x']) {
      const p = runPlacement(side, boundX, lengthAlongZ);
      push(spec.run, [p.x, y, p.z], p.rotationY, [lengthAlongZ, 1, 1], tint);
    }
    return;
  }

  const nose = spec.nose;
  const lengthAlongX = 2 * (boundX - spec.cornerSize);
  const lengthAlongZ = 2 * (boundZ - spec.cornerSize);

  push(spec.run, [lengthAlongX / 2, y, boundZ - nose], Math.PI, [lengthAlongX, 1, 1], tint);
  push(spec.run, [-lengthAlongX / 2, y, -boundZ + nose], 0, [lengthAlongX, 1, 1], tint);
  push(spec.run, [boundX - nose, y, -lengthAlongZ / 2], -HALF_PI, [lengthAlongZ, 1, 1], tint);
  push(spec.run, [-boundX + nose, y, lengthAlongZ / 2], HALF_PI, [lengthAlongZ, 1, 1], tint);

  const inset = spec.nose;
  push(spec.corner, [-boundX + inset, y, -boundZ + inset], 0, [1, 1, 1], tint);
  push(spec.corner, [boundX - inset, y, -boundZ + inset], -HALF_PI, [1, 1, 1], tint);
  push(spec.corner, [boundX - inset, y, boundZ - inset], Math.PI, [1, 1, 1], tint);
  push(spec.corner, [-boundX + inset, y, boundZ - inset], HALF_PI, [1, 1, 1], tint);
}

export function buildLayout(params) {
  const placements = [];
  const push = (part, position, rotationY = 0, scale = [1, 1, 1], extra) =>
    placements.push({
      part,
      position,
      rotationY,
      tilt: extra?.tilt ?? 0,
      scale,
      material: extra?.material ?? null
    });

  const xLines = columnLines(params.width / 2 - GEO.column.section / 2);
  const zLines = columnLines(params.depth / 2 - GEO.column.section / 2);

  const columns = addColumns(push, params.height, xLines, zLines);
  addBraces(push, params.height, xLines, zLines);
  addRingBeams(push, params);
  addFriezeRing(push, params, {
    inner: GEO.frieze.innerFace,
    outer: GEO.frieze.midFace,
    base: GEO.frieze.innerRise
  });
  addFriezeRing(push, params, {
    inner: GEO.frieze.midFace,
    outer: GEO.frieze.outerFace,
    base: ROOF_LEVEL - GEO.frieze.height
  });
  const rafters = addRoofFraming(push, params, xLines, zLines);
  const deckBoards = addDeck(push, params);
  const roofSheets = addRoofSheet(push, params);
  addEdgeProfile(push, params);

  const edge = EDGE_PROFILES[params.profile] ?? EDGE_PROFILES.closed;
  const roofTop = params.height + ROOF_LEVEL + edge.height;

  return {
    placements,
    stats: {
      columns,
      rafters,
      deckBoards,
      roofSheets,
      parts: placements.length,
      roofTop,
      roofArea: (params.width + 2 * GEO.frieze.midFace) * (params.depth + 2 * GEO.frieze.midFace)
    }
  };
}
