/**
 * Pure TypeScript ISO/IEC 18004 QR Code Matrix Generator (Byte Mode, Error Correction Level L).
 * Supports versions 1 to 6 (URLs up to 134 bytes) with zero external dependencies.
 */

// Version 1..6 capacities for Byte Mode (ECC Level L, 1 block)
interface VersionSpec {
  version: number
  size: number
  totalCodewords: number
  ecCodewords: number
  dataCodewords: number
  alignmentCenters: number[]
}

const VERSION_SPECS: VersionSpec[] = [
  { version: 1, size: 21, totalCodewords: 26, ecCodewords: 7, dataCodewords: 19, alignmentCenters: [] },
  { version: 2, size: 25, totalCodewords: 44, ecCodewords: 10, dataCodewords: 34, alignmentCenters: [6, 18] },
  { version: 3, size: 29, totalCodewords: 70, ecCodewords: 15, dataCodewords: 55, alignmentCenters: [6, 22] },
  { version: 4, size: 33, totalCodewords: 100, ecCodewords: 20, dataCodewords: 80, alignmentCenters: [6, 26] },
  { version: 5, size: 37, totalCodewords: 134, ecCodewords: 26, dataCodewords: 108, alignmentCenters: [6, 30] },
  { version: 6, size: 41, totalCodewords: 172, ecCodewords: 36, dataCodewords: 136, alignmentCenters: [6, 34] }, // Note: v6-L uses 2 blocks of (68 data, 18 ec)
]

// GF(256) log/exp tables with primitive polynomial 0x11d
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    const root = GF_EXP[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], root)
    }
    poly = next
  }
  return poly
}

function rsComputeRemainder(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen)
  const rem = new Uint8Array(ecLen)
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0]
    rem.copyWithin(0, 1)
    rem[ecLen - 1] = 0
    for (let j = 0; j < ecLen; j++) {
      rem[j] ^= gfMul(gen[j + 1], factor)
    }
  }
  return rem
}

// Precomputed BCH(15,5) format strings for ECC Level L (01) and masks 0..7
const FORMAT_BITS_LEVEL_L = [
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
]

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text)

  // Pick smallest version 1..6 that fits `bytes.length`
  const spec =
    VERSION_SPECS.find((s) => bytes.length + 2 <= s.dataCodewords) ||
    VERSION_SPECS[VERSION_SPECS.length - 1]

  // Build data bit stream: 4-bit mode (0100 = Byte), 8-bit length, payload, terminator, pad bytes
  const bitBuf: number[] = []
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bitBuf.push((val >>> i) & 1)
    }
  }

  pushBits(0b0100, 4) // Byte mode
  pushBits(bytes.length, 8)
  for (let i = 0; i < bytes.length; i++) {
    pushBits(bytes[i], 8)
  }

  const maxDataBits = spec.dataCodewords * 8
  const terminatorLen = Math.min(4, maxDataBits - bitBuf.length)
  pushBits(0, terminatorLen)

  while (bitBuf.length % 8 !== 0) {
    bitBuf.push(0)
  }

  const dataCodewords = new Uint8Array(spec.dataCodewords)
  for (let i = 0; i < bitBuf.length / 8 && i < spec.dataCodewords; i++) {
    let b = 0
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bitBuf[i * 8 + j]
    }
    dataCodewords[i] = b
  }

  let padToggle = true
  for (let i = Math.floor(bitBuf.length / 8); i < spec.dataCodewords; i++) {
    dataCodewords[i] = padToggle ? 0xec : 0x11
    padToggle = !padToggle
  }

  // Compute Reed-Solomon EC codewords and interleave if version 6 (2 blocks)
  let finalCodewords: Uint8Array
  if (spec.version === 6) {
    const b1 = dataCodewords.slice(0, 68)
    const b2 = dataCodewords.slice(68, 136)
    const ec1 = rsComputeRemainder(b1, 18)
    const ec2 = rsComputeRemainder(b2, 18)
    finalCodewords = new Uint8Array(172)
    let idx = 0
    for (let i = 0; i < 68; i++) {
      finalCodewords[idx++] = b1[i]
      finalCodewords[idx++] = b2[i]
    }
    for (let i = 0; i < 18; i++) {
      finalCodewords[idx++] = ec1[i]
      finalCodewords[idx++] = ec2[i]
    }
  } else {
    const ec = rsComputeRemainder(dataCodewords, spec.ecCodewords)
    finalCodewords = new Uint8Array(spec.totalCodewords)
    finalCodewords.set(dataCodewords, 0)
    finalCodewords.set(ec, spec.dataCodewords)
  }

  const size = spec.size
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  const setFuncModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark
      isFunction[r][c] = true
    }
  }

  // 1. Finder patterns + separators
  const drawFinder = (topR: number, leftC: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topR + dr
        const c = leftC + dc
        if (r < 0 || r >= size || c < 0 || c >= size) continue
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
        setFuncModule(r, c, inOuter && (onBorder || inInner))
      }
    }
  }
  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // 2. Alignment patterns
  const centers = spec.alignmentCenters
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === centers.length - 1) ||
        (i === centers.length - 1 && j === 0)
      ) {
        continue
      }
      const cr = centers[i]
      const cc = centers[j]
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1
          setFuncModule(cr + dr, cc + dc, dark)
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0
    if (!isFunction[6][i]) setFuncModule(6, i, dark)
    if (!isFunction[i][6]) setFuncModule(i, 6, dark)
  }

  // 4. Dark module & reserved format areas
  setFuncModule(size - 8, 8, true)
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) setFuncModule(8, i, false)
    if (!isFunction[i][8]) setFuncModule(i, 8, false)
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setFuncModule(8, size - 1 - i, false)
    if (!isFunction[size - 1 - i][8]) setFuncModule(size - 1 - i, 8, false)
  }

  // 5. Place data bits in upward/downward 2-column zig-zag
  let bitIdx = 0
  const totalBits = finalCodewords.length * 8
  let upward = true

  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5 // skip vertical timing column
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step
      for (let dc = 0; dc < 2; dc++) {
        const c = rightCol - dc
        if (!isFunction[r][c]) {
          let dark = false
          if (bitIdx < totalBits) {
            const byteVal = finalCodewords[bitIdx >>> 3]
            dark = ((byteVal >>> (7 - (bitIdx & 7))) & 1) === 1
            bitIdx++
          }
          modules[r][c] = dark
        }
      }
    }
    upward = !upward
  }

  // 6. Apply Mask 0 ((r + c) % 2 === 0) and write format bits
  const maskIndex = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c]
      }
    }
  }

  const formatBits = FORMAT_BITS_LEVEL_L[maskIndex]
  // Bit 14 is MSB, Bit 0 is LSB per ISO/IEC 18004 Section 8.9
  const getFormatBitFromMsb = (posFromMsb: number) =>
    ((formatBits >>> (14 - posFromMsb)) & 1) === 1

  // Top-left format bits: (8,0)..(8,5), (8,7), (8,8), (7,8), (5,8)..(0,8)
  for (let i = 0; i <= 5; i++) modules[8][i] = getFormatBitFromMsb(i)
  modules[8][7] = getFormatBitFromMsb(6)
  modules[8][8] = getFormatBitFromMsb(7)
  modules[7][8] = getFormatBitFromMsb(8)
  for (let i = 9; i <= 14; i++) modules[14 - i][8] = getFormatBitFromMsb(i)

  // Bottom-left vertical: (size-1, 8) down to (size-7, 8) gets bits 14..8 (posFromMsb 0..6)
  for (let i = 0; i <= 6; i++) modules[size - 1 - i][8] = getFormatBitFromMsb(i)
  // Top-right horizontal: (8, size-8) to (8, size-1) gets bits 7..0 (posFromMsb 7..14)
  for (let i = 7; i <= 14; i++) modules[8][size - 15 + i] = getFormatBitFromMsb(i)

  return modules
}
