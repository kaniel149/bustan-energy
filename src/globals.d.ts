// Analytics global types
interface MetaPixelFn {
  (...args: unknown[]): void
  callMethod?: (...args: unknown[]) => void
  queue?: unknown[]
  push?: (...args: unknown[]) => void
  loaded?: boolean
  version?: string
}

interface Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posthog: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataLayer: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gtag: (...args: any[]) => void
  fbq?: MetaPixelFn
  _fbq?: MetaPixelFn
}
