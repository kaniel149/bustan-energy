import { describe, it, expect } from 'vitest'
import { can, isValidRole, type Role } from './bustan-permissions'

describe('can()', () => {
  it('admin can do everything', () => {
    const actions = ['crm.edit', 'crm.quote', 'survey.edit', 'om.edit', 'read'] as const
    for (const a of actions) expect(can('admin', a)).toBe(true)
  })
  it('sales: CRM + quote + read, but not survey/O&M', () => {
    expect(can('sales', 'crm.edit')).toBe(true)
    expect(can('sales', 'crm.quote')).toBe(true)
    expect(can('sales', 'survey.edit')).toBe(false)
    expect(can('sales', 'om.edit')).toBe(false)
  })
  it('engineer: survey + O&M + read, but not CRM edit/quote', () => {
    expect(can('engineer', 'survey.edit')).toBe(true)
    expect(can('engineer', 'om.edit')).toBe(true)
    expect(can('engineer', 'crm.edit')).toBe(false)
    expect(can('engineer', 'crm.quote')).toBe(false)
  })
  it('viewer is read-only', () => {
    expect(can('viewer', 'read')).toBe(true)
    expect(can('viewer', 'crm.edit')).toBe(false)
  })
  it('null/unknown role defaults to read-only', () => {
    expect(can(null, 'read')).toBe(true)
    expect(can(null, 'crm.edit')).toBe(false)
    expect(can('superuser' as Role, 'crm.edit')).toBe(false)
    expect(can('superuser' as Role, 'read')).toBe(true)
  })
})

describe('isValidRole()', () => {
  it('accepts the four roles only', () => {
    expect(isValidRole('admin')).toBe(true)
    expect(isValidRole('viewer')).toBe(true)
    expect(isValidRole('owner')).toBe(false)
    expect(isValidRole(null)).toBe(false)
  })
})
