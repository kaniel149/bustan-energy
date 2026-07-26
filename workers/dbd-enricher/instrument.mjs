import * as Sentry from '@sentry/node'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  })
}

export function captureException(error) {
  if (dsn) Sentry.captureException(error)
}

export async function flushSentry(timeout = 2000) {
  if (dsn) await Sentry.flush(timeout)
}
