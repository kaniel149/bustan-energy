import { describe, expect, it } from 'vitest'
import { languageSwitchPath, localizedPublicPath } from './localized-path'

describe('localizedPublicPath', () => {
  it('keeps English paths and sends Hebrew links to real English routes', () => {
    expect(localizedPublicPath('en', '/services')).toBe('/services')
    expect(localizedPublicPath('he', '/')).toBe('/he')
    expect(localizedPublicPath('he', '/services')).toBe('/services')
    expect(localizedPublicPath('he', '/services#farm')).toBe('/services#farm')
    expect(localizedPublicPath('he', '/pricing')).toBe('/pricing')
    expect(localizedPublicPath('he', '/about')).toBe('/about')
    expect(localizedPublicPath('he', '/blog')).toBe('/blog')
    expect(localizedPublicPath('he', '/contact')).toBe('/contact')
    expect(localizedPublicPath('he', '/factory-electricity-bill-solar-assessment')).toBe(
      '/factory-electricity-bill-solar-assessment',
    )
  })

  it('does not build /th/blog or /he/blog article URLs', () => {
    expect(localizedPublicPath('th', '/blog/off-grid-solar-koh-phangan')).toBe(
      '/blog/off-grid-solar-koh-phangan',
    )
    expect(localizedPublicPath('he', '/blog/commercial-solar-roi-thailand')).toBe(
      '/blog/commercial-solar-roi-thailand',
    )
    expect(localizedPublicPath('th', '/blog')).toBe('/th/blog')
  })

  it('prefixes Thai pages that are actually published', () => {
    expect(localizedPublicPath('th', '/')).toBe('/th')
    expect(localizedPublicPath('th', '/services')).toBe('/th/services')
    expect(localizedPublicPath('th', '/services#residential')).toBe('/th/services#residential')
    expect(localizedPublicPath('th', '/solar-rooftop-ko-phangan')).toBe('/th/solar-rooftop-ko-phangan')
  })
})

describe('languageSwitchPath', () => {
  it('sends Hebrew to /he and blog articles to the Thai blog index', () => {
    expect(languageSwitchPath('he', '/services')).toBe('/he')
    expect(languageSwitchPath('he', '/th/pricing')).toBe('/he')
    expect(languageSwitchPath('en', '/he')).toBe('/')
    expect(languageSwitchPath('th', '/he')).toBe('/th')
    expect(languageSwitchPath('th', '/blog/pea-permit-solar-thailand')).toBe('/th/blog')
    expect(languageSwitchPath('th', '/th/services')).toBe('/th/services')
  })
})
