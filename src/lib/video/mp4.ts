// Inspect the ISO BMFF signature; this is container validation, not malware scanning or watermark detection.
export function isMp4(bytes: Uint8Array) {
  if (bytes.length < 16) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start: number) => String.fromCharCode(...bytes.slice(start, start + 4));
  const size = view.getUint32(0);
  if (ascii(4) !== "ftyp" || size < 16 || size > bytes.length || size % 4 !== 0) return false;
  const brands = [ascii(8)];
  for (let i = 16; i < size; i += 4) brands.push(ascii(i));
  return brands.some((brand) => ["isom", "iso2", "iso3", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "dash"].includes(brand));
}
