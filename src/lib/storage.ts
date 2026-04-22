import { supabase } from './supabase'

const BUCKET = 'proposal-images'

/**
 * Upload a file to the proposal-images bucket.
 * Returns the public URL on success, or throws an error.
 */
export async function uploadProposalImage(
  file: File,
  path: string
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Generate a unique storage path for a proposal image.
 */
export function proposalImagePath(ref: string, suffix: 'original' | 'panels'): string {
  const ts = Date.now()
  return `${ref}/${suffix}-${ts}.jpg`
}

/**
 * Convert a File to a base64 string (data URL stripped of prefix).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data:image/...;base64, prefix
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Failed to read file'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsDataURL(file)
  })
}

/**
 * Resize an image file so its longest side is at most `maxDim` pixels,
 * returning a JPEG-compressed File. Drone photos (12-48MP) → ~500KB-1MB.
 * Keeps EXIF-free JPEG at quality 0.85 which is visually lossless for roofs.
 */
export async function resizeImage(
  file: File,
  maxDim = 2048,
  quality = 0.85
): Promise<File> {
  // Skip if already small and not oversized
  if (!file.type.startsWith('image/')) return file

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Image load error'))
    el.src = dataUrl
  })

  const longest = Math.max(img.width, img.height)
  // Already small enough — keep original (skip re-encoding)
  if (longest <= maxDim && file.size < 4 * 1024 * 1024) return file

  const scale = longest > maxDim ? maxDim / longest : 1
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context failed')
  ctx.drawImage(img, 0, 0, w, h)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      quality
    )
  })

  // Preserve original filename but force .jpg extension
  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}
