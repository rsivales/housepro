/**
 * QR code generator — self-contained (no network / no dependency).
 * Byte-mode encoder with Reed–Solomon ECC, automatic version selection and
 * data masking. Adapted from the public-domain QR algorithm (Project Nayuki).
 * Renders to an SVG string so it prints crisply and needs no <canvas>.
 */

type Ecl = "L" | "M" | "Q" | "H";
const ECL_ORDER: Ecl[] = ["L", "M", "Q", "H"];

// ECC codewords per block, indexed [ecl][version] (index 0 unused).
const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

function bytesFor(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

/** Number of function-pattern-free data modules for a version (QR spec formula). */
function numRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** Total number of 8-bit data codewords (i.e. usable capacity) for a version+ecl. */
function numDataCodewords(version: number, eclIdx: number): number {
  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const ecc =
    ECC_CODEWORDS_PER_BLOCK[eclIdx][version] *
    NUM_ERROR_CORRECTION_BLOCKS[eclIdx][version];
  return rawCodewords - ecc;
}

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step =
    version === 32
      ? 26
      : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  for (let pos = version * 4 + 10; result.length < numAlign; pos -= step)
    result.unshift(pos);
  return result;
}

// --- Reed–Solomon over GF(256) ---
function rsDivisor(degree: number): number[] {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 2);
  }
  return result;
}
function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ result.shift()!;
    result.push(0);
    for (let i = 0; i < result.length; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}

interface Encoded {
  version: number;
  size: number;
  eclIdx: number;
  codewords: number[];
}

function encode(text: string, ecl: Ecl): Encoded {
  const eclIdx = ECL_ORDER.indexOf(ecl);
  const data = bytesFor(text);

  // Pick the smallest version that fits (byte-mode segment).
  let version = 1;
  for (; version <= 40; version++) {
    const cap = numDataCodewords(version, eclIdx) * 8;
    const ccBits = version < 10 ? 8 : 16;
    const needed = 4 + ccBits + data.length * 8;
    if (needed <= cap) break;
  }
  if (version > 40) throw new Error("Dados demasiado longos para QR");

  // Build bit stream.
  const bits: number[] = [];
  const append = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  const ccBits = version < 10 ? 8 : 16;
  append(0b0100, 4); // byte mode
  append(data.length, ccBits);
  for (const b of data) append(b, 8);

  const capacityBits = numDataCodewords(version, eclIdx) * 8;
  append(0, Math.min(4, capacityBits - bits.length)); // terminator
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataCodewords.push(b);
  }
  for (let pad = 0xec; dataCodewords.length < capacityBits / 8; pad ^= 0xec ^ 0x11)
    dataCodewords.push(pad);

  // Split into blocks + Reed–Solomon, then interleave.
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[eclIdx][version];
  const eccLen = ECC_CODEWORDS_PER_BLOCK[eclIdx][version];
  const rawCodewords = numDataCodewords(version, eclIdx) + eccLen * numBlocks;
  const numShort = numBlocks - (rawCodewords % numBlocks);
  const shortLen = Math.floor(rawCodewords / numBlocks);

  const divisor = rsDivisor(eccLen);
  const blocks: number[][] = [];
  let off = 0;
  for (let i = 0; i < numBlocks; i++) {
    const datLen = shortLen - eccLen + (i < numShort ? 0 : 1);
    const dat = dataCodewords.slice(off, off + datLen);
    off += datLen;
    const ecc = rsRemainder(dat, divisor);
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[blocks.length - 1].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i !== shortLen - eccLen || j >= numShort) result.push(blocks[j][i]);
    }
  }

  return { version, size: version * 4 + 17, eclIdx, codewords: result };
}

// --- Matrix construction & masking ---
class Matrix {
  size: number;
  modules: boolean[][];
  reserved: boolean[][];
  constructor(size: number) {
    this.size = size;
    this.modules = Array.from({ length: size }, () => new Array(size).fill(false));
    this.reserved = Array.from({ length: size }, () => new Array(size).fill(false));
  }
  set(x: number, y: number, dark: boolean, reserve = true) {
    this.modules[y][x] = dark;
    if (reserve) this.reserved[y][x] = true;
  }
}

function buildMatrix(enc: Encoded, eclIdx: number): boolean[][] {
  const { size, version, codewords } = enc;
  const m = new Matrix(size);

  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        m.set(x, y, d !== 2 && d !== 4);
      }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  // Timing patterns
  for (let i = 0; i < size; i++) {
    if (!m.reserved[6][i]) m.set(i, 6, i % 2 === 0);
    if (!m.reserved[i][6]) m.set(6, i, i % 2 === 0);
  }

  // Alignment patterns
  const aligns = alignmentPositions(version);
  for (const ay of aligns)
    for (const ax of aligns) {
      if (
        (ax === 6 && ay === 6) ||
        (ax === 6 && ay === size - 7) ||
        (ax === size - 7 && ay === 6)
      )
        continue;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++)
          m.set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }

  // Reserve format & version areas
  for (let i = 0; i < 9; i++) {
    m.set(i, 8, false);
    m.set(8, i, false);
  }
  for (let i = 0; i < 8; i++) {
    m.set(size - 1 - i, 8, false);
    m.set(8, size - 1 - i, false);
  }
  m.set(8, size - 8, true); // dark module
  if (version >= 7) {
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++) {
        m.set(size - 11 + j, i, false);
        m.set(i, size - 11 + j, false);
      }
  }

  // Place data bits
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  const getBit = () => {
    if (bitIdx >= totalBits) return false;
    const b = (codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1;
    bitIdx++;
    return b === 1;
  };
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!m.reserved[y][x]) {
          m.set(x, y, getBit(), false);
        }
      }
    }
  }

  // Try all masks, pick lowest penalty
  let best: boolean[][] | null = null;
  let bestPenalty = Infinity;
  let bestMask = 0;
  for (let mask = 0; mask < 8; mask++) {
    const trial = m.modules.map((row) => row.slice());
    applyMask(trial, m.reserved, mask);
    drawFormat(trial, eclIdx, mask, size);
    const p = penalty(trial, size);
    if (p < bestPenalty) {
      bestPenalty = p;
      best = trial;
      bestMask = mask;
    }
  }
  drawVersion(best!, version, size);
  drawFormat(best!, eclIdx, bestMask, size);
  return best!;
}

function maskFn(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}
function applyMask(mods: boolean[][], reserved: boolean[][], mask: number) {
  const size = mods.length;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (!reserved[y][x] && maskFn(mask, x, y)) mods[y][x] = !mods[y][x];
}

function drawFormat(mods: boolean[][], eclIdx: number, mask: number, size: number) {
  const eclBits = [1, 0, 3, 2][eclIdx]; // L,M,Q,H -> 01,00,11,10
  const data = (eclBits << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const get = (i: number) => ((bits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) mods[8][i] = get(i);
  mods[8][7] = get(6);
  mods[8][8] = get(7);
  mods[7][8] = get(8);
  for (let i = 9; i < 15; i++) mods[14 - i][8] = get(i);
  for (let i = 0; i < 8; i++) mods[size - 1 - i][8] = get(i);
  for (let i = 8; i < 15; i++) mods[8][size - 15 + i] = get(i);
  mods[size - 8][8] = true;
}

function drawVersion(mods: boolean[][], version: number, size: number) {
  if (version < 7) return;
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const bit = ((bits >>> i) & 1) === 1;
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    mods[a][b] = bit;
    mods[b][a] = bit;
  }
}

function penalty(mods: boolean[][], size: number): number {
  let p = 0;
  // Rule 1: runs of 5+
  for (let y = 0; y < size; y++) {
    let runColor = mods[y][0];
    let runLen = 1;
    for (let x = 1; x < size; x++) {
      if (mods[y][x] === runColor) {
        runLen++;
        if (runLen === 5) p += 3;
        else if (runLen > 5) p++;
      } else {
        runColor = mods[y][x];
        runLen = 1;
      }
    }
  }
  for (let x = 0; x < size; x++) {
    let runColor = mods[0][x];
    let runLen = 1;
    for (let y = 1; y < size; y++) {
      if (mods[y][x] === runColor) {
        runLen++;
        if (runLen === 5) p += 3;
        else if (runLen > 5) p++;
      } else {
        runColor = mods[y][x];
        runLen = 1;
      }
    }
  }
  // Rule 2: 2x2 blocks
  for (let y = 0; y < size - 1; y++)
    for (let x = 0; x < size - 1; x++) {
      const c = mods[y][x];
      if (c === mods[y][x + 1] && c === mods[y + 1][x] && c === mods[y + 1][x + 1])
        p += 3;
    }
  // Rule 3: finder-like patterns
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
  const matches = (get: (i: number) => boolean, pat: boolean[]) => {
    for (let i = 0; i < pat.length; i++) if (get(i) !== pat[i]) return false;
    return true;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (x + 11 <= size) {
        if (matches((i) => mods[y][x + i], pat1)) p += 40;
        if (matches((i) => mods[y][x + i], pat2)) p += 40;
      }
      if (y + 11 <= size) {
        if (matches((i) => mods[y + i][x], pat1)) p += 40;
        if (matches((i) => mods[y + i][x], pat2)) p += 40;
      }
    }
  // Rule 4: balance
  let dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (mods[y][x]) dark++;
  const total = size * size;
  const ratio = (dark * 100) / total;
  const k = Math.floor(Math.abs(ratio - 50) / 5);
  p += k * 10;
  return p;
}

/** Returns the QR as an SVG string. `text` is typically a URL. */
export function qrSvg(
  text: string,
  opts: { ecl?: Ecl; margin?: number; dark?: string; light?: string } = {}
): string {
  const ecl = opts.ecl ?? "M";
  const margin = opts.margin ?? 4;
  const dark = opts.dark ?? "#0f1f19";
  const light = opts.light ?? "#ffffff";
  const enc = encode(text, ecl);
  const mods = buildMatrix(enc, enc.eclIdx);
  const size = enc.size;
  const dim = size + margin * 2;

  let path = "";
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (mods[y][x]) path += `M${x + margin},${y + margin}h1v1h-1z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" width="100%" height="100%"><rect width="${dim}" height="${dim}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}

/** SVG as a data URI, handy for <img src>. */
export function qrDataUri(text: string, opts?: Parameters<typeof qrSvg>[1]): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg(text, opts))}`;
}
