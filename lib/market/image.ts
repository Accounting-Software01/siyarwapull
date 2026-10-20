/**
 * Browser-only: shrink a photo before upload so it works on slow connections and budget phones.
 * Output: WebP (JPEG fallback), longest side <= 1280px, under ~900KB.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
  if (file.size > 15 * 1024 * 1024) throw new Error('Image is too large (max 15MB before compression)')

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process image')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const webp = await toBlob('image/webp', quality)
    if (webp && webp.type === 'image/webp' && webp.size <= 900 * 1024) return webp
    const jpeg = await toBlob('image/jpeg', quality)
    if (jpeg && jpeg.size <= 900 * 1024) return jpeg
  }
  throw new Error('Could not shrink this image enough. Try a different photo.')
}
