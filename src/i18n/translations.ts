// ─── i18n/translations.ts ─────────────────────────────────────────────────────
// Content for Bustan Energy marketing site (Ko Phangan, Thailand) + the /platform CRM.
// English + Thai (full) + Hebrew (operator/CRM-facing; falls back to English elsewhere).

export type Lang = 'en' | 'th' | 'he'

/** Languages that render right-to-left. */
export const RTL_LANGS: Lang[] = ['he']
export const isRTL = (lang: Lang): boolean => RTL_LANGS.includes(lang)

// ─── ENGLISH ──────────────────────────────────────────────────────────────────
const en = {
  nav: {
    services: 'Services',
    howItWorks: 'How It Works',
    pricing: 'Pricing',
    projects: 'Projects',
    about: 'About',
    blog: 'Blog',
    contact: 'Contact',
    getQuote: 'Get Quote',
    switchLang: 'ภาษาไทย',
  },

  footer: {
    tagline: 'Solar EPC, PPA, PEA coordination, and O&M for Ko Phangan homes and businesses.',
    quickLinks: 'Quick Links',
    servicesTitle: 'Services',
    residential: 'Residential Solar',
    commercial: 'Commercial Solar',
    solarFarms: 'Solar Farms',
    batteryStorage: 'Battery Storage',
    maintenance: 'O&M Services',
    contactTitle: 'Contact',
    whatsapp: 'WhatsApp',
    line: 'LINE: @bustanenergy',
    email: 'Contact Bustan Energy',
    address: 'Ko Pha-ngan, Surat Thani 84280\nThailand',
    copyright: '© 2026 Bustan Energy Co., Ltd. All rights reserved.',
  },

  home: {
    hero: {
      badge: 'Solar EPC, PPA, PEA coordination, and O&M for Ko Phangan',
      title: 'Solar for',
      titleAccent: 'Island Properties',
      subtitle: 'Solar design and installation for homes, villas, resorts, and businesses on Ko Phangan. We model your bill, survey the site, coordinate PEA paperwork, and support the system after handover.',
      ctaPrimary: 'Get Free Quote',
      ctaSecondary: 'WhatsApp Us',
      trustLine: 'PEA documentation support · Tier-1 equipment options · Monitoring · O&M',
    },
    stats: {
      installations: { value: 10, suffix: '', label: 'Sales Steps' },
      installed: { value: 3, suffix: '', label: 'Deal Models' },
      savings: { value: 25, suffix: ' yr', label: 'Model Horizon' },
      experience: { value: 4, suffix: '', label: 'Core Tools' },
    },
    services: {
      sectionTag: 'WHAT WE DO',
      title: 'Our Services',
      residential: {
        title: 'Residential Solar',
        description:
          'Rooftop systems for homes and villas. Reduce your electricity bills and increase property value.',
        cta: 'Learn More',
      },
      commercial: {
        title: 'Commercial Solar',
        description:
          'Power your hotel, resort, or business with clean energy. Maximize ROI with our PPA options.',
        cta: 'Learn More',
      },
      solarFarm: {
        title: 'Solar Farm Development',
        description:
          'Ground-mount installations from 1 MW to 100 MW. Full VSPP licensing and grid connection.',
        cta: 'Learn More',
      },
      batteryStorage: {
        title: 'Battery Storage',
        description: 'Blackout protection and 24/7 power independence. Huawei LUNA battery systems for homes and businesses.',
        cta: 'Learn More',
      },
    },
    why: {
      sectionTag: 'OUR ADVANTAGE',
      title: 'Why Ko Phangan Trusts Bustan Energy',
      items: [
        {
          title: 'Island Specialists',
          description: 'We live here. We know the salt air, the humidity, the storms. Every system is engineered for tropical island conditions.',
        },
        {
          title: 'PEA Licensed',
          description: 'Fully licensed and approved by the Provincial Electricity Authority. No shortcuts, no surprises.',
        },
        {
          title: 'Premium Equipment',
          description: 'Tier-1 panels and bankable inverters selected for the site, warranty, and availability.',
        },
        {
          title: 'Blackout Protection',
          description: "Ko Phangan loses power. Your home doesn't. Battery backup keeps you running 24/7.",
        },
      ],
    },
    process: {
      sectionTag: 'SIMPLE PROCESS',
      title: 'How Solar Installation Works on Ko Phangan',
      subtitle: '4 simple steps from consultation to clean energy',
      steps: [
        {
          title: 'Free Site Survey',
          description: 'We visit your property, assess roof orientation, shading, and energy usage',
        },
        {
          title: 'Custom Design',
          description: 'Solar system designed specifically for your home or business on Ko Phangan',
        },
        {
          title: 'Professional Installation',
          description: 'PEA-certified team, typically 1-3 days from start to finish',
        },
        {
          title: 'Monitor & Maintain',
          description: 'Real-time app monitoring, handover guidance, and ongoing support',
        },
      ],
      statsLine: 'Install window and payback are modeled from your roof, bill, and battery needs',
      cta: 'Get Free Site Survey',
    },
    projects: {
      sectionTag: 'SYSTEM PROFILES',
      title: 'Example Solar Profiles for Ko Phangan',
      viewAll: 'View All Projects',
      items: [
        { name: 'Private Villa', location: 'Haad Rin', size: '8.5kW', savings: '42%', type: 'Residential' },
        { name: 'Beach Resort', location: 'Thong Nai Pan', size: '45kW', savings: '38%', type: 'Commercial' },
        { name: 'Boutique Hotel', location: 'Sri Thanu', size: '22kW', savings: '51%', type: 'Commercial' },
        { name: 'Restaurant & Bar', location: 'Thong Sala', size: '12kW', savings: '44%', type: 'Residential' },
        { name: 'Wellness Center', location: 'Haad Yao', size: '15kW', savings: '48%', type: 'Commercial' },
        { name: 'Off-Grid Villa', location: 'Bottle Beach', size: '6kW + Battery', savings: '95%', type: 'Residential' },
      ],
    },
    cta: {
      sectionTag: 'GET STARTED TODAY',
      title: 'Ready to Power Your Paradise?',
      subtitle: 'Get a site-specific solar assessment for your Ko Phangan home or business.',
      ctaPrimary: 'Get Free Quote',
      ctaWhatsapp: 'WhatsApp Us',
      ctaCall: 'Call Now',
      urgency: 'Free site survey · No obligation · Response within 24 hours',
    },
    partners: {
      title: 'TRUSTED EQUIPMENT PARTNERS',
      items: [
        { name: 'LONGi Solar', subtitle: 'Tier-1 Panels' },
        { name: 'Huawei FusionSolar', subtitle: 'Smart Inverters' },
        { name: 'PEA Thailand', subtitle: 'Grid Authority' },
      ],
    },
    testimonials: {
      sectionTag: 'FIELD NOTES',
      title: 'What Island Properties Ask For',
      rating: 'Common priorities from site assessments',
      items: [
        {
          quote: 'Owners want a system sized from their real PEA bill, not a generic savings percentage.',
          name: 'Villa systems',
          role: 'Bill analysis + roof fit',
          stars: 5,
        },
        {
          quote: 'Resorts care about uptime, clean installation, guest impact, and maintenance access.',
          name: 'Commercial systems',
          role: 'EPC, PPA, and O&M planning',
          stars: 5,
        },
        {
          quote: 'Battery backup is specified from the actual loads that need to stay online during outages.',
          name: 'Hybrid systems',
          role: 'Battery and monitoring design',
          stars: 5,
        },
      ],
    },
    faq: {
      sectionTag: 'FREQUENTLY ASKED QUESTIONS',
      title: 'Solar Energy FAQ for Ko Phangan',
      items: [
        {
          question: 'How much does solar installation cost on Ko Phangan?',
          answer: 'Residential systems (3-15kW) typically cost ฿180,000-฿850,000 depending on roof layout, inverter, battery, mounting, logistics, and PEA scope. Payback depends on your actual bill and self-consumption.',
        },
        {
          question: 'How much can I save with solar panels in Thailand?',
          answer: 'Savings depend on daytime usage, PEA tariff, roof layout, battery choice, and export approval. We calculate savings from your bill instead of using a generic percentage.',
        },
        {
          question: 'Do solar panels work during Thailand\'s rainy season?',
          answer: 'Yes. Modern solar panels generate electricity even on cloudy days — typically 10-25% of peak output. Ko Phangan still receives significant sunshine year-round, and your annual production remains excellent.',
        },
        {
          question: 'What happens during a power outage with solar?',
          answer: 'With a standard grid-tied system, solar shuts off during outages for safety. However, with a battery storage system (like Huawei LUNA), your home stays powered 24/7 regardless of grid outages — a major advantage on Ko Phangan.',
        },
        {
          question: 'Is solar worth it for a small villa on Ko Phangan?',
          answer: 'Often, yes. A small 3-5kW system can reduce daytime grid consumption, but ROI depends on your bill, roof, shading, and whether you need battery backup.',
        },
        {
          question: 'Do I need PEA approval for solar panels?',
          answer: 'Yes, all grid-connected solar systems in Thailand require PEA approval. Bustan Energy handles the entire licensing process for you — from application to final inspection and grid connection.',
        },
        {
          question: 'How long does solar installation take?',
          answer: 'Residential systems typically take 1-3 days to install. Commercial systems (30kW+) take 3-7 days. PEA grid connection approval adds 2-4 weeks, which we manage entirely on your behalf.',
        },
        {
          question: 'What warranty do you offer?',
          answer: 'Each proposal lists the selected equipment warranties and Bustan Energy workmanship coverage in writing. Warranty terms vary by panel, inverter, and battery model.',
        },
      ],
    },
    scrollAnimation: {
      sectionTag: 'SEE THE PROCESS',
      title: 'Watch Your Solar System Come to Life',
      subtitle: 'Scroll through a real installation — from bare roof to fully powered solar system',
    },
  },

  services: {
    hero: {
      tag: 'Our Services',
      title: 'Solar Solutions for',
      titleAccent: 'Every Need',
      subtitle:
        'From rooftop residential systems to utility-scale solar farms — we design, install, and maintain the right solution for you.',
    },
    residential: {
      title: 'Residential Solar',
      description:
        'Complete rooftop solar for homes and villas. We design and install 3kW to 30kW systems tailored to your exact electricity consumption and roof layout.',
      benefits: [
        'Reduce daytime grid consumption',
        'Increase property value significantly',
        'Manufacturer warranty documents included',
        'PEA-compliant export/net-billing setup where approved',
      ],
      cta: 'Get a Free Home Assessment',
    },
    commercial: {
      title: 'Commercial Solar',
      description:
        'Power your hotel, resort, restaurant, or office with solar. We deliver 30kW to 500kW commercial systems built to handle high-demand operations year-round.',
      benefits: [
        'PPA option — zero upfront investment',
        'BOI tax incentives for qualifying businesses',
        'Enhance brand sustainability image',
        'Real-time monitoring dashboard included',
      ],
      cta: 'Request Commercial Proposal',
    },
    solarFarm: {
      title: 'Solar Farm Development',
      description:
        'Ground-mount solar farms from 1MW to 100MW. We manage full VSPP/SPP licensing, PEA grid connection, and long-term operations with drone-based monitoring.',
      benefits: [
        'Monetize unused land with stable income',
        'PEA grid connection — full support',
        'EPC or IPP development models available',
        'Drone-based O&M for maximum uptime',
      ],
      cta: 'Discuss Your Project',
    },
    bottomCta: {
      title: 'Not sure which solution fits?',
      subtitle:
        "Contact us for a free consultation — we'll help you find the perfect solar solution.",
      cta: 'Get Free Consultation',
    },
  },

  howItWorks: {
    hero: {
      tag: 'The Process',
      title: 'Your Solar Journey',
      subtitle:
        "From first call to first kilowatt — here's how we make it happen, step by step.",
    },
    steps: [
      {
        title: 'Free Consultation & Site Survey',
        description:
          'We visit your property, assess your roof, analyze your electricity bills, and understand your goals. Our engineers take precise measurements and shade analysis to ensure your system is designed to perform.',
        duration: '1–2 days',
      },
      {
        title: 'Custom System Design',
        description:
          'Our engineers design a system optimized for your specific roof orientation, shading patterns, and consumption profile. You receive a detailed proposal with system layout, equipment specs, and full ROI projections.',
        duration: '3–5 days',
      },
      {
        title: 'Professional Installation',
        description:
          'Our certified installation team handles everything — panels, inverters, wiring, metering, and PEA grid connection. We work cleanly, safely, and efficiently. Zero hassle for you.',
        duration: '1–3 days',
      },
      {
        title: 'Monitor & Enjoy Savings',
        description:
          'Your system goes live and immediately starts generating savings. Track production, consumption, and savings in real-time via the Huawei FusionSolar app. We provide ongoing maintenance and support.',
        duration: '25+ years of savings',
      },
    ],
    cta: {
      title: 'Ready to start your journey?',
      subtitle:
        "Step one is free. Let's visit your property and show you exactly what solar can do for you.",
      button: 'Start Your Journey Today',
    },
  },

  pricing: {
    hero: {
      tag: 'Pricing',
      title: 'Transparent',
      titleAccent: 'Solar Pricing',
      subtitle: 'No hidden fees. No surprises. Choose the model that fits your goals.',
    },
    models: {
      title: 'Choose Your Model',
      epc: {
        title: 'EPC — Purchase',
        subtitle: 'You own the system',
        features: [
          'You own the system outright',
          '฿0 electricity cost after payback period',
          '4–6 year payback period',
          '25-year equipment warranty',
          'Eligible for tax deductions',
          'Full asset on your balance sheet',
        ],
        bestFor: 'Long-term property owners',
      },
      ppa: {
        title: 'PPA — Power Purchase',
        subtitle: 'Zero upfront cost',
        features: [
          'Zero upfront cost',
          'Save 20–30% from day one',
          'We own, maintain, and monitor',
          'No maintenance responsibility',
          'Contract term: 15–25 years',
          'Predictable, lower energy costs',
        ],
        bestFor: 'Businesses, renters, minimal risk',
      },
    },
    packages: {
      title: 'Package Overview',
      starter: {
        name: 'Starter',
        range: '3–5 kW',
        price: '฿180,000 – ฿300,000',
        ideal: 'Apartments & small homes',
      },
      standard: {
        name: 'Standard',
        range: '10–15 kW',
        price: '฿550,000 – ฿850,000',
        ideal: 'Villas & small businesses',
        badge: 'Popular',
      },
      premium: {
        name: 'Premium',
        range: '30–100 kW',
        price: 'Custom pricing',
        ideal: 'Resorts & commercial',
      },
    },
    note: 'Prices include all equipment, installation, permits, and grid connection. VAT excluded.',
    faqs: {
      title: 'Frequently Asked Questions',
      items: [
        {
          question: 'How long does installation take?',
          answer:
            'For residential systems (3–15kW), installation typically takes 1–2 days. Commercial systems (30–100kW) take 3–7 days depending on size and complexity. We coordinate with PEA for grid connection, which adds 2–4 weeks.',
        },
        {
          question: 'What happens on cloudy days?',
          answer:
            'Modern solar panels still generate electricity on cloudy days — typically 10–25% of their rated output. Ko Phangan averages over 1,800 peak sun hours annually, so even with cloud cover, your annual production remains excellent.',
        },
        {
          question: 'Do I need battery storage?',
          answer:
            'For most properties, battery storage is optional. If you are connected to the PEA grid, export/net-billing may be available only where approved. Batteries are recommended for remote properties, frequent outages, or maximizing self-consumption.',
        },
        {
          question: 'What about maintenance?',
          answer:
            'Solar systems require minimal maintenance. We recommend cleaning panels every 3–6 months and an annual system inspection. We offer maintenance contracts that cover monitoring, cleaning, and any warranty repairs.',
        },
        {
          question: 'Is export/net-billing available in Thailand?',
          answer:
            'Export rules and buyback rates depend on the current PEA/ERC program and project approval. We confirm the applicable arrangement before treating export income as part of the proposal.',
        },
        {
          question: 'What warranties are included?',
          answer:
            'Each proposal lists the selected equipment warranties and Bustan Energy workmanship coverage in writing. Warranty terms vary by panel, inverter, and battery model.',
        },
      ],
    },
    cta: {
      title: 'Ready for a custom quote?',
      subtitle:
        'Every property is unique. Let us calculate the exact cost and savings for your specific situation.',
      button: 'Get Your Custom Quote',
    },
  },

  projects: {
    hero: {
      tag: 'Our Portfolio',
      title: 'Our Work Speaks',
      subtitle:
        'From intimate villa installations to large resort systems — every project is a testament to quality and performance.',
    },
    items: [
      { name: 'Villa Sunset Residence', location: 'Thong Sala', size: '15kW', savings: '42%', type: 'Residential' },
      { name: 'Coconut Beach Resort', location: 'Haad Rin', size: '45kW', savings: '38%', type: 'Commercial' },
      { name: 'Phangan Beach Club', location: 'Srithanu', size: '30kW', savings: '51%', type: 'Commercial' },
      { name: 'Island Wellness Spa', location: 'Chaloklum', size: '20kW', savings: '45%', type: 'Commercial' },
      { name: "Fisherman's Village Hotel", location: 'Bophut', size: '60kW', savings: '35%', type: 'Commercial' },
      { name: 'Mae Haad Dive Center', location: 'Mae Haad', size: '12kW', savings: '55%', type: 'Residential' },
    ],
    stats: {
      totalInstalled: { value: 'Site-specific', label: 'Engineering Review' },
      projectsCompleted: { value: 'PEA-ready', label: 'Documentation' },
      averageSavings: { value: 'Bill-based', label: 'Savings Model' },
    },
    cta: {
      title: 'Want results like these?',
      subtitle:
        'Get a proposal based on your roof, bill, tariff, and PEA requirements.',
      button: 'Get Started Today',
    },
  },

  about: {
    hero: {
      tag: 'About Bustan Energy',
      title: 'Solar Built for Island Operations',
    },
    story: {
      title: 'Our Story',
      paragraphs: [
        'Bustan Energy was born from a simple observation: Ko Phangan receives over 1,800 hours of sunshine per year, yet most of the island still runs on expensive diesel-generated electricity shipped from the mainland. We set out to change that.',
        'We combine solar engineering, local site knowledge, PEA documentation support, procurement, installation, and O&M so island projects can move from bill analysis to operating system with fewer surprises.',
      ],
    },
    mission: 'To make Ko Phangan the most solar-powered island in Southeast Asia.',
    vision: 'Clean, affordable energy for every home and business in paradise.',
    values: {
      title: 'What We Stand For',
      items: [
        {
          title: 'Quality First',
          description:
            'We never cut corners. Tier-1 equipment only, certified installers, and workmanship we stand behind.',
        },
        {
          title: 'Island Community',
          description:
            "We live here. We care about this place and its people. Our success is tied to Ko Phangan's future.",
        },
        {
          title: 'Transparency',
          description:
            'Honest pricing, clear timelines, and no surprises. You will always know exactly what you are getting.',
        },
        {
          title: 'Innovation',
          description:
            'Constantly improving our technology, processes, and monitoring systems to deliver better outcomes.',
        },
      ],
    },
    stats: {
      systems: { value: 500, suffix: '+', label: 'Systems Installed' },
      capacity: { value: 15, suffix: 'MW', label: 'Total Capacity' },
      years: { value: 8, suffix: '+', label: 'Years Operating' },
      incidents: { value: 0, suffix: '', label: 'Safety Incidents' },
    },
    cta: {
      title: 'Come visit us in person',
      subtitle:
        "Schedule a visit to our office in Thong Sala — we'd love to meet you and talk solar over coffee.",
      button: 'Schedule a Visit',
    },
  },

  blog: {
    hero: {
      tag: 'Solar Insights',
      title: 'Solar Insights & Resources',
      subtitle:
        'Expert guides on solar energy in Thailand — regulations, finance, technology, and real-world results.',
    },
    posts: [
      {
        slug: 'solar-energy-koh-phangan-guide',
        tag: 'Guide',
        title: 'The Complete Guide to Solar Energy on Koh Phangan (2026)',
        excerpt:
          'Everything you need to know about going solar on Ko Phangan — costs, system sizes, PEA permits, monsoon performance, and more.',
        date: 'April 2026',
        readTime: '12 min read',
      },
      {
        slug: 'solar-panel-cost-thailand',
        tag: 'Finance',
        title: 'How Much Do Solar Panels Cost in Thailand? (2026 Pricing Guide)',
        excerpt:
          'A transparent breakdown of solar panel prices in Thailand by system size, plus ROI timelines, financing options, and hidden costs.',
        date: 'April 2026',
        readTime: '10 min read',
      },
      {
        slug: 'off-grid-solar-koh-phangan',
        tag: 'Guide',
        title: 'Off-Grid Solar on Koh Phangan: Everything You Need to Know',
        excerpt:
          'A practical guide to off-grid and hybrid solar systems on Ko Phangan — batteries, sizing, costs, and why the island is ideal for it.',
        date: 'April 2026',
        readTime: '11 min read',
      },
      {
        slug: 'koh-phangan-power-outages-solar-solution',
        tag: 'Tips',
        title: 'Koh Phangan Power Outages: Why Solar Is the Solution',
        excerpt:
          'Power outages on Ko Phangan are a fact of life. Here is how solar + battery storage eliminates the problem — and what it costs NOT to act.',
        date: 'April 2026',
        readTime: '8 min read',
      },
      {
        slug: 'thailand-solar-regulations',
        tag: 'Regulations',
        title: "Understanding Thailand's Solar Regulations",
        excerpt:
          'A practical guide to VSPP licensing, PEA requirements, and export/net-billing policies for solar installations in Thailand.',
        date: 'March 2026',
        readTime: '8 min read',
      },
      {
        slug: 'epc-vs-ppa',
        tag: 'Finance',
        title: 'EPC vs PPA: Which Solar Model is Right for You?',
        excerpt:
          'Compare ownership vs lease models for solar installations in Thailand. We break down the financials, risks, and benefits of each.',
        date: 'February 2026',
        readTime: '6 min read',
      },
      {
        slug: 'solar-ko-phangan-guide',
        tag: 'Guide',
        title: 'Solar Energy on Ko Phangan: A Complete Guide',
        excerpt:
          'Everything you need to know about going solar on the island — from permits and PEA connections to optimal panel placement.',
        date: 'January 2026',
        readTime: '12 min read',
      },
      {
        slug: 'battery-storage-thailand',
        tag: 'Technology',
        title: 'Battery Storage: Is It Worth It in Thailand?',
        excerpt:
          'Analyzing the real costs and benefits of adding battery storage to your solar system in the Thai climate and grid context.',
        date: 'January 2026',
        readTime: '7 min read',
      },
      {
        slug: 'how-to-read-pea-bill',
        tag: 'Tips',
        title: 'How to Read Your PEA Electricity Bill',
        excerpt:
          'Decode your Thai electricity bill and understand exactly where your money goes — and how solar changes the equation.',
        date: 'December 2025',
        readTime: '5 min read',
      },
      {
        slug: 'pea-permit-solar-thailand',
        tag: 'Regulations',
        title: 'PEA Permit Process: How to Connect Solar to Thailand\'s Grid',
        excerpt:
          'A step-by-step walkthrough of the PEA solar permit application — documents needed, typical timeline, common mistakes, and tips to speed up approval.',
        date: 'April 2026',
        readTime: '9 min read',
      },
      {
        slug: 'solar-panel-maintenance-thailand',
        tag: 'Tips',
        title: 'Solar Panel Maintenance in Tropical Climate: What You Need to Know',
        excerpt:
          'Humidity, salt air, and monsoon rains affect solar panels differently in the tropics. A complete maintenance guide for Ko Phangan and Thailand.',
        date: 'April 2026',
        readTime: '8 min read',
      },
      {
        slug: 'commercial-solar-roi-thailand',
        tag: 'Business',
        title: 'Commercial Solar ROI in Thailand: Case Study Analysis',
        excerpt:
          'Real ROI analysis for hotels, resorts, and businesses in Thailand — with anonymized case studies, payback calculations, and before/after electricity bills.',
        date: 'April 2026',
        readTime: '11 min read',
      },
    ],
    cta: {
      title: 'Have a solar question?',
      subtitle:
        'Our team is happy to answer any questions about solar energy, regulations, or financing options in Thailand.',
      button: 'Ask Us Anything',
    },
    more: 'More articles coming soon',
    readMore: 'Read More',
  },

  contact: {
    hero: {
      tag: 'Contact Us',
      title: "Let's Talk Solar",
      subtitle:
        'Get in touch for a free consultation — no obligation, no pressure. Just good solar advice.',
    },
    form: {
      name: 'Full Name',
      namePlaceholder: 'Your name',
      email: 'Email',
      emailPlaceholder: 'you@example.com',
      phone: 'Phone / WhatsApp',
      phonePlaceholder: '+66 94 669 2011',
      propertyType: {
        label: 'Property Type',
        placeholder: 'Select type',
        options: ['Home', 'Villa', 'Hotel / Resort', 'Business', 'Land / Farm', 'Other'],
      },
      systemInterest: {
        label: 'System Interest',
        placeholder: 'Select interest',
        options: ['Residential', 'Commercial', 'Solar Farm', 'Not Sure'],
      },
      message: 'Message',
      messagePlaceholder:
        'Tell us about your property, current electricity bill, or any questions...',
      submit: 'Send Message',
      sending: 'Sending...',
      success: {
        title: 'Message Sent!',
        subtitle: "Thank you for reaching out. We'll get back to you within one business day.",
        again: 'Send another message',
      },
    },
    info: {
      whatsapp: {
        label: 'WhatsApp',
        value: '+66 94 669 2011',
        cta: 'Chat with us instantly',
      },
      line: {
        label: 'LINE',
        value: '@bustanenergy',
        cta: 'Add us on LINE',
      },
      email: {
        label: 'Contact Form',
        value: 'Contact Bustan Energy',
        cta: 'Send project details from this page',
      },
      office: {
        label: 'Office',
        value: 'Thong Sala',
        sub: 'Ko Phangan, Surat Thani 84280, Thailand',
      },
      hours: {
        label: 'Office Hours',
        value: 'Monday – Saturday',
        sub: '8:00 AM – 6:00 PM',
      },
    },
  },

  seo: {
    home: {
      title: "Bustan Energy — Solar EPC & PPA on Ko Phangan | Solar Panels Thailand",
      description:
        'Solar EPC, PPA, PEA coordination, and O&M for homes, villas, resorts, businesses, and land projects on Ko Phangan and Surat Thani.',
    },
    services: {
      title: 'Solar Services — Residential, Commercial & Solar Farms | Bustan Energy Ko Phangan',
      description:
        'Complete solar installation services in Ko Phangan: rooftop residential systems, commercial solar, and utility-scale solar farm development. Free consultation.',
    },
    howItWorks: {
      title: 'How Solar Installation Works | Bustan Energy Ko Phangan',
      description:
        'From free consultation to solar monitoring — our 4-step process makes going solar simple. See exactly how Bustan Energy installs your solar system in Ko Phangan.',
    },
    pricing: {
      title: 'Solar Pricing & Packages — EPC & PPA Models | Bustan Energy Ko Phangan',
      description:
        'Transparent solar pricing for Ko Phangan. Choose EPC (own it) or PPA (zero upfront). Starter 3–5kW, Standard 10–15kW, Premium 30–100kW. No hidden fees.',
    },
    projects: {
      title: 'Solar Installation Portfolio | Bustan Energy Ko Phangan Projects',
      description:
        'Review solar project types across Ko Phangan — villa systems, resorts, businesses, and land feasibility studies with EPC and PPA options.',
    },
    about: {
      title: "About Bustan Energy — Solar EPC and PPA for Ko Phangan",
      description:
        'Bustan Energy supports Ko Phangan solar projects with bill analysis, site surveys, EPC/PPA proposals, PEA documentation, procurement, installation, and O&M.',
    },
    blog: {
      title: 'Solar Energy Guides & Insights | Bustan Energy Blog',
      description:
        'Expert articles on solar energy in Thailand — VSPP regulations, EPC vs PPA comparison, battery storage, and real ROI data from Ko Phangan installations.',
    },
    contact: {
      title: 'Contact Bustan Energy — Free Solar Consultation Ko Phangan',
      description:
        'Get a free solar consultation in Ko Phangan. Contact Bustan Energy via WhatsApp, LINE, or email. Office in Thong Sala, Surat Thani. Mon–Sat 8am–6pm.',
    },
  },

  // CRM / Solar Intelligence platform (operator-facing).
  crm: {
    switchLang: 'ภาษาไทย',
    priority: 'Priority',
    reach: { contactable: 'contactable', partial: 'partial', cold: 'cold' },
    leadScore: 'Lead score',
    perYear: '/yr',
    stage: 'Stage',
    assignedTo: 'Assigned to',
    unassigned: 'unassigned',
    nextAction: 'Next action',
    readonly: 'Read-only',
    saving: 'Saving…',
    roleCannot: 'Your role cannot perform this action',
    saveFailed: 'Save failed',
    tabs: { crm: 'CRM', quote: 'Quote', survey: 'Survey', om: 'O&M' },
    quote: { panels: 'panels', inverters: 'inverter(s)', equipment: 'Equipment', labor: 'Labor', total: 'Total (cost)' },
    survey: {
      roofPhotos: 'roof photos', peaBill: 'pea bill', batterySpace: 'battery space',
      shading: 'shading', access: 'access', mainBoard: 'main board', notes: 'notes',
      recommendation: 'recommendation…', go: 'Go', maybe: 'Maybe', nogo: 'No-go', save: 'Save survey',
    },
    om: {
      status: 'monitoring status…', online: 'Online', offline: 'Offline', alert: 'Alert',
      lastReading: 'last reading kWh', performanceRatio: 'performance ratio', notes: 'notes', save: 'Save O&M',
    },
    table: {
      search: 'Search name / area…', allPriorities: 'All priorities', allStages: 'All stages',
      allReach: 'All reach', leads: 'leads', selected: 'selected', setStage: 'Set stage…',
      apply: 'Apply', clear: 'Clear', lead: 'Lead', area: 'Area', phone: 'Phone',
      noMatch: 'No leads match the filters.', moved: 'moved to', failed: 'failed',
    },
    dash: {
      title: 'Bustan CRM — Pipeline', leads: 'Leads', pipeline: 'Pipeline', annualValue: 'Annual value',
      winRate: 'Win rate', funnel: 'Funnel by stage', reachability: 'Reachability', topAreas: 'Top areas',
      recentActivity: 'Recent activity', noActivity: 'No activity yet.',
      noLeads: 'No Bustan leads loaded. Sign in to load the live pipeline.',
      won: 'won', lost: 'lost', nonLost: 'non-lost', savingsYr: 'est. savings/yr',
    },
    /** PropertySidebar action buttons + section headings */
    map: {
      drawRoofFootprint: 'Draw Roof Footprint',
      editRoofFootprint: 'Edit Roof Footprint',
      generateProposal: 'Generate Proposal',
      compareOptions: 'Compare Options (EPC / PPA / Lease)',
      fullSalesProposal: 'Full Sales Proposal',
      quickReportPdf: 'Quick Report (PDF)',
      createBrandedProposal: 'Create Branded Proposal (Admin)',
      unauthorizedProposal: 'Requires sales or admin role',
    },
    /** FilterBar labels */
    filter: {
      solarIntelligence: 'Solar Intelligence',
      bustanPlatform: 'Bustan Energy Platform',
      map: 'Map',
      scanner: 'Scanner',
      pipeline: 'Pipeline',
      dashboard: 'Dashboard',
      rooftops: 'Rooftops',
      land: 'Land',
      searchProperties: 'Search properties...',
      export: 'Export',
      signIn: 'Sign In',
      advancedFilters: 'Advanced Filters',
      clearAll: 'Clear all',
      systemSizeKwp: 'System Size (kWp)',
      buildingType: 'Building Type',
      leadQuality: 'Lead Quality',
      showing: 'Showing',
      roofs: 'Roofs',
      landPlots: 'Land Plots',
      forSale: 'For Sale',
      totalMwp: 'Total MWp',
      leadQualityShort: 'Lead Quality:',
      gridGrade: 'Grid Grade:',
    },
  },
} as const

// ─── THAI ──────────────────────────────────────────────────────────────────────
const th = {
  nav: {
    services: 'บริการ',
    howItWorks: 'ขั้นตอนการทำงาน',
    pricing: 'ราคา',
    projects: 'ผลงาน',
    about: 'เกี่ยวกับเรา',
    blog: 'บทความ',
    contact: 'ติดต่อ',
    getQuote: 'ขอใบเสนอราคา',
    switchLang: 'English',
  },

  footer: {
    tagline:
      'ผู้ติดตั้งโซลาร์เซลล์ที่ได้รับความไว้วางใจมากที่สุดบนเกาะพะงัน พลังงานสะอาดสำหรับทุกบ้านและธุรกิจในสรวงสวรรค์แห่งนี้',
    quickLinks: 'ลิงก์ด่วน',
    servicesTitle: 'บริการ',
    residential: 'โซลาร์เซลล์สำหรับบ้าน',
    commercial: 'โซลาร์เซลล์เชิงพาณิชย์',
    solarFarms: 'ฟาร์มโซลาร์',
    batteryStorage: 'ระบบกักเก็บพลังงาน',
    maintenance: 'บริการซ่อมบำรุง',
    contactTitle: 'ติดต่อ',
    whatsapp: 'WhatsApp',
    line: 'LINE: @bustanenergy',
    email: 'Contact Bustan Energy',
    address: 'ทองสาลา เกาะพะงัน\nสุราษฎร์ธานี 84280 ประเทศไทย',
    copyright: '© 2026 Bustan Energy Co., Ltd. สงวนลิขสิทธิ์ทุกประการ',
  },

  home: {
    hero: {
      badge: 'บริการ EPC, PPA, เอกสาร กฟภ. และ O&M บนเกาะพะงัน',
      title: 'เปลี่ยนแสงอาทิตย์ให้เป็น',
      titleAccent: 'พลังงานของคุณ',
      subtitle: 'ออกแบบและติดตั้งโซลาร์เซลล์สำหรับบ้าน วิลล่า รีสอร์ท และธุรกิจบนเกาะพะงัน พร้อมวิเคราะห์บิล สำรวจหน้างาน และช่วยประสานเอกสาร กฟภ.',
      ctaPrimary: 'ขอใบเสนอราคาฟรี',
      ctaSecondary: 'แชท WhatsApp',
      trustLine: 'ช่วยเตรียมเอกสาร กฟภ. · อุปกรณ์ Tier-1 · Monitoring · O&M',
    },
    stats: {
      installations: { value: 10, suffix: '', label: 'ขั้นตอนฝ่ายขาย' },
      installed: { value: 3, suffix: '', label: 'รูปแบบดีล' },
      savings: { value: 25, suffix: ' ปี', label: 'ช่วงโมเดล' },
      experience: { value: 4, suffix: '', label: 'เครื่องมือหลัก' },
    },
    services: {
      sectionTag: 'บริการของเรา',
      title: 'บริการติดตั้งโซลาร์เซลล์',
      residential: {
        title: 'โซลาร์เซลล์สำหรับบ้านพัก',
        description:
          'ติดตั้งแผงโซลาร์บนหลังคาบ้านและวิลล่า ลดค่าไฟฟ้าและเพิ่มมูลค่าทรัพย์สินของคุณ',
        cta: 'เรียนรู้เพิ่มเติม',
      },
      commercial: {
        title: 'โซลาร์เซลล์เชิงพาณิชย์',
        description:
          'ขับเคลื่อนโรงแรม รีสอร์ท หรือธุรกิจของคุณด้วยพลังงานสะอาด เพิ่มผลตอบแทนสูงสุดด้วยรูปแบบ PPA',
        cta: 'เรียนรู้เพิ่มเติม',
      },
      solarFarm: {
        title: 'พัฒนาฟาร์มโซลาร์',
        description:
          'โครงการติดตั้งภาคพื้นดินตั้งแต่ 1 MW ถึง 100 MW พร้อมใบอนุญาต VSPP และการเชื่อมต่อกริด',
        cta: 'เรียนรู้เพิ่มเติม',
      },
      batteryStorage: {
        title: 'ระบบกักเก็บพลังงาน',
        description: 'ป้องกันไฟดับและใช้พลังงานอิสระ 24 ชม. ระบบแบตเตอรี่ Huawei LUNA สำหรับบ้านและธุรกิจ',
        cta: 'เรียนรู้เพิ่มเติม',
      },
    },
    why: {
      sectionTag: 'ข้อได้เปรียบของเรา',
      title: 'ทำไมเกาะพะงันไว้วางใจ Bustan Energy',
      items: [
        {
          title: 'ผู้เชี่ยวชาญบนเกาะ',
          description: 'เราอยู่ที่นี่ เรารู้จักลมทะเล ความชื้น และพายุ ทุกระบบถูกออกแบบสำหรับสภาพอากาศเกาะเขตร้อน',
        },
        {
          title: 'ได้รับอนุญาตจาก กฟภ.',
          description: 'ได้รับใบอนุญาตและการรับรองจากการไฟฟ้าส่วนภูมิภาคอย่างสมบูรณ์ ไม่มีทางลัด ไม่มีเซอร์ไพรส์',
        },
        {
          title: 'อุปกรณ์ระดับพรีเมียม',
          description: 'แผง Tier-1 และอินเวอร์เตอร์ที่เชื่อถือได้ เลือกตามไซต์งาน การรับประกัน และความพร้อมของสินค้า',
        },
        {
          title: 'ป้องกันไฟดับ',
          description: 'เกาะพะงันไฟดับบ่อย แต่บ้านคุณไม่ต้องดับ ระบบแบตเตอรี่สำรองให้คุณใช้ไฟได้ 24/7',
        },
      ],
    },
    process: {
      sectionTag: 'ขั้นตอนง่ายๆ',
      title: 'ขั้นตอนการติดตั้งโซลาร์เซลล์บนเกาะพะงัน',
      subtitle: '4 ขั้นตอนง่ายๆ จากการปรึกษาสู่พลังงานสะอาด',
      steps: [
        {
          title: 'สำรวจพื้นที่ฟรี',
          description: 'เราเยี่ยมชมทรัพย์สินของคุณ ประเมินทิศทางหลังคา ร่มเงา และการใช้พลังงาน',
        },
        {
          title: 'ออกแบบเฉพาะคุณ',
          description: 'ระบบโซลาร์เซลล์ที่ออกแบบเฉพาะสำหรับบ้านหรือธุรกิจของคุณบนเกาะพะงัน',
        },
        {
          title: 'ติดตั้งโดยผู้เชี่ยวชาญ',
          description: 'ทีมงานที่ได้รับการรับรองจาก กฟภ. ใช้เวลาเพียง 1-3 วัน',
        },
        {
          title: 'มอนิเตอร์และดูแลระบบ',
          description: 'ติดตามผ่านแอปแบบเรียลไทม์ พร้อมคำแนะนำหลังส่งมอบและการดูแลต่อเนื่อง',
        },
      ],
      statsLine: 'ระยะเวลาติดตั้งและคืนทุนคำนวณจากหลังคา บิลค่าไฟ และความต้องการแบตเตอรี่ของคุณ',
      cta: 'ขอสำรวจพื้นที่ฟรี',
    },
    projects: {
      sectionTag: 'ตัวอย่างระบบ',
      title: 'ตัวอย่างโปรไฟล์ระบบโซลาร์สำหรับเกาะพะงัน',
      viewAll: 'ดูผลงานทั้งหมด',
      items: [
        { name: 'วิลล่าส่วนตัว', location: 'หาดรีน', size: '8.5kW', savings: '42%', type: 'บ้านพัก' },
        { name: 'บีช รีสอร์ท', location: 'ท้องนายปาน', size: '45kW', savings: '38%', type: 'ธุรกิจ' },
        { name: 'บูติค โฮเทล', location: 'ศรีธนู', size: '22kW', savings: '51%', type: 'ธุรกิจ' },
        { name: 'ร้านอาหาร', location: 'ทองสาลา', size: '12kW', savings: '44%', type: 'บ้านพัก' },
        { name: 'ศูนย์สุขภาพ', location: 'หาดยาว', size: '15kW', savings: '48%', type: 'ธุรกิจ' },
        { name: 'วิลล่าออฟกริด', location: 'หาดขวด', size: '6kW + แบตเตอรี่', savings: '95%', type: 'บ้านพัก' },
      ],
    },
    cta: {
      sectionTag: 'เริ่มต้นวันนี้',
      title: 'พร้อมเปลี่ยนสวรรค์ให้เป็นพลังงาน?',
      subtitle: 'รับการประเมินระบบโซลาร์เฉพาะไซต์สำหรับบ้านหรือธุรกิจของคุณบนเกาะพะงัน',
      ctaPrimary: 'ขอใบเสนอราคาฟรี',
      ctaWhatsapp: 'แชท WhatsApp',
      ctaCall: 'โทรเลย',
      urgency: 'สำรวจพื้นที่ฟรี · ไม่มีข้อผูกมัด · ตอบกลับภายใน 24 ชั่วโมง',
    },
    partners: {
      title: 'พันธมิตรอุปกรณ์ที่ไว้วางใจได้',
      items: [
        { name: 'LONGi Solar', subtitle: 'แผงโซลาร์ระดับ Tier-1' },
        { name: 'Huawei FusionSolar', subtitle: 'อินเวอร์เตอร์อัจฉริยะ' },
        { name: 'PEA Thailand', subtitle: 'การไฟฟ้าส่วนภูมิภาค' },
      ],
    },
    testimonials: {
      sectionTag: 'บันทึกภาคสนาม',
      title: 'สิ่งที่เจ้าของทรัพย์สินบนเกาะถามหา',
      rating: 'ประเด็นสำคัญจากการประเมินไซต์งาน',
      items: [
        {
          quote: 'เจ้าของบ้านต้องการระบบที่คำนวณจากบิล กฟภ. จริง ไม่ใช่เปอร์เซ็นต์ประหยัดแบบทั่วไป',
          name: 'ระบบสำหรับวิลล่า',
          role: 'วิเคราะห์บิล + ตรวจความเหมาะสมของหลังคา',
          stars: 5,
        },
        {
          quote: 'รีสอร์ทให้ความสำคัญกับความต่อเนื่องของไฟ งานติดตั้งสะอาด ผลกระทบต่อแขก และการเข้าถึงเพื่อซ่อมบำรุง',
          name: 'ระบบเชิงพาณิชย์',
          role: 'วางแผน EPC, PPA และ O&M',
          stars: 5,
        },
        {
          quote: 'แบตเตอรี่สำรองต้องออกแบบจากโหลดจริงที่ต้องการให้ทำงานต่อเนื่องเมื่อไฟดับ',
          name: 'ระบบไฮบริด',
          role: 'ออกแบบแบตเตอรี่และมอนิเตอร์',
          stars: 5,
        },
      ],
    },
    faq: {
      sectionTag: 'คำถามที่พบบ่อย',
      title: 'คำถามที่พบบ่อยเกี่ยวกับโซลาร์เซลล์บนเกาะพะงัน',
      items: [
        {
          question: 'ติดตั้งโซลาร์เซลล์บนเกาะพะงันราคาเท่าไหร่?',
          answer: 'ระบบสำหรับบ้านพัก (3-15kW) ราคาประมาณ 180,000-850,000 บาท ขึ้นกับหลังคา อินเวอร์เตอร์ แบตเตอรี่ โครงยึด โลจิสติกส์ และขอบเขตงาน กฟภ. ระยะคืนทุนขึ้นกับบิลจริงและการใช้ไฟช่วงกลางวัน',
        },
        {
          question: 'ติดโซลาร์เซลล์แล้วประหยัดค่าไฟได้เท่าไหร่?',
          answer: 'เงินประหยัดขึ้นกับการใช้ไฟกลางวัน อัตราค่าไฟ กฟภ. หลังคา แบตเตอรี่ และการอนุมัติส่งไฟกลับ เราคำนวณจากบิลจริงแทนการใช้เปอร์เซ็นต์ทั่วไป',
        },
        {
          question: 'โซลาร์เซลล์ทำงานได้ไหมในช่วงฤดูฝนของประเทศไทย?',
          answer: 'ได้ แผงโซลาร์สมัยใหม่ผลิตไฟฟ้าได้แม้ในวันที่มีเมฆ โดยปกติจะผลิตได้ 10-25% ของกำลังสูงสุด เกาะพะงันยังคงได้รับแสงแดดอย่างมีนัยสำคัญตลอดทั้งปี',
        },
        {
          question: 'ไฟดับแล้วโซลาร์เซลล์ทำงานยังไง?',
          answer: 'ระบบที่เชื่อมต่อกริดมาตรฐานจะหยุดทำงานเมื่อไฟดับเพื่อความปลอดภัย แต่หากมีระบบแบตเตอรี่ (เช่น Huawei LUNA) บ้านของคุณจะมีไฟใช้ 24/7 ไม่ว่ากริดจะเป็นอย่างไร',
        },
        {
          question: 'วิลล่าเล็กๆ บนเกาะพะงันคุ้มไหมที่จะติดโซลาร์?',
          answer: 'หลายกรณีคุ้มค่า ระบบ 3-5kW ช่วยลดการใช้ไฟจากกริดช่วงกลางวันได้ แต่ ROI ขึ้นกับบิล หลังคา เงาบัง และความต้องการแบตเตอรี่',
        },
        {
          question: 'ต้องขออนุญาต กฟภ. ไหมในการติดตั้งโซลาร์?',
          answer: 'ใช่ ระบบโซลาร์ที่เชื่อมต่อกริดทุกระบบต้องได้รับอนุมัติจาก กฟภ. Bustan Energy จัดการกระบวนการรับใบอนุญาตทั้งหมดให้คุณ ตั้งแต่การยื่นคำร้องจนถึงการตรวจสอบและเชื่อมต่อกริด',
        },
        {
          question: 'ติดตั้งโซลาร์เซลล์ใช้เวลานานแค่ไหน?',
          answer: 'ระบบบ้านพักใช้เวลา 1-3 วัน ระบบเชิงพาณิชย์ (30kW+) ใช้เวลา 3-7 วัน การอนุมัติเชื่อมต่อกริดจาก กฟภ. เพิ่มอีก 2-4 สัปดาห์ ซึ่งเราจัดการให้ทั้งหมด',
        },
        {
          question: 'มีการรับประกันอะไรบ้าง?',
          answer: 'ใบเสนอราคาทุกฉบับระบุการรับประกันของอุปกรณ์ที่เลือกและการรับประกันงานติดตั้งของ Bustan Energy เป็นลายลักษณ์อักษร เงื่อนไขแตกต่างตามรุ่นแผง อินเวอร์เตอร์ และแบตเตอรี่',
        },
      ],
    },
    scrollAnimation: {
      sectionTag: 'ดูขั้นตอนการติดตั้ง',
      title: 'ชมระบบโซลาร์เซลล์ของคุณมีชีวิต',
      subtitle: 'เลื่อนเพื่อดูการติดตั้งจริง — จากหลังคาเปล่าสู่ระบบโซลาร์เต็มรูปแบบ',
    },
  },

  services: {
    hero: {
      tag: 'บริการของเรา',
      title: 'โซลาร์เซลล์ครบทุกรูปแบบ',
      titleAccent: 'ตอบโจทย์ทุกความต้องการ',
      subtitle:
        'ตั้งแต่หลังคาบ้านพักอาศัยไปจนถึงฟาร์มโซลาร์ขนาดใหญ่ — เราออกแบบ ติดตั้ง และดูแลรักษาระบบที่เหมาะกับคุณ',
    },
    residential: {
      title: 'ติดตั้งโซลาร์เซลล์บ้านพัก',
      description:
        'ระบบโซลาร์เซลล์บนหลังคาสำหรับบ้านและวิลล่า เราออกแบบและติดตั้งระบบขนาด 3kW ถึง 30kW ที่ปรับให้เข้ากับการใช้งานไฟฟ้าและโครงสร้างหลังคาของคุณโดยเฉพาะ',
      benefits: [
        'ลดค่าไฟฟ้าได้ 40–70% ต่อเดือน',
        'เพิ่มมูลค่าทรัพย์สินอย่างมีนัยสำคัญ',
        'รับประกันอุปกรณ์ 25 ปีพร้อมการติดตั้ง',
        'สิทธิ์ขายไฟคืน PEA ผ่านโครงการ VSPP',
      ],
      cta: 'ขอประเมินบ้านฟรี',
    },
    commercial: {
      title: 'โซลาร์เซลล์เชิงพาณิชย์',
      description:
        'ขับเคลื่อนโรงแรม รีสอร์ท ร้านอาหาร หรือสำนักงานด้วยพลังงานแสงอาทิตย์ เราติดตั้งระบบเชิงพาณิชย์ขนาด 30kW ถึง 500kW ที่ออกแบบมาเพื่อรองรับการใช้งานหนักตลอดทั้งปี',
      benefits: [
        'รูปแบบ PPA — ไม่ต้องลงทุนล่วงหน้า',
        'สิทธิ์ลดหย่อนภาษี BOI สำหรับธุรกิจที่มีคุณสมบัติ',
        'ยกระดับภาพลักษณ์ความยั่งยืนของแบรนด์',
        'แดชบอร์ดมอนิเตอร์แบบเรียลไทม์รวมอยู่ด้วย',
      ],
      cta: 'ขอใบเสนอราคาเชิงพาณิชย์',
    },
    solarFarm: {
      title: 'พัฒนาโครงการฟาร์มโซลาร์',
      description:
        'ฟาร์มโซลาร์ภาคพื้นดินตั้งแต่ 1MW ถึง 100MW เราดูแลการขอใบอนุญาต VSPP/SPP ครบวงจร การเชื่อมต่อกริด PEA และการดำเนินงานระยะยาวด้วยระบบโดรนมอนิเตอร์',
      benefits: [
        'สร้างรายได้จากที่ดินว่างเปล่าอย่างยั่งยืน',
        'เชื่อมต่อกริด PEA — สนับสนุนเต็มรูปแบบ',
        'รูปแบบการพัฒนาทั้ง EPC และ IPP',
        'ดูแลรักษาด้วยโดรนเพื่อประสิทธิภาพสูงสุด',
      ],
      cta: 'พูดคุยเกี่ยวกับโครงการ',
    },
    bottomCta: {
      title: 'ยังไม่แน่ใจว่าเหมาะกับรูปแบบไหน?',
      subtitle:
        'ติดต่อเราเพื่อรับคำปรึกษาฟรี — เราช่วยหาโซลูชั่นโซลาร์เซลล์ที่เหมาะกับคุณที่สุด',
      cta: 'รับคำปรึกษาฟรี',
    },
  },

  howItWorks: {
    hero: {
      tag: 'ขั้นตอนการทำงาน',
      title: 'เส้นทางโซลาร์ของคุณ',
      subtitle:
        'ตั้งแต่โทรศัพท์ครั้งแรกจนถึงกิโลวัตต์แรก — ดูวิธีที่เราทำให้มันเกิดขึ้นทีละขั้นตอน',
    },
    steps: [
      {
        title: 'ปรึกษาฟรีและสำรวจพื้นที่',
        description:
          'เราเยี่ยมชมทรัพย์สินของคุณ ประเมินหลังคา วิเคราะห์บิลค่าไฟ และเข้าใจเป้าหมายของคุณ วิศวกรของเราวัดและวิเคราะห์เงาเพื่อออกแบบระบบที่ให้ประสิทธิภาพสูงสุด',
        duration: '1–2 วัน',
      },
      {
        title: 'ออกแบบระบบเฉพาะสำหรับคุณ',
        description:
          'วิศวกรของเราออกแบบระบบที่เหมาะกับทิศทางหลังคา รูปแบบเงา และการใช้ไฟฟ้าของคุณโดยเฉพาะ คุณจะได้รับข้อเสนอพร้อมแผนผังระบบ รายละเอียดอุปกรณ์ และการคาดการณ์ผลตอบแทนครบถ้วน',
        duration: '3–5 วัน',
      },
      {
        title: 'ติดตั้งโดยทีมผู้เชี่ยวชาญ',
        description:
          'ทีมติดตั้งที่ได้รับการรับรองของเราดูแลทุกอย่าง ตั้งแต่แผงโซลาร์ อินเวอร์เตอร์ สายไฟ มิเตอร์ และการเชื่อมต่อกริด PEA เราทำงานอย่างสะอาด ปลอดภัย และมีประสิทธิภาพ ไม่สร้างความยุ่งยากให้คุณเลย',
        duration: '1–3 วัน',
      },
      {
        title: 'มอนิเตอร์และเพลิดเพลินกับการประหยัด',
        description:
          'ระบบของคุณเริ่มทำงานและประหยัดค่าไฟทันที ติดตามการผลิต การใช้ไฟ และการประหยัดแบบเรียลไทม์ผ่านแอป Huawei FusionSolar เราให้บริการดูแลรักษาและสนับสนุนอย่างต่อเนื่อง',
        duration: '25+ ปีแห่งการประหยัด',
      },
    ],
    cta: {
      title: 'พร้อมเริ่มต้นเส้นทางของคุณหรือยัง?',
      subtitle:
        'ขั้นตอนแรกฟรี มาเยี่ยมชมทรัพย์สินของคุณและแสดงให้เห็นว่าโซลาร์เซลล์จะช่วยคุณได้อย่างไร',
      button: 'เริ่มต้นเส้นทางของคุณวันนี้',
    },
  },

  pricing: {
    hero: {
      tag: 'ราคา',
      title: 'ราคาโซลาร์เซลล์',
      titleAccent: 'โปร่งใส ไม่มีซ่อนเร้น',
      subtitle:
        'ไม่มีค่าธรรมเนียมแอบแฝง ไม่มีเรื่องน่าประหลาดใจ เลือกรูปแบบที่เหมาะกับเป้าหมายของคุณ',
    },
    models: {
      title: 'เลือกรูปแบบที่เหมาะกับคุณ',
      epc: {
        title: 'EPC — ซื้อขาด',
        subtitle: 'คุณเป็นเจ้าของระบบ',
        features: [
          'คุณเป็นเจ้าของระบบทั้งหมด',
          'ค่าไฟ ฿0 หลังจากคืนทุนแล้ว',
          'คืนทุนภายใน 4–6 ปี',
          'รับประกันอุปกรณ์ 25 ปี',
          'สิทธิ์หักลดหย่อนภาษี',
          'เป็นสินทรัพย์ในงบดุลของคุณ',
        ],
        bestFor: 'เจ้าของทรัพย์สินระยะยาว',
      },
      ppa: {
        title: 'PPA — ซื้อไฟฟ้า',
        subtitle: 'ไม่มีค่าใช้จ่ายล่วงหน้า',
        features: [
          'ไม่มีค่าใช้จ่ายล่วงหน้า',
          'ประหยัด 20–30% ตั้งแต่วันแรก',
          'เราเป็นเจ้าของ ดูแล และมอนิเตอร์',
          'ไม่ต้องรับผิดชอบการบำรุงรักษา',
          'ระยะสัญญา 15–25 ปี',
          'ค่าพลังงานที่คาดเดาได้และต่ำลง',
        ],
        bestFor: 'ธุรกิจ ผู้เช่า และผู้ที่ต้องการความเสี่ยงต่ำ',
      },
    },
    packages: {
      title: 'ภาพรวมแพ็คเกจ',
      starter: {
        name: 'Starter',
        range: '3–5 kW',
        price: '฿180,000 – ฿300,000',
        ideal: 'อพาร์ทเมนท์และบ้านขนาดเล็ก',
      },
      standard: {
        name: 'Standard',
        range: '10–15 kW',
        price: '฿550,000 – ฿850,000',
        ideal: 'วิลล่าและธุรกิจขนาดเล็ก',
        badge: 'ยอดนิยม',
      },
      premium: {
        name: 'Premium',
        range: '30–100 kW',
        price: 'ราคาตามโครงการ',
        ideal: 'รีสอร์ทและเชิงพาณิชย์',
      },
    },
    note: 'ราคารวมอุปกรณ์ การติดตั้ง ใบอนุญาต และการเชื่อมต่อกริดทั้งหมด ยังไม่รวม VAT',
    faqs: {
      title: 'คำถามที่พบบ่อย',
      items: [
        {
          question: 'ใช้เวลานานแค่ไหนในการติดตั้ง?',
          answer:
            'สำหรับระบบบ้านพัก (3–15kW) การติดตั้งใช้เวลาประมาณ 1–2 วัน ระบบเชิงพาณิชย์ (30–100kW) ใช้เวลา 3–7 วันขึ้นอยู่กับขนาดและความซับซ้อน การเชื่อมต่อกริด PEA ใช้เวลาเพิ่มอีก 2–4 สัปดาห์',
        },
        {
          question: 'วันที่มีเมฆมากจะเกิดอะไรขึ้น?',
          answer:
            'แผงโซลาร์สมัยใหม่ยังคงผลิตไฟฟ้าได้แม้ในวันที่มีเมฆ โดยทั่วไปประมาณ 10–25% ของกำลังผลิตสูงสุด เกาะพะงันมีชั่วโมงแสงแดดสูงสุดเฉลี่ยกว่า 1,800 ชั่วโมงต่อปี ดังนั้นการผลิตรายปีของคุณยังคงดีเยี่ยม',
        },
        {
          question: 'ต้องการระบบกักเก็บพลังงานไหม?',
          answer:
            'สำหรับทรัพย์สินส่วนใหญ่ แบตเตอรี่เป็นตัวเลือกเสริม หากเชื่อมต่อกริด PEA การส่งไฟส่วนเกินหรือ net-billing ต้องได้รับอนุมัติตามโครงการที่เกี่ยวข้อง แนะนำแบตเตอรี่สำหรับพื้นที่ห่างไกลหรือที่มีไฟดับบ่อย',
        },
        {
          question: 'เรื่องการบำรุงรักษาเป็นอย่างไร?',
          answer:
            'ระบบโซลาร์ต้องการการบำรุงรักษาน้อยมาก แนะนำทำความสะอาดแผงทุก 3–6 เดือน และตรวจสอบระบบปีละครั้ง เรามีสัญญาบำรุงรักษาครอบคลุมการมอนิเตอร์ ทำความสะอาด และการซ่อมแซมตามการรับประกัน',
        },
        {
          question: 'ไทยมีระบบขายไฟส่วนเกินหรือ net-billing ไหม?',
          answer:
            'เงื่อนไขการขายไฟส่วนเกินและอัตรารับซื้อขึ้นกับโครงการ กฟภ./ERC และการอนุมัติของแต่ละระบบ เราจะยืนยันก่อนนำรายได้จากการส่งออกไฟเข้าโมเดล',
        },
        {
          question: 'มีการรับประกันอะไรบ้าง?',
          answer:
            'ใบเสนอราคาทุกฉบับระบุการรับประกันของอุปกรณ์ที่เลือกและการรับประกันงานติดตั้งของ Bustan Energy เป็นลายลักษณ์อักษร เงื่อนไขแตกต่างตามรุ่นแผง อินเวอร์เตอร์ และแบตเตอรี่',
        },
      ],
    },
    cta: {
      title: 'พร้อมรับใบเสนอราคาเฉพาะสำหรับคุณหรือยัง?',
      subtitle:
        'แต่ละทรัพย์สินมีความเป็นเอกลักษณ์ ให้เราคำนวณต้นทุนและการประหยัดที่แน่ชัดสำหรับสถานการณ์ของคุณ',
      button: 'รับใบเสนอราคาของคุณ',
    },
  },

  projects: {
    hero: {
      tag: 'ผลงานของเรา',
      title: 'ผลงานพูดแทนเราได้ดีที่สุด',
      subtitle:
        'ตั้งแต่การติดตั้งวิลล่าขนาดเล็กไปจนถึงระบบรีสอร์ทขนาดใหญ่ — ทุกโครงการคือหลักฐานของคุณภาพและประสิทธิภาพ',
    },
    items: [
      {
        name: 'Villa Sunset Residence',
        location: 'ทองสาลา',
        size: '15kW',
        savings: '42%',
        type: 'ที่อยู่อาศัย',
      },
      {
        name: 'Coconut Beach Resort',
        location: 'หาดรีน',
        size: '45kW',
        savings: '38%',
        type: 'เชิงพาณิชย์',
      },
      {
        name: 'Phangan Beach Club',
        location: 'ศรีธนู',
        size: '30kW',
        savings: '51%',
        type: 'เชิงพาณิชย์',
      },
      {
        name: 'Island Wellness Spa',
        location: 'ชะโลคลัม',
        size: '20kW',
        savings: '45%',
        type: 'เชิงพาณิชย์',
      },
      {
        name: "Fisherman's Village Hotel",
        location: 'โบพุด',
        size: '60kW',
        savings: '35%',
        type: 'เชิงพาณิชย์',
      },
      {
        name: 'Mae Haad Dive Center',
        location: 'แม่หาด',
        size: '12kW',
        savings: '55%',
        type: 'ที่อยู่อาศัย',
      },
    ],
    stats: {
      totalInstalled: { value: 'Site-specific', label: 'รีวิววิศวกรรม' },
      projectsCompleted: { value: 'PEA-ready', label: 'เอกสารพร้อมยื่น' },
      averageSavings: { value: 'Bill-based', label: 'โมเดลจากบิลจริง' },
    },
    cta: {
      title: 'ต้องการผลลัพธ์แบบนี้หรือเปล่า?',
      subtitle:
        'ร่วมกับเจ้าของทรัพย์สินและธุรกิจกว่า 500 แห่งทั่วเกาะพะงันที่ประหยัดค่าไฟด้วยโซลาร์แล้ว',
      button: 'เริ่มต้นวันนี้',
    },
  },

  about: {
    hero: {
      tag: 'เกี่ยวกับ Bustan Energy',
      title: 'โซลาร์ที่ออกแบบสำหรับงานบนเกาะ',
    },
    story: {
      title: 'เรื่องราวของเรา',
      paragraphs: [
        'Bustan Energy เกิดจากการสังเกตเห็นสิ่งง่ายๆ: เกาะพะงันได้รับแสงอาทิตย์มากกว่า 1,800 ชั่วโมงต่อปี แต่ส่วนใหญ่ของเกาะยังคงพึ่งพาไฟฟ้าที่ผลิตจากดีเซลที่มีราคาแพงซึ่งขนส่งมาจากแผ่นดินใหญ่ เราตั้งใจจะเปลี่ยนแปลงสิ่งนั้น',
        'ก่อตั้งโดยวิศวกรโซลาร์และชาวเกาะ เราผสมผสานความเชี่ยวชาญทางเทคนิคเชิงลึกกับความรู้ท้องถิ่น เรารู้จักทุกหมู่บ้าน ทุกจุดเชื่อมต่อกริด และทุกกฎระเบียบของ PEA นั่นคือเหตุผลที่เรากลายเป็นผู้ติดตั้งโซลาร์ที่ได้รับความไว้วางใจมากที่สุดบนเกาะ',
      ],
    },
    mission: 'ทำให้เกาะพะงันเป็นเกาะที่ใช้พลังงานโซลาร์มากที่สุดในเอเชียตะวันออกเฉียงใต้',
    vision: 'พลังงานสะอาดราคาประหยัดสำหรับทุกบ้านและธุรกิจในสรวงสวรรค์',
    values: {
      title: 'สิ่งที่เรายึดถือ',
      items: [
        {
          title: 'คุณภาพเป็นอันดับหนึ่ง',
          description:
            'เราไม่ตัดมุม ใช้เฉพาะอุปกรณ์ระดับ Tier-1 ผู้ติดตั้งที่ได้รับการรับรอง และงานฝีมือที่เรามั่นใจ',
        },
        {
          title: 'ชุมชนเกาะพะงัน',
          description:
            'เราอาศัยอยู่ที่นี่ เราดูแลสถานที่และผู้คนที่นี่ ความสำเร็จของเราผูกพันกับอนาคตของเกาะพะงัน',
        },
        {
          title: 'ความโปร่งใส',
          description:
            'ราคาที่ซื่อสัตย์ ไทม์ไลน์ที่ชัดเจน และไม่มีเรื่องน่าประหลาดใจ คุณจะรู้ตลอดว่าคุณได้รับอะไร',
        },
        {
          title: 'นวัตกรรม',
          description:
            'พัฒนาเทคโนโลยี กระบวนการ และระบบมอนิเตอร์อย่างต่อเนื่องเพื่อผลลัพธ์ที่ดียิ่งขึ้น',
        },
      ],
    },
    stats: {
      systems: { value: 500, suffix: '+', label: 'ระบบที่ติดตั้งแล้ว' },
      capacity: { value: 15, suffix: 'MW', label: 'กำลังการผลิตรวม' },
      years: { value: 8, suffix: '+', label: 'ปีที่ดำเนินงาน' },
      incidents: { value: 0, suffix: '', label: 'อุบัติเหตุด้านความปลอดภัย' },
    },
    cta: {
      title: 'มาเยี่ยมชมเราได้เลย',
      subtitle:
        'นัดหมายเยี่ยมชมสำนักงานของเราที่ทองสาลา เราอยากพบคุณและพูดคุยเรื่องโซลาร์เซลล์สบายๆ',
      button: 'นัดหมายเยี่ยมชม',
    },
  },

  blog: {
    hero: {
      tag: 'ความรู้โซลาร์เซลล์',
      title: 'บทความและแหล่งข้อมูลโซลาร์',
      subtitle:
        'คู่มือจากผู้เชี่ยวชาญเกี่ยวกับพลังงานแสงอาทิตย์ในประเทศไทย — กฎระเบียบ การเงิน เทคโนโลยี และผลลัพธ์จริง',
    },
    posts: [
      {
        slug: 'solar-energy-koh-phangan-guide',
        tag: 'คู่มือ',
        title: 'คู่มือครบวงจร: พลังงานแสงอาทิตย์บนเกาะพะงัน (2026)',
        excerpt:
          'ทุกสิ่งที่ต้องรู้เกี่ยวกับการติดโซลาร์บนเกาะพะงัน — ค่าใช้จ่าย ขนาดระบบ ใบอนุญาต PEA ประสิทธิภาพช่วงมรสุม และอื่นๆ',
        date: 'เมษายน 2026',
        readTime: 'อ่าน 12 นาที',
      },
      {
        slug: 'solar-panel-cost-thailand',
        tag: 'การเงิน',
        title: 'แผงโซลาร์เซลล์ราคาเท่าไหร่ในไทย? (คู่มือราคา 2026)',
        excerpt:
          'รายละเอียดราคาแผงโซลาร์ตามขนาดระบบอย่างโปร่งใส พร้อมระยะเวลาคืนทุน ตัวเลือกทางการเงิน และค่าใช้จ่ายแฝง',
        date: 'เมษายน 2026',
        readTime: 'อ่าน 10 นาที',
      },
      {
        slug: 'off-grid-solar-koh-phangan',
        tag: 'คู่มือ',
        title: 'โซลาร์ออฟกริดบนเกาะพะงัน: ทุกสิ่งที่ต้องรู้',
        excerpt:
          'คู่มือเชิงปฏิบัติเกี่ยวกับระบบโซลาร์ออฟกริดและไฮบริดบนเกาะพะงัน — แบตเตอรี่ การกำหนดขนาด ค่าใช้จ่าย',
        date: 'เมษายน 2026',
        readTime: 'อ่าน 11 นาที',
      },
      {
        slug: 'koh-phangan-power-outages-solar-solution',
        tag: 'เคล็ดลับ',
        title: 'ไฟดับบนเกาะพะงัน: ทำไมโซลาร์คือทางออก',
        excerpt:
          'ไฟดับบนเกาะพะงันเป็นเรื่องปกติ ดูว่าโซลาร์ + แบตเตอรี่จะแก้ปัญหาได้อย่างไร — และต้นทุนของการไม่ทำอะไร',
        date: 'เมษายน 2026',
        readTime: 'อ่าน 8 นาที',
      },
      {
        slug: 'thailand-solar-regulations',
        tag: 'กฎระเบียบ',
        title: 'ทำความเข้าใจกฎระเบียบโซลาร์เซลล์ในไทย',
        excerpt:
          'คู่มือเกี่ยวกับการขอใบอนุญาต VSPP ข้อกำหนดของ PEA และนโยบาย export/net-billing สำหรับการติดตั้งโซลาร์ในประเทศไทย',
        date: 'มีนาคม 2026',
        readTime: 'อ่าน 8 นาที',
      },
      {
        slug: 'epc-vs-ppa',
        tag: 'การเงิน',
        title: 'EPC vs PPA: รูปแบบโซลาร์ไหนเหมาะกับคุณ?',
        excerpt:
          'เปรียบเทียบรูปแบบซื้อขาดกับเช่าสำหรับการติดตั้งโซลาร์ในไทย เราวิเคราะห์ตัวเลขทางการเงิน ความเสี่ยง และประโยชน์ของแต่ละแบบ',
        date: 'กุมภาพันธ์ 2026',
        readTime: 'อ่าน 6 นาที',
      },
      {
        slug: 'solar-ko-phangan-guide',
        tag: 'คู่มือ',
        title: 'พลังงานโซลาร์บนเกาะพะงัน: คู่มือฉบับสมบูรณ์',
        excerpt:
          'ทุกสิ่งที่คุณต้องรู้เกี่ยวกับการติดตั้งโซลาร์บนเกาะ ตั้งแต่ใบอนุญาต การเชื่อมต่อ PEA ไปจนถึงการจัดวางแผงโซลาร์ที่เหมาะที่สุด',
        date: 'มกราคม 2026',
        readTime: 'อ่าน 12 นาที',
      },
      {
        slug: 'battery-storage-thailand',
        tag: 'เทคโนโลยี',
        title: 'แบตเตอรี่กักเก็บพลังงาน: คุ้มค่าในไทยหรือเปล่า?',
        excerpt:
          'วิเคราะห์ต้นทุนและประโยชน์จริงของการเพิ่มระบบกักเก็บพลังงานเข้ากับโซลาร์เซลล์ในบริบทสภาพอากาศและกริดของไทย',
        date: 'มกราคม 2026',
        readTime: 'อ่าน 7 นาที',
      },
      {
        slug: 'how-to-read-pea-bill',
        tag: 'เคล็ดลับ',
        title: 'อ่านบิลค่าไฟ PEA ให้เข้าใจ',
        excerpt:
          'ถอดรหัสบิลค่าไฟฟ้าไทยและเข้าใจว่าเงินของคุณไปไหน และโซลาร์เซลล์จะเปลี่ยนแปลงสมการนั้นอย่างไร',
        date: 'ธันวาคม 2025',
        readTime: 'อ่าน 5 นาที',
      },
      {
        slug: 'pea-permit-solar-thailand',
        tag: 'กฎระเบียบ',
        title: 'กระบวนการขออนุญาต PEA: วิธีเชื่อมต่อโซลาร์กับระบบกริดในไทย',
        excerpt:
          'คำแนะนำทีละขั้นตอนสำหรับการยื่นขออนุญาต PEA — เอกสารที่ต้องใช้ ระยะเวลา ข้อผิดพลาดทั่วไป และเคล็ดลับเร่งอนุมัติ',
        date: 'เมษายน 2026',
        readTime: 'อ่าน 9 นาที',
      },
      {
        slug: 'solar-panel-maintenance-thailand',
        tag: 'เคล็ดลับ',
        title: 'การดูแลรักษาแผงโซลาร์ในสภาพอากาศร้อนชื้น: สิ่งที่ต้องรู้',
        excerpt:
          'ความชื้น เกลือในอากาศ และมรสุม ส่งผลต่อแผงโซลาร์แตกต่างกันในเขตร้อน คู่มือการดูแลรักษาฉบับสมบูรณ์สำหรับเกาะพะงัน',
        date: 'เมษายน 2026',
        readTime: 'อ่าน 8 นาที',
      },
      {
        slug: 'commercial-solar-roi-thailand',
        tag: 'ธุรกิจ',
        title: 'ROI โซลาร์เชิงพาณิชย์ในไทย: วิเคราะห์กรณีศึกษา',
        excerpt:
          'วิเคราะห์ ROI จริงสำหรับโรงแรม รีสอร์ท และธุรกิจในไทย พร้อมกรณีศึกษา การคำนวณระยะคืนทุน และบิลก่อน-หลังติดโซลาร์',
        date: 'เมษายน 2026',
        readTime: 'อ่าน 11 นาที',
      },
    ],
    cta: {
      title: 'มีคำถามเกี่ยวกับโซลาร์เซลล์?',
      subtitle:
        'ทีมงานของเรายินดีตอบทุกคำถามเกี่ยวกับพลังงานแสงอาทิตย์ กฎระเบียบ หรือตัวเลือกทางการเงินในไทย',
      button: 'ถามเราได้เลย',
    },
    more: 'บทความเพิ่มเติมกำลังจะมา',
    readMore: 'อ่านต่อ',
  },

  contact: {
    hero: {
      tag: 'ติดต่อเรา',
      title: 'มาคุยเรื่องโซลาร์กัน',
      subtitle:
        'ติดต่อเราเพื่อรับคำปรึกษาฟรี ไม่มีข้อผูกมัด ไม่มีแรงกดดัน แค่คำแนะนำโซลาร์ที่ดีเท่านั้น',
    },
    form: {
      name: 'ชื่อ-นามสกุล',
      namePlaceholder: 'ชื่อของคุณ',
      email: 'อีเมล',
      emailPlaceholder: 'you@example.com',
      phone: 'โทรศัพท์ / WhatsApp',
      phonePlaceholder: '+66 94 669 2011',
      propertyType: {
        label: 'ประเภทอสังหาริมทรัพย์',
        placeholder: 'เลือกประเภท',
        options: ['บ้าน', 'วิลล่า', 'โรงแรม / รีสอร์ท', 'ธุรกิจ', 'ที่ดิน / ฟาร์ม', 'อื่นๆ'],
      },
      systemInterest: {
        label: 'ประเภทระบบที่สนใจ',
        placeholder: 'เลือกความสนใจ',
        options: ['ที่อยู่อาศัย', 'เชิงพาณิชย์', 'ฟาร์มโซลาร์', 'ยังไม่แน่ใจ'],
      },
      message: 'ข้อความ',
      messagePlaceholder:
        'บอกเราเกี่ยวกับทรัพย์สินของคุณ บิลค่าไฟปัจจุบัน หรือคำถามใดๆ...',
      submit: 'ส่งข้อความ',
      sending: 'กำลังส่ง...',
      success: {
        title: 'ส่งข้อความสำเร็จ!',
        subtitle: 'ขอบคุณที่ติดต่อมา เราจะตอบกลับภายในหนึ่งวันทำการ',
        again: 'ส่งข้อความอีกครั้ง',
      },
    },
    info: {
      whatsapp: {
        label: 'WhatsApp',
        value: '+66 94 669 2011',
        cta: 'แชทกับเราได้ทันที',
      },
      line: {
        label: 'LINE',
        value: '@bustanenergy',
        cta: 'เพิ่มเราใน LINE',
      },
      email: {
        label: 'แบบฟอร์มติดต่อ',
        value: 'ติดต่อ Bustan Energy',
        cta: 'ส่งรายละเอียดโครงการจากหน้านี้',
      },
      office: {
        label: 'สำนักงาน',
        value: 'ทองสาลา',
        sub: 'เกาะพะงัน สุราษฎร์ธานี 84280 ประเทศไทย',
      },
      hours: {
        label: 'เวลาทำการ',
        value: 'จันทร์ – เสาร์',
        sub: '08:00 – 18:00 น.',
      },
    },
  },

  seo: {
    home: {
      title: 'Bustan Energy — ติดตั้งโซลาร์เซลล์เกาะพะงัน อันดับ 1 | แผงโซลาร์ สุราษฎร์ธานี',
      description:
        'บริการโซลาร์ EPC, PPA, เอกสาร กฟภ. และ O&M สำหรับบ้าน วิลล่า รีสอร์ท ธุรกิจ และโครงการที่ดินบนเกาะพะงันและสุราษฎร์ธานี',
    },
    services: {
      title:
        'บริการติดตั้งโซลาร์เซลล์ เกาะพะงัน — บ้าน รีสอร์ท ฟาร์มโซลาร์ | Bustan Energy',
      description:
        'บริการติดตั้งโซลาร์เซลล์ครบวงจรบนเกาะพะงัน สุราษฎร์ธานี หลังคาโซลาร์บ้านพัก โซลาร์เชิงพาณิชย์ และฟาร์มโซลาร์ขนาดใหญ่ ปรึกษาฟรีไม่มีค่าใช้จ่าย',
    },
    howItWorks: {
      title: 'ขั้นตอนการติดตั้งโซลาร์เซลล์ | Bustan Energy เกาะพะงัน',
      description:
        'ตั้งแต่ปรึกษาฟรีจนถึงมอนิเตอร์ระบบ 4 ขั้นตอนง่ายๆ สู่พลังงานแสงอาทิตย์ ดูว่า Bustan Energy ติดตั้งโซลาร์เซลล์บนเกาะพะงัน สุราษฎร์ธานี อย่างไร',
    },
    pricing: {
      title: 'ราคาติดตั้งโซลาร์เซลล์ เกาะพะงัน — EPC และ PPA | Bustan Energy',
      description:
        'ราคาโซลาร์เซลล์โปร่งใสสำหรับเกาะพะงัน เลือก EPC (ซื้อขาด) หรือ PPA (ไม่ต้องลงทุน) ตั้งแต่ 3kW ถึง 100kW ไม่มีค่าธรรมเนียมแอบแฝง ประหยัดค่าไฟฟ้าทันที',
    },
    projects: {
      title:
        'ผลงานติดตั้งโซลาร์เซลล์ | โครงการ Bustan Energy เกาะพะงัน สุราษฎร์ธานี',
      description:
        'ดูประเภทโครงการโซลาร์บนเกาะพะงัน ทั้งวิลล่า รีสอร์ท ธุรกิจ และการศึกษาความเป็นไปได้ของที่ดิน พร้อมตัวเลือก EPC และ PPA',
    },
    about: {
      title: 'เกี่ยวกับ Bustan Energy — Solar EPC และ PPA สำหรับเกาะพะงัน',
      description:
        'Bustan Energy ช่วยโครงการโซลาร์บนเกาะพะงันตั้งแต่วิเคราะห์บิล สำรวจหน้างาน ใบเสนอราคา EPC/PPA เอกสาร กฟภ. จัดซื้อ ติดตั้ง และ O&M',
    },
    blog: {
      title: 'บทความโซลาร์เซลล์ คู่มือพลังงานแสงอาทิตย์ในไทย | Bustan Energy',
      description:
        'บทความจากผู้เชี่ยวชาญเรื่องโซลาร์เซลล์ในประเทศไทย กฎระเบียบ VSPP เปรียบเทียบ EPC vs PPA แบตเตอรี่กักเก็บพลังงาน และข้อมูล ROI จริงจากเกาะพะงัน',
    },
    contact: {
      title: 'ติดต่อ Bustan Energy — ปรึกษาโซลาร์ฟรี เกาะพะงัน สุราษฎร์ธานี',
      description:
        'ขอคำปรึกษาโซลาร์เซลล์ฟรีบนเกาะพะงัน ติดต่อ Bustan Energy ทาง WhatsApp LINE หรืออีเมล สำนักงานที่ทองสาลา สุราษฎร์ธานี จันทร์–เสาร์ 08:00–18:00 น.',
    },
  },
  /** CRM / platform strings — Thai overrides (falls back to English for any missing key) */
  crm: {
    switchLang: 'English',
    map: {
      drawRoofFootprint: 'วาดพื้นที่หลังคา',
      editRoofFootprint: 'แก้ไขพื้นที่หลังคา',
      generateProposal: 'สร้างใบเสนอราคา',
      compareOptions: 'เปรียบเทียบตัวเลือก (EPC / PPA / เช่า)',
      fullSalesProposal: 'ใบเสนอราคาฉบับเต็ม',
      quickReportPdf: 'รายงานด่วน (PDF)',
      createBrandedProposal: 'สร้างใบเสนอราคาแบรนด์ (แอดมิน)',
      unauthorizedProposal: 'ต้องการสิทธิ์ฝ่ายขายหรือแอดมิน',
    },
    filter: {
      solarIntelligence: 'Solar Intelligence',
      bustanPlatform: 'แพลตฟอร์ม Bustan Energy',
      map: 'แผนที่',
      scanner: 'สแกนเนอร์',
      pipeline: 'ไปป์ไลน์',
      dashboard: 'แดชบอร์ด',
      rooftops: 'หลังคา',
      land: 'ที่ดิน',
      searchProperties: 'ค้นหาอสังหาริมทรัพย์...',
      export: 'ส่งออก',
      signIn: 'เข้าสู่ระบบ',
      advancedFilters: 'ตัวกรองขั้นสูง',
      clearAll: 'ล้างทั้งหมด',
      systemSizeKwp: 'ขนาดระบบ (kWp)',
      buildingType: 'ประเภทอาคาร',
      leadQuality: 'คุณภาพลีด',
      showing: 'แสดง',
      roofs: 'หลังคา',
      landPlots: 'ที่ดิน',
      forSale: 'ขาย',
      totalMwp: 'รวม MWp',
      leadQualityShort: 'คุณภาพลีด:',
      gridGrade: 'เกรดกริด:',
    },
  },
} as const

// ─── HEBREW (operator / CRM-facing; falls back to English elsewhere) ────────────
// Only the keys translated here override English; everything else falls back to
// `en` via deepMerge, so the marketing body stays English until translated.
const he = {
  nav: {
    services: 'שירותים',
    howItWorks: 'איך זה עובד',
    pricing: 'תמחור',
    projects: 'פרויקטים',
    about: 'אודות',
    blog: 'בלוג',
    contact: 'צור קשר',
    getQuote: 'קבל הצעה',
    switchLang: 'English',
  },
  crm: {
    switchLang: 'English',
    priority: 'עדיפות',
    reach: { contactable: 'נגיש', partial: 'חלקי', cold: 'קר' },
    leadScore: 'ציון ליד',
    perYear: '/שנה',
    stage: 'שלב',
    assignedTo: 'משויך ל',
    unassigned: 'לא משויך',
    nextAction: 'פעולה הבאה',
    readonly: 'קריאה בלבד',
    saving: 'שומר…',
    roleCannot: 'התפקיד שלך לא מורשה לפעולה זו',
    saveFailed: 'השמירה נכשלה',
    tabs: { crm: 'CRM', quote: 'הצעה', survey: 'סקר', om: 'תחזוקה' },
    quote: { panels: 'פאנלים', inverters: 'ממירים', equipment: 'ציוד', labor: 'עבודה', total: 'סה״כ (עלות)' },
    survey: {
      roofPhotos: 'תמונות גג', peaBill: 'חשבון PEA', batterySpace: 'מקום לסוללה',
      shading: 'הצללה', access: 'גישה', mainBoard: 'לוח ראשי', notes: 'הערות',
      recommendation: 'המלצה…', go: 'מתאים', maybe: 'אולי', nogo: 'לא מתאים', save: 'שמור סקר',
    },
    om: {
      status: 'סטטוס ניטור…', online: 'מחובר', offline: 'מנותק', alert: 'התראה',
      lastReading: 'קריאה אחרונה kWh', performanceRatio: 'יחס ביצועים', notes: 'הערות', save: 'שמור תחזוקה',
    },
    table: {
      search: 'חיפוש שם / אזור…', allPriorities: 'כל העדיפויות', allStages: 'כל השלבים',
      allReach: 'כל הנגישות', leads: 'לידים', selected: 'נבחרו', setStage: 'קבע שלב…',
      apply: 'החל', clear: 'נקה', lead: 'ליד', area: 'אזור', phone: 'טלפון',
      noMatch: 'אין לידים שתואמים את הסינון.', moved: 'הועברו ל', failed: 'נכשלו',
    },
    dash: {
      title: 'Bustan CRM — צנרת מכירות', leads: 'לידים', pipeline: 'צנרת', annualValue: 'ערך שנתי',
      winRate: 'אחוז סגירה', funnel: 'משפך לפי שלב', reachability: 'נגישות', topAreas: 'אזורים מובילים',
      recentActivity: 'פעילות אחרונה', noActivity: 'אין פעילות עדיין.',
      noLeads: 'לא נטענו לידים. התחבר כדי לטעון את הצנרת החיה.',
      won: 'נסגרו', lost: 'אבדו', nonLost: 'לא-אבודים', savingsYr: 'חיסכון משוער/שנה',
    },
    /** PropertySidebar action buttons + section headings — Hebrew */
    map: {
      drawRoofFootprint: 'סמן שטח גג',
      editRoofFootprint: 'ערוך שטח גג',
      generateProposal: 'צור הצעת מחיר',
      compareOptions: 'השוואת אפשרויות (EPC / PPA / שכירה)',
      fullSalesProposal: 'הצעת מכירה מלאה',
      quickReportPdf: 'דוח מהיר (PDF)',
      createBrandedProposal: 'צור הצעה ממותגת (מנהל)',
      unauthorizedProposal: 'נדרש תפקיד מכירות או מנהל',
    },
    /** FilterBar labels — Hebrew */
    filter: {
      solarIntelligence: 'Solar Intelligence',
      bustanPlatform: 'פלטפורמת Bustan Energy',
      map: 'מפה',
      scanner: 'סורק',
      pipeline: 'צנרת',
      dashboard: 'לוח בקרה',
      rooftops: 'גגות',
      land: 'קרקע',
      searchProperties: 'חיפוש נכסים...',
      export: 'ייצוא',
      signIn: 'התחבר',
      advancedFilters: 'סינון מתקדם',
      clearAll: 'נקה הכל',
      systemSizeKwp: 'גודל מערכת (kWp)',
      buildingType: 'סוג מבנה',
      leadQuality: 'איכות ליד',
      showing: 'מציג',
      roofs: 'גגות',
      landPlots: 'מגרשים',
      forSale: 'למכירה',
      totalMwp: 'סה״כ MWp',
      leadQualityShort: 'איכות ליד:',
      gridGrade: 'דרגת רשת:',
    },
  },
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
type Dict = { [k: string]: unknown }
/** Deep-merge `override` onto a clone of `base`; missing keys fall back to base. */
function deepMerge<T extends Dict>(base: T, override: Dict): T {
  const out: Dict = Array.isArray(base) ? [...(base as unknown[])] as unknown as Dict : { ...base }
  for (const key of Object.keys(override)) {
    const o = override[key]
    const b = out[key]
    out[key] = o && b && typeof o === 'object' && typeof b === 'object' && !Array.isArray(o)
      ? deepMerge(b as Dict, o as Dict)
      : o
  }
  return out as T
}

const _th = deepMerge(en as unknown as Dict, th as unknown as Dict) as unknown as typeof en
const _he = deepMerge(en as unknown as Dict, he as unknown as Dict) as unknown as typeof en
export const translations: Record<Lang, typeof en> = { en, th: _th, he: _he }

export type Translations = typeof en
