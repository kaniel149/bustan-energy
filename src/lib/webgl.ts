/**
 * MapLibre needs a WebGL context. Some iOS Safari sessions (low memory, too many
 * contexts, Lockdown Mode) fail with "Could not create a WebGL context" and the
 * Map constructor throws — we render a plain fallback instead of a white screen.
 */
export function isWebGLAvailable(doc: Document | undefined = typeof document === 'undefined' ? undefined : document): boolean {
  if (!doc) return false
  try {
    const canvas = doc.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')
    return gl !== null && gl !== undefined
  } catch {
    return false
  }
}
