import { describe, expect, it } from 'vitest'
import { validateContactDetails } from './contact-validation'

describe('contact form validation', () => {
  it.each([
    { name: 'Villa owner', email: 'owner@example.com', phone: '' },
    { name: 'Villa owner', email: '', phone: '+66 (0) 81 234 5678' },
    { name: 'Villa owner', email: '   ', phone: '1234567' },
    { name: 'Villa owner', email: ' owner@example.com ', phone: '   ' },
    { name: 'Villa owner', email: 'owner@example.com', phone: '123' },
  ])('accepts a usable contact channel: %j', (details) => {
    expect(validateContactDetails(details)).toEqual({})
  })

  it('requires a non-blank name and at least one contact channel', () => {
    expect(validateContactDetails({ name: '  ', email: '', phone: '' })).toEqual({
      name: 'nameRequired',
      contact: 'contactRequired',
    })
  })

  it('rejects a supplied invalid email even when the phone is usable', () => {
    expect(validateContactDetails({ name: 'Villa owner', email: 'owner@', phone: '+66 81 234 5678' })).toEqual({
      email: 'emailInvalid',
    })
  })

  it.each(['123456', '+66 (0)', 'call me please'])('rejects an unusable phone when email is omitted: %s', (phone) => {
    expect(validateContactDetails({ name: 'Villa owner', email: '', phone })).toEqual({
      phone: 'phoneInvalid',
    })
  })
})
