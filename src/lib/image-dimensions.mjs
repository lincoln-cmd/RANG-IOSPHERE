import { readFileSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve } from 'node:path';

const publicDirectory = resolve(process.cwd(), 'public');

const jpegDimensions = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return undefined;
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    if (startOfFrame.has(marker)) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return undefined;
    offset += length + 2;
  }
};

const webpDimensions = (buffer) => {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return undefined;
  const type = buffer.toString('ascii', 12, 16);
  if (type === 'VP8X') return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  if (type === 'VP8 ' && buffer.toString('hex', 23, 26) === '9d012a') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (type === 'VP8L' && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
};

const mimeTypes = new Map([
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

export const getPublicImageMetadata = (source) => {
  if (typeof source !== 'string' || !source.startsWith('/') || source.startsWith('//')) return undefined;
  let pathname;
  try { pathname = decodeURIComponent(source.split(/[?#]/, 1)[0]); } catch { return undefined; }
  const file = resolve(publicDirectory, pathname.replace(/^\/+/, ''));
  const pathFromPublic = relative(publicDirectory, file);
  if (!pathFromPublic || pathFromPublic.startsWith('..') || isAbsolute(pathFromPublic)) return undefined;

  try {
    const buffer = readFileSync(file);
    const dimensions = buffer.toString('ascii', 1, 4) === 'PNG'
      ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
      : buffer.toString('ascii', 0, 3) === 'GIF'
        ? { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
        : jpegDimensions(buffer) ?? webpDimensions(buffer);
    const type = mimeTypes.get(extname(file).toLowerCase());
    return dimensions && type ? { ...dimensions, type } : undefined;
  } catch {
    return undefined;
  }
};

export const getPublicImageDimensions = (source) => {
  const metadata = getPublicImageMetadata(source);
  return metadata ? { width: metadata.width, height: metadata.height } : undefined;
};
