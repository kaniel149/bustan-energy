import { describe, it, expect, vi } from 'vitest'
import { fetchScanCandidateRows, type ScanCandidate } from './bustan-crm-service'

const bounds: [[number, number], [number, number]] = [[99.9, 9.6], [100.1, 9.8]]
const rows = (count: number): ScanCandidate[] => Array.from({ length: count }, (_, index) => ({ id: `roof-${index}` }) as ScanCandidate)
type Result = { data: ScanCandidate[] | null; error: { message: string } | null }

function mockClient(data: ScanCandidate[], cap = 1000) {
  const finish = vi.fn((offset: number): Result => ({ data: data.slice(offset, offset + cap), error: null }))
  const ranges = vi.fn()
  const abortSignal = vi.fn()
  const orders = vi.fn()
  const gte = vi.fn()
  const lte = vi.fn()
  const from = vi.fn(() => {
    let offset = 0
    const query = {
      select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      gte: vi.fn((...args: unknown[]) => { gte(...args); return query }),
      lte: vi.fn((...args: unknown[]) => { lte(...args); return query }),
      order: vi.fn((...args: unknown[]) => { orders(...args); return query }),
      range: vi.fn((start: number, end: number) => { offset = start; ranges(start, end); return query }),
      abortSignal: vi.fn((signal: AbortSignal) => { abortSignal(signal); return query }),
      then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve().then(() => finish(offset)).then(resolve, reject),
    }
    return query
  })
  return { client: { from } as never, from, finish, ranges, abortSignal, orders, gte, lte }
}

describe('fetchScanCandidateRows', () => {
  it('loads an entire region beyond 10,000 rows in stable order', async () => {
    const data = rows(10_025)
    const mock = mockClient(data)
    expect(await fetchScanCandidateRows(bounds, undefined, undefined, mock.client)).toEqual(data)
    expect(mock.ranges).toHaveBeenLastCalledWith(10_025, 11_024)
    expect(mock.orders).toHaveBeenCalledWith('estimated_kwp', { ascending: false, nullsFirst: false })
    expect(mock.orders).toHaveBeenCalledWith('id', { ascending: true })
    expect(mock.gte).toHaveBeenCalledWith('lat', 9.6)
    expect(mock.lte).toHaveBeenCalledWith('lon', 100.1)
  })

  it('continues when the server caps pages below the requested size', async () => {
    const data = rows(5)
    const mock = mockClient(data, 2)
    expect(await fetchScanCandidateRows(bounds, ['pending'], undefined, mock.client)).toEqual(data)
    expect(mock.ranges.mock.calls).toEqual([[0, 999], [2, 1001], [4, 1003], [5, 1004]])
  })

  it('throws an incomplete-page error rather than returning partial results', async () => {
    const mock = mockClient(rows(3), 2)
    mock.finish.mockImplementation((offset) => offset === 0
      ? { data: rows(2), error: null }
      : { data: null, error: { message: 'connection lost' } })
    await expect(fetchScanCandidateRows(bounds, undefined, undefined, mock.client)).rejects.toMatchObject({ message: 'connection lost' })
  })

  it('supports cancellation before and during a request', async () => {
    const controller = new AbortController()
    const mock = mockClient(rows(3), 2)
    mock.finish.mockImplementation(() => { controller.abort(); return { data: rows(2), error: null } })
    await expect(fetchScanCandidateRows(bounds, undefined, controller.signal, mock.client)).rejects.toMatchObject({ name: 'AbortError' })
    expect(mock.abortSignal).toHaveBeenCalledWith(controller.signal)
    expect(mock.from).toHaveBeenCalledTimes(1)
    mock.from.mockClear()
    await expect(fetchScanCandidateRows(bounds, undefined, controller.signal, mock.client)).rejects.toMatchObject({ name: 'AbortError' })
    expect(mock.from).not.toHaveBeenCalled()
  })

  it('reports an unconfigured client as a connection error', async () => {
    await expect(fetchScanCandidateRows(bounds, undefined, undefined, null)).rejects.toThrow('Not connected to the Bustan database')
  })
})
