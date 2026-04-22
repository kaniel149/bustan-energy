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
