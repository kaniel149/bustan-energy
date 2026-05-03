/**
 * JSON-LD schema helpers for Bustan Energy SEO
 *
 * Target keywords:
 *   EN: solar koh phangan, solar surat thani, solar panel installation thailand,
 *       solar farm thailand, commercial solar koh phangan
 *   TH: โซลาร์เซลล์ เกาะพะงัน, ติดตั้งโซลาร์เซลล์ สุราษฎร์ธานี,
 *       โซลาร์เซลล์ ราคา, โซลาร์ฟาร์ม ไทย
 */

export const BASE_URL = 'https://energy-tm.com'
const BUSINESS_ID = `${BASE_URL}/#business`

// ─── LocalBusiness ────────────────────────────────────────────────────────────
// Included on every page via SEOHead. Gives Google the core entity signal.

export function localBusinessSchema(lang: 'en' | 'th') {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'SolarEnergyCompany'],
    '@id': BUSINESS_ID,
    name: 'Bustan Energy',
    alternateName:
      lang === 'th'
        ? ['Bustan Energy เกาะพะงัน', 'Bustan Energy สุราษฎร์ธานี']
        : ['Bustan Energy Ko Phangan', 'Bustan Energy Surat Thani'],
    description:
      lang === 'th'
        ? 'บริษัทติดตั้งโซลาร์เซลล์ชั้นนำในเกาะพะงัน สุราษฎร์ธานี — ระบบโซลาร์สำหรับบ้าน รีสอร์ท และโรงงาน ตั้งแต่ 3kW ถึง 100MW'
        : 'Premium solar energy solutions for Ko Phangan, Surat Thani, and all of Thailand — residential, commercial, and solar farm EPC & PPA.',
    url: BASE_URL,
    telephone: '+66-94-669-2011',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'PX7X+7X',
      addressLocality: lang === 'th' ? 'เกาะพะงัน' : 'Ko Pha-ngan',
      addressRegion: lang === 'th' ? 'สุราษฎร์ธานี' : 'Surat Thani',
      postalCode: '84280',
      addressCountry: 'TH',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 9.7242,
      longitude: 100.0614,
    },
    areaServed: [
      { '@type': 'City', name: lang === 'th' ? 'เกาะพะงัน' : 'Ko Phangan' },
      { '@type': 'City', name: lang === 'th' ? 'เกาะสมุย' : 'Ko Samui' },
      { '@type': 'State', name: lang === 'th' ? 'สุราษฎร์ธานี' : 'Surat Thani' },
      { '@type': 'Country', name: lang === 'th' ? 'ไทย' : 'Thailand' },
    ],
    priceRange: '฿฿฿',
    currenciesAccepted: 'THB',
    paymentAccepted: ['Cash', 'Bank Transfer', 'Credit Card'],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '08:00',
      closes: '18:00',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: lang === 'th' ? 'บริการโซลาร์เซลล์' : 'Solar Energy Services',
    },
    keywords:
      lang === 'th'
        ? 'โซลาร์เซลล์ เกาะพะงัน, ติดตั้งโซลาร์เซลล์, สุราษฎร์ธานี, โซลาร์ฟาร์ม'
        : 'solar koh phangan, solar surat thani, solar panel installation thailand, solar farm thailand',
    sameAs: [
      'https://www.facebook.com/bustanenergy.th',
      'https://www.instagram.com/bustanenergy.th',
    ],
  }
}

// ─── WebSite ─────────────────────────────────────────────────────────────────
// Top-level WebSite entity. Enables sitelinks search box in SERPs.

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    name: 'Bustan Energy',
    url: BASE_URL,
    publisher: { '@id': BUSINESS_ID },
    inLanguage: ['en', 'th'],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────
// Used on /services and /how-it-works pages.

export function serviceSchema(lang: 'en' | 'th') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${BASE_URL}${lang === 'th' ? '/th' : ''}/services#service`,
    provider: { '@id': BUSINESS_ID },
    serviceType: lang === 'th' ? 'ติดตั้งโซลาร์เซลล์' : 'Solar Panel Installation',
    name: lang === 'th' ? 'ติดตั้งโซลาร์เซลล์ครบวงจร' : 'Full-Service Solar Installation',
    description:
      lang === 'th'
        ? 'บริการโซลาร์เซลล์ครบวงจร ตั้งแต่สำรวจหลังคา ออกแบบระบบ จัดหาวัสดุ ติดตั้ง จนถึงบำรุงรักษา สำหรับบ้าน รีสอร์ท และฟาร์ม'
        : 'End-to-end solar solutions: site survey, system design, equipment supply, installation, and maintenance for homes, resorts, and commercial facilities in Ko Phangan and Surat Thani.',
    areaServed: [
      { '@type': 'City', name: lang === 'th' ? 'เกาะพะงัน' : 'Ko Phangan' },
      { '@type': 'State', name: lang === 'th' ? 'สุราษฎร์ธานี' : 'Surat Thani' },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: lang === 'th' ? 'แพ็กเกจโซลาร์เซลล์' : 'Solar Energy Packages',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: lang === 'th' ? 'โซลาร์เซลล์บนหลังคาสำหรับบ้าน' : 'Residential Rooftop Solar',
            description:
              lang === 'th'
                ? 'ระบบโซลาร์เซลล์สำหรับบ้านพักอาศัย ขนาด 3kW – 30kW ลดค่าไฟได้ถึง 80%'
                : 'Rooftop solar systems for homes 3kW – 30kW, reduce electricity bills by up to 80%.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name:
              lang === 'th'
                ? 'โซลาร์เซลล์สำหรับรีสอร์ทและโรงแรม'
                : 'Resort & Hotel Solar Systems',
            description:
              lang === 'th'
                ? 'ระบบโซลาร์เซลล์สำหรับรีสอร์ทและโรงแรม ขนาด 30kW – 500kW'
                : 'Solar systems for resorts and hotels 30kW – 500kW, EPC and PPA options available.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: lang === 'th' ? 'โซลาร์เชิงพาณิชย์' : 'Commercial & Industrial Solar',
            description:
              lang === 'th'
                ? 'ระบบโซลาร์เซลล์สำหรับธุรกิจและโรงงาน ขนาด 30kW – 500kW'
                : 'Solar systems for businesses and factories 30kW – 500kW.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: lang === 'th' ? 'พัฒนาโซลาร์ฟาร์ม' : 'Solar Farm Development',
            description:
              lang === 'th'
                ? 'โซลาร์ฟาร์มขนาดใหญ่ตั้งแต่ 1MW – 100MW EPC และ PPA'
                : 'Utility-scale ground-mount solar farms 1MW – 100MW, full EPC and PPA structuring.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: lang === 'th' ? 'ระบบแบตเตอรี่สำรอง' : 'Battery Energy Storage',
            description:
              lang === 'th'
                ? 'ระบบแบตเตอรี่สำรองพลังงาน Huawei LUNA2000 สำหรับใช้ไฟในเวลากลางคืน'
                : 'Huawei LUNA2000 battery storage for 24/7 solar energy and grid independence.',
          },
        },
      ],
    },
  }
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
// Used on /pricing page to capture featured snippet positions.

export function faqSchema(faqs: ReadonlyArray<{ readonly question: string; readonly answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

// Pre-built FAQ sets for both languages (import and pass directly to faqSchema)

export const PRICING_FAQS_EN = [
  {
    question: 'How much does solar installation cost in Ko Phangan?',
    answer:
      'Residential solar systems in Ko Phangan start at approximately ฿150,000 for a 3kW system and scale up to ฿1,500,000+ for a 30kW commercial setup. Final pricing depends on roof area, shading, system size, and equipment tier. Contact us for a free site assessment.',
  },
  {
    question: 'How long does it take to install solar panels in Ko Phangan?',
    answer:
      'A typical residential installation (3–10kW) takes 2–3 days once equipment arrives on the island. Larger commercial and resort systems take 1–3 weeks. We handle all PEA permits and grid interconnection paperwork.',
  },
  {
    question: 'What is the payback period for solar in Ko Phangan?',
    answer:
      "With Ko Phangan's high electricity tariffs (often 8–10+ THB/kWh for resorts on island rates), payback periods range from 4–7 years for commercial systems and 6–9 years for residential. After payback, energy is essentially free for 20+ years.",
  },
  {
    question: 'Do you offer PPA (Power Purchase Agreement) financing?',
    answer:
      'Yes. Our PPA option requires ฿0 upfront investment. Bustan Energy installs and owns the system; you buy the solar electricity at a fixed rate below your current grid tariff. Ideal for resorts, hotels, and large commercial properties.',
  },
  {
    question: 'Can solar work during the rainy season in Ko Phangan?',
    answer:
      'Yes. Even during overcast and rainy weather, modern panels (LonGi Hi-MO 6, 440W) produce 10–30% of rated capacity. Ko Phangan averages 5.1 peak sun hours per day annually, making it one of the best locations in Thailand for solar ROI.',
  },
  {
    question: 'What brands of solar panels do you install?',
    answer:
      'We install LonGi Hi-MO 6 monocrystalline PERC panels (Tier-1, 440W) with Huawei SUN2000 string inverters and Huawei LUNA2000 battery storage — all with full manufacturer warranties and local service support.',
  },
]

export const PRICING_FAQS_TH = [
  {
    question: 'ค่าติดตั้งโซลาร์เซลล์ในเกาะพะงันเท่าไหร่?',
    answer:
      'ระบบโซลาร์เซลล์สำหรับบ้านพักอาศัยในเกาะพะงันเริ่มต้นที่ประมาณ 150,000 บาท สำหรับระบบ 3kW และสูงถึง 1,500,000 บาทขึ้นไปสำหรับระบบ 30kW เชิงพาณิชย์ ราคาสุดท้ายขึ้นอยู่กับพื้นที่หลังคา เงาบัง ขนาดระบบ และระดับอุปกรณ์ ติดต่อเราเพื่อรับการประเมินสถานที่ฟรี',
  },
  {
    question: 'ติดตั้งโซลาร์เซลล์ในเกาะพะงันใช้เวลานานแค่ไหน?',
    answer:
      'การติดตั้งสำหรับบ้านพักอาศัยทั่วไป (3–10kW) ใช้เวลา 2–3 วันหลังจากอุปกรณ์มาถึงเกาะ ระบบเชิงพาณิชย์และรีสอร์ทขนาดใหญ่ใช้เวลา 1–3 สัปดาห์ เราดูแลเรื่องใบอนุญาต PEA และเอกสารการเชื่อมต่อกริดทั้งหมด',
  },
  {
    question: 'ระยะเวลาคืนทุนโซลาร์เซลล์ในเกาะพะงันกี่ปี?',
    answer:
      'ด้วยค่าไฟฟ้าสูงของเกาะพะงัน (มักถึง 8–10+ บาท/kWh สำหรับรีสอร์ท) ระยะเวลาคืนทุนอยู่ที่ 4–7 ปีสำหรับระบบเชิงพาณิชย์ และ 6–9 ปีสำหรับที่อยู่อาศัย หลังจากนั้นพลังงานแทบฟรีเป็นเวลากว่า 20 ปี',
  },
  {
    question: 'มีตัวเลือก PPA (สัญญาซื้อขายไฟฟ้า) ไหม?',
    answer:
      'มี ตัวเลือก PPA ของเราไม่ต้องลงทุนล่วงหน้า Bustan Energy ติดตั้งและเป็นเจ้าของระบบ คุณซื้อไฟฟ้าโซลาร์ในอัตราคงที่ที่ต่ำกว่าค่าไฟปัจจุบัน เหมาะสำหรับรีสอร์ท โรงแรม และอสังหาริมทรัพย์เชิงพาณิชย์ขนาดใหญ่',
  },
  {
    question: 'โซลาร์เซลล์ทำงานได้ในช่วงฤดูฝนไหม?',
    answer:
      'ได้ แม้ในสภาพอากาศมีเมฆมากหรือฝนตก แผงโซลาร์สมัยใหม่ (LonGi Hi-MO 6, 440W) ยังผลิตไฟได้ 10–30% ของกำลังสูงสุด เกาะพะงันมีชั่วโมงแสงแดดสูงสุดเฉลี่ย 5.1 ชั่วโมงต่อวันตลอดปี ทำให้เป็นหนึ่งในทำเลที่ดีที่สุดในไทยสำหรับการลงทุนโซลาร์',
  },
  {
    question: 'ใช้แผงโซลาร์ยี่ห้ออะไร?',
    answer:
      'เราติดตั้งแผงโซลาร์ LonGi Hi-MO 6 monocrystalline PERC (Tier-1, 440W) พร้อมอินเวอร์เตอร์ Huawei SUN2000 และแบตเตอรี่ Huawei LUNA2000 ทั้งหมดมีการรับประกันจากผู้ผลิตและบริการหลังการขายในพื้นที่',
  },
]

// ─── Article ──────────────────────────────────────────────────────────────────
// Used on individual blog post pages.

export interface ArticleSchemaInput {
  title: string
  description: string
  slug: string
  datePublished: string
  dateModified?: string
  lang: 'en' | 'th'
  imageUrl?: string
}

export function articleSchema(article: ArticleSchemaInput) {
  const langPrefix = article.lang === 'th' ? '/th' : ''
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified ?? article.datePublished,
    inLanguage: article.lang === 'th' ? 'th-TH' : 'en-US',
    url: `${BASE_URL}${langPrefix}/blog/${article.slug}`,
    author: {
      '@type': 'Organization',
      name: 'Bustan Energy',
      url: BASE_URL,
    },
    publisher: {
      '@id': BUSINESS_ID,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}${langPrefix}/blog/${article.slug}`,
    },
    ...(article.imageUrl
      ? {
          image: {
            '@type': 'ImageObject',
            url: article.imageUrl,
          },
        }
      : {}),
  }
}

// ─── BreadcrumbList ───────────────────────────────────────────────────────────
// Signals page hierarchy to Google; enables rich breadcrumb results.

export interface BreadcrumbItem {
  name: string
  url: string
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// Breadcrumb preset builders for each route

export function homeBreadcrumb(lang: 'en' | 'th'): BreadcrumbItem[] {
  return [
    {
      name: lang === 'th' ? 'หน้าหลัก' : 'Home',
      url: lang === 'th' ? `${BASE_URL}/th` : BASE_URL,
    },
  ]
}

export function pageBreadcrumb(
  lang: 'en' | 'th',
  pageName: string,
  path: string
): BreadcrumbItem[] {
  return [
    ...homeBreadcrumb(lang),
    {
      name: pageName,
      url: `${BASE_URL}${lang === 'th' ? '/th' : ''}${path}`,
    },
  ]
}

// ─── Organization ─────────────────────────────────────────────────────────────
// Used on the /about page for brand-level entity reinforcement.

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Bustan Energy',
    legalName: 'Bustan Energy Co., Ltd.',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/assets/logo/bustan-energy.svg`,
      width: 400,
      height: 120,
    },
    description:
      'Premium solar energy company headquartered in Ko Phangan, Thailand. Specializing in residential, commercial, and utility-scale solar EPC and PPA solutions across Surat Thani province.',
    foundingDate: '2018',
    foundingLocation: {
      '@type': 'Place',
      name: 'Ko Phangan, Surat Thani, Thailand',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'PX7X+7X',
      addressLocality: 'Ko Pha-ngan',
      addressRegion: 'Surat Thani',
      postalCode: '84280',
      addressCountry: 'TH',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Thailand',
    },
    knowsAbout: [
      'Solar Energy',
      'Photovoltaic Systems',
      'Solar Panel Installation',
      'PPA Financing',
      'EPC Solar Projects',
      'Battery Energy Storage',
      'Grid-Tied Solar',
      'Off-Grid Solar',
      'Solar Farm Development',
      'LonGi Solar Panels',
      'Huawei Inverters',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: '+66-94-669-2011',
        availableLanguage: ['English', 'Thai'],
      },
    ],
    sameAs: [
      'https://www.facebook.com/bustanenergy.th',
      'https://www.instagram.com/bustanenergy.th',
    ],
  }
}

// ─── WebPage ──────────────────────────────────────────────────────────────────
// Generic WebPage schema to wrap any page with breadcrumb + name signal.

export function webPageSchema(opts: {
  name: string
  description: string
  url: string
  lang: 'en' | 'th'
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${opts.url}#webpage`,
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: opts.lang === 'th' ? 'th-TH' : 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      name: 'Bustan Energy',
      url: BASE_URL,
      publisher: { '@id': BUSINESS_ID },
    },
  }
}
