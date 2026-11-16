/**
 * Write WhatsApp sticker metadata into a webp.
 *
 * sharp 0.33+ removed `withMetadata({ exif: Buffer })`, and the replacement
 * (`withExif({ IFD0: ... })`) produces a TIFF-style block, not the raw
 * header+JSON payload WhatsApp reads for pack name/author. So we edit the RIFF
 * container ourselves: set the EXIF flag on VP8X and splice in an EXIF chunk.
 */

const FOURCC_EXIF = 'EXIF';
const FOURCC_VP8X = 'VP8X';

/** WhatsApp's expected 22-byte TIFF/EXIF prefix before the JSON payload. */
export const EXIF_HEADER = Buffer.from([
  0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
  0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
]);

export function buildStickerExif({ pack, author, emojis = ['🔥'], packId } = {}) {
  const json = {
    'sticker-pack-id': packId || `nova-md-${Math.random().toString(36).slice(2, 10)}`,
    'sticker-pack-name': String(pack ?? 'NOVA-MD').slice(0, 60),
    'sticker-pack-publisher': String(author ?? 'Nova').slice(0, 60),
    emojis,
  };
  return Buffer.concat([EXIF_HEADER, Buffer.from(JSON.stringify(json), 'utf8')]);
}

function readChunks(webp) {
  if (webp.toString('ascii', 0, 4) !== 'RIFF' || webp.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('not a webp file');
  }
  const chunks = [];
  let offset = 12;
  while (offset + 8 <= webp.length) {
    const fourcc = webp.toString('ascii', offset, offset + 4);
    const size = webp.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    chunks.push({ fourcc, size, data: webp.subarray(start, Math.min(end, webp.length)) });
    offset = end + (size % 2); // chunks are padded to even length
  }
  return chunks;
}

function writeChunks(chunks) {
  const body = [Buffer.from('WEBP', 'ascii')];
  for (const chunk of chunks) {
    const header = Buffer.alloc(8);
    header.write(chunk.fourcc, 0, 'ascii');
    header.writeUInt32LE(chunk.data.length, 4);
    body.push(header, chunk.data);
    if (chunk.data.length % 2) body.push(Buffer.alloc(1));
  }
  const payload = Buffer.concat(body);
  const riff = Buffer.alloc(8);
  riff.write('RIFF', 0, 'ascii');
  riff.writeUInt32LE(payload.length, 4); // size excludes the 8-byte RIFF header
  return Buffer.concat([riff, payload]);
}

/** Pull canvas dimensions out of a VP8 / VP8L bitstream. */
function canvasSize(chunks) {
  const vp8l = chunks.find((c) => c.fourcc === 'VP8L');
  if (vp8l) {
    const bits = vp8l.data.readUInt32LE(1);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  const vp8 = chunks.find((c) => c.fourcc === 'VP8 ');
  if (vp8) {
    const d = vp8.data;
    if (d[3] === 0x9d && d[4] === 0x01 && d[5] === 0x2a) {
      return { width: d.readUInt16LE(6) & 0x3fff, height: d.readUInt16LE(8) & 0x3fff };
    }
  }
  throw new Error('could not read webp canvas size');
}

/** Build a 10-byte VP8X payload with the EXIF flag set. */
function makeVp8x(width, height, { alpha = true, exif = true } = {}) {
  const payload = Buffer.alloc(10);
  payload[0] = (exif ? 0x08 : 0) | (alpha ? 0x10 : 0);
  payload.writeUIntLE(Math.max(0, width - 1), 4, 3);
  payload.writeUIntLE(Math.max(0, height - 1), 7, 3);
  return payload;
}

/** Insert (or replace) the EXIF chunk carrying `exif`. Returns a new webp. */
export function stampWebpExif(webp, exif) {
  const chunks = readChunks(webp).filter((c) => c.fourcc !== FOURCC_EXIF);

  let vp8xIndex = chunks.findIndex((c) => c.fourcc === FOURCC_VP8X);
  if (vp8xIndex !== -1) {
    const flags = Buffer.from(chunks[vp8xIndex].data);
    flags[0] |= 0x08; // EXIF bit
    chunks[vp8xIndex] = { ...chunks[vp8xIndex], data: flags };
  } else {
    // no extended header yet: synthesise one so the EXIF flag has somewhere to live
    const { width, height } = canvasSize(chunks);
    chunks.unshift({ fourcc: FOURCC_VP8X, data: makeVp8x(width, height) });
    vp8xIndex = 0;
  }

  chunks.splice(vp8xIndex + 1, 0, { fourcc: FOURCC_EXIF, data: exif });
  return writeChunks(chunks);
}

/** Read the pack metadata back out of a webp (used by tests and `.stickerinfo`). */
export function readStickerExif(webp) {
  const chunk = readChunks(webp).find((c) => c.fourcc === FOURCC_EXIF);
  if (!chunk) return null;
  const jsonStart = chunk.data.indexOf(0x7b); // '{'
  if (jsonStart === -1) return null;
  try { return JSON.parse(chunk.data.subarray(jsonStart).toString('utf8')); } catch { return null; }
}
