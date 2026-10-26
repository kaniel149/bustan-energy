import { describe, expect, it } from 'vitest'
import { isWebGLAvailable } from './webgl'

const docWith = (ctx: unknown) =>
  ({ createElement: () => ({ getContext: () => ctx }) }) as unknown as Document

describe('isWebGLAvailable', () => {
  it('is false without a document (SSR / tests)', () => {
    expect(isWebGLAvailable(undefined)).toBe(false)
  })
  it('is false when the browser cannot create a context', () => {
    expect(isWebGLAvailable(docWith(null))).toBe(false)
  })
  it('is true when a context is returned', () => {
    expect(isWebGLAvailable(docWith({}))).toBe(true)
  })
  it('is false when getContext throws', () => {
    const doc = { createElement: () => ({ getContext: () => { throw new Error('boom') } }) } as unknown as Document
    expect(isWebGLAvailable(doc)).toBe(false)
  })
})
