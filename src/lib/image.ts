const MAX_DIMENSION = 1024;
const QUALITY = 0.65;
const MAX_SIZE = 300_000; // 300KB target

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Skip if already small
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.size < MAX_SIZE) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height, 1);
  const newW = Math.round(width * scale);
  const newH = Math.round(height * scale);

  const canvas = new OffscreenCanvas(newW, newH);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, newW, newH);
  bitmap.close();

  // Try progressively lower quality until under target size
  let quality = QUALITY;
  let blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  while (blob.size > MAX_SIZE && quality > 0.3) {
    quality -= 0.1;
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}
