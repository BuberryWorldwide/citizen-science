const MAX_DIMENSION = 1024;
const QUALITY = 0.65;
const MAX_SIZE = 300_000; // 300KB target

export async function compressImage(file: File): Promise<File> {
  try {
    // Accept any image type including HEIC
    if (!file.type.startsWith('image/') && !file.name.match(/\.(heic|heif|jpg|jpeg|png|webp)$/i)) {
      return file;
    }

    // Skip if already small enough and is JPEG
    if (file.size < MAX_SIZE && file.type === 'image/jpeg') {
      return file;
    }

    // Try OffscreenCanvas first (faster, no DOM needed)
    if (typeof OffscreenCanvas !== 'undefined') {
      return await compressWithOffscreen(file);
    }

    // Fallback to regular canvas (wider browser support)
    return await compressWithCanvas(file);
  } catch (err) {
    console.error('Image compression failed, using original:', err);
    return file;
  }
}

async function compressWithOffscreen(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height, 1);
  const newW = Math.round(width * scale);
  const newH = Math.round(height * scale);

  const canvas = new OffscreenCanvas(newW, newH);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, newW, newH);
  bitmap.close();

  let quality = QUALITY;
  let blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  while (blob.size > MAX_SIZE && quality > 0.3) {
    quality -= 0.1;
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  }

  console.log(`[compress] ${file.name}: ${(file.size/1024).toFixed(0)}KB → ${(blob.size/1024).toFixed(0)}KB (q=${quality.toFixed(1)})`);
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

async function compressWithCanvas(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height, 1);
      const newW = Math.round(img.width * scale);
      const newH = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, newW, newH);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log(`[compress-canvas] ${file.name}: ${(file.size/1024).toFixed(0)}KB → ${(blob.size/1024).toFixed(0)}KB`);
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
