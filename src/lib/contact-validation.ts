interface ContactDetails {
  name: string
  email: string
  phone: string
}

export interface ContactValidationErrors {
  name?: 'nameRequired'
  email?: 'emailInvalid'
  phone?: 'phoneInvalid'
  contact?: 'contactRequired'
}

// Keep this aligned with api/contact-lead.ts: name plus one contact channel,
// and an invalid supplied email must still be corrected or removed.
export function validateContactDetails(details: ContactDetails): ContactValidationErrors {
  const name = details.name.trim().slice(0, 2000)
  const email = details.email.trim().slice(0, 2000)
  const phone = details.phone.trim().slice(0, 2000)
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const hasPhone = (phone.match(/\d/g) || []).length >= 7
  const errors: ContactValidationErrors = {}

  if (!name) errors.name = 'nameRequired'
  if (email && !hasEmail) errors.email = 'emailInvalid'
  if (!hasEmail && !hasPhone && !email) {
    if (phone) errors.phone = 'phoneInvalid'
    else errors.contact = 'contactRequired'
  }

  return errors
}
