import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bGet, bGetOrThrow } from '../api/_lib/bustan-db'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const gatewayTimeout = () => new Response('Gateway Timeout', { status: 504 })

describe('bustan-db resilient GET', () => {
  const fetchMock = vi.fn<typeof fetch>()
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('bGet retries a 504 and returns the rows from the retry', async () => {
    fetchMock.mockResolvedValueOnce(gatewayTimeout()).mockResolvedValueOnce(json([{ key: 'cron-alerts' }]))
    await expect(bGet('alert_state?key=eq.cron-alerts')).resolves.toEqual([{ key: 'cron-alerts' }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('bGet still degrades to [] when every attempt fails', async () => {
    fetchMock.mockResolvedValue(gatewayTimeout())
    await expect(bGet('alert_state')).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('bGetOrThrow throws instead of returning [] when the gateway keeps timing out', async () => {
    fetchMock.mockResolvedValue(gatewayTimeout())
    await expect(bGetOrThrow('alert_state?key=eq.cron-alerts')).rejects.toThrow(/failed: 504/)
  })

  it('does not retry a 400 (client error is not transient)', async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"bad"}', { status: 400 }))
    await expect(bGet('properties?created_at=gt.x')).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
