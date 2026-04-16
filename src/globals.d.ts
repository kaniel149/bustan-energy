// Analytics global types
interface Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posthog: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataLayer: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gtag: (...args: any[]) => void
}
