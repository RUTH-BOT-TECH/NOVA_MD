/** Image ↔ sticker conversion. sharp is optional at runtime. */
async function sharpLib() {
  try { return (await import('sharp')).default; }
  catch { throw new Error('Install sharp first: npm i sharp'); }
}

/** Any image buffer → WhatsApp sticker (512px webp, padded square, transparent). */
export async function imageToSticker(buffer, { size = 512, quality = 80 } = {}) {
  const sharp = await sharpLib();
  return sharp(buffer)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality })
    .toBuffer();
}

/** Sticker (webp) → PNG so it can be forwarded as a normal photo. */
export async function stickerToImage(buffer, { quality = 90 } = {}) {
  const sharp = await sharpLib();
  return sharp(buffer).png({ quality }).toBuffer();
}

/** Thumbnail for link previews / metadata. */
export async function thumbnail(buffer, size = 320) {
  const sharp = await sharpLib();
  return sharp(buffer).resize(size, size, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer();
}
