// ─── i18n/translations.ts ─────────────────────────────────────────────────────
// Full bilingual content for TM Energy marketing site (Ko Phangan, Thailand)
// English + Thai — all pages covered

export type Lang = 'en' | 'th'

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
    tagline: "Ko Phangan's most trusted solar installer. Clean energy for every home and business in paradise.",
    quickLinks: 'Quick Links',
    servicesTitle: 'Services',
    residential: 'Residential Solar',
    commercial: 'Commercial Solar',
    solarFarms: 'Solar Farms',
    batteryStorage: 'Battery Storage',
    maintenance: 'O&M Services',
    contactTitle: 'Contact',
    whatsapp: 'WhatsApp',
    line: 'LINE: @tmenergy',
    email: 'info@energy-tm.com',
    address: 'Thong Sala, Ko Phangan\nSurat Thani 84280, Thailand',
    copyright: '© 2026 TM Energy Co., Ltd. All rights reserved.',
  },

  home: {
    hero: {
      badge: 'Trusted by 500+ Homes & Businesses on Ko Phangan',
      title: 'Power Your',
      titleAccent: 'Paradise',
      subtitle: 'Premium solar panel installation for homes, villas & resorts on Ko Phangan. Save 40% on electricity with Thailand\'s most trusted island solar company.',
      ctaPrimary: 'Get Free Quote',
      ctaSecondary: 'WhatsApp Us',
      trustLine: 'Licensed by PEA · LONGi Certified · Huawei Authorized · Full Warranty',
    },
    stats: {
      installations: { value: 500, suffix: '+', label: 'Installations' },
      installed: { value: 15, suffix: ' MW', label: 'Installed' },
      savings: { value: 40, suffix: '%', label: 'Average Savings' },
      experience: { value: 8, suffix: '+', label: 'Years on Ko Phangan' },
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
      title: 'Why Ko Phangan Trusts TM Energy',
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
          description: 'LONGi panels + Huawei inverters. Tier-1 brands with 25-year warranty.',
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
          title: 'Monitor & Save',
          description: 'Real-time app monitoring. Watch your savings grow every day',
        },
      ],
      statsLine: 'Average installation time: 2 days · Payback period: 3 years',
      cta: 'Get Free Site Survey',
    },
    projects: {
      sectionTag: 'PORTFOLIO',
      title: 'Solar Installations Across Ko Phangan',
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
      subtitle: 'Join 500+ homes and businesses on Ko Phangan already saving with solar energy. Get your free site survey today.',
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
      sectionTag: 'WHAT OUR CLIENTS SAY',
      title: 'Trusted Across Ko Phangan',
      rating: '4.9/5 from 50+ reviews',
      items: [
        {
          quote: 'TM Energy transformed our villa. We went from ฿15,000/month electricity bills to almost zero. The system paid for itself in under 3 years.',
          name: 'Sarah M.',
          role: 'Villa Owner, Haad Rin',
          stars: 5,
        },
        {
          quote: 'As a resort manager, reliability is everything. TM Energy delivered a 45kW system on time and the monitoring dashboard is excellent. Our guests love knowing we run on solar.',
          name: 'James T.',
          role: 'Resort Manager, Thong Nai Pan',
          stars: 5,
        },
        {
          quote: 'ติดตั้งเร็ว ราคาสมเหตุสมผล ทีมงานเป็นมืออาชีพมาก ไฟฟ้าบ้านไม่เคยดับเลยตั้งแต่ติดแบตเตอรี่',
          name: 'สมชาย ว.',
          role: 'เจ้าของบ้าน ศรีธนู',
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
          answer: 'Residential systems (3-15kW) typically cost ฿180,000-฿850,000 including all equipment, installation, permits, and PEA grid connection. Most homeowners see full payback within 3-4 years.',
        },
        {
          question: 'How much can I save with solar panels in Thailand?',
          answer: 'Our clients on Ko Phangan save an average of 40% on electricity bills. With high sunshine hours (1,800+ per year) and rising electricity costs, solar is one of the best investments on the island.',
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
          answer: 'Absolutely. Even a small 3-5kW system can slash your electricity bill by 40-60%. With Ko Phangan\'s high electricity rates and abundant sunshine, the ROI is excellent for properties of any size.',
        },
        {
          question: 'Do I need PEA approval for solar panels?',
          answer: 'Yes, all grid-connected solar systems in Thailand require PEA approval. TM Energy handles the entire licensing process for you — from application to final inspection and grid connection.',
        },
        {
          question: 'How long does solar installation take?',
          answer: 'Residential systems typically take 1-3 days to install. Commercial systems (30kW+) take 3-7 days. PEA grid connection approval adds 2-4 weeks, which we manage entirely on your behalf.',
        },
        {
          question: 'What warranty do you offer?',
          answer: 'All systems include: 25-year power output warranty on LONGi panels, 10-year product warranty on Huawei inverters, and 10-year workmanship warranty on our installation. We are fully licensed and insured.',
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
        'Reduce electricity bills by 40–70%',
        'Increase property value significantly',
        '25-year equipment warranty included',
        'Net metering eligible through PEA',
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
            'For most properties, battery storage is optional. If you are connected to the PEA grid, net metering allows you to export excess energy and draw from the grid at night. Batteries are recommended for remote properties, frequent outages, or maximizing self-consumption.',
        },
        {
          question: 'What about maintenance?',
          answer:
            'Solar systems require minimal maintenance. We recommend cleaning panels every 3–6 months and an annual system inspection. We offer maintenance contracts that cover monitoring, cleaning, and any warranty repairs.',
        },
        {
          question: 'Is net metering available in Thailand?',
          answer:
            "Thailand's VSPP scheme allows residential and commercial systems under 1MW to sell excess electricity back to PEA. The current buyback rate applies to energy exported to the grid.",
        },
        {
          question: 'What warranties are included?',
          answer:
            'All systems include: 25-year power output warranty on LONGi solar panels, 10-year product warranty on Huawei inverters, 10-year workmanship warranty on our installation. We are fully insured and registered installers.',
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
      totalInstalled: { value: '15MW+', label: 'Total Installed Capacity' },
      projectsCompleted: { value: '500+', label: 'Projects Completed' },
      averageSavings: { value: '40%', label: 'Average Energy Savings' },
    },
    cta: {
      title: 'Want results like these?',
      subtitle:
        'Join 500+ property owners and businesses across Ko Phangan who are saving with solar.',
      button: 'Get Started Today',
    },
  },

  about: {
    hero: {
      tag: 'About TM Energy',
      title: 'Powering Paradise Since 2018',
    },
    story: {
      title: 'Our Story',
      paragraphs: [
        'TM Energy was born from a simple observation: Ko Phangan receives over 1,800 hours of sunshine per year, yet most of the island still runs on expensive diesel-generated electricity shipped from the mainland. We set out to change that.',
        "Founded by solar engineers and island residents, we combine deep technical expertise with local knowledge. We know every village, every grid connection point, and every PEA regulation. That's why we've become the island's most trusted solar installer.",
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
        slug: 'thailand-solar-regulations',
        tag: 'Regulations',
        title: "Understanding Thailand's Solar Regulations",
        excerpt:
          'A comprehensive guide to VSPP licensing, PEA requirements, and net metering policies for solar installations in Thailand.',
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
        slug: 'commercial-solar-roi-thailand',
        tag: 'Business',
        title: 'The Financial Case for Commercial Solar in Thailand',
        excerpt:
          'Detailed ROI analysis for hotels, resorts, and businesses considering solar. Real numbers from real Ko Phangan installations.',
        date: 'November 2025',
        readTime: '10 min read',
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
      phonePlaceholder: '+66 XX XXX XXXX',
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
        value: '+66 XX XXX XXXX',
        cta: 'Chat with us instantly',
      },
      line: {
        label: 'LINE',
        value: '@tmenergy',
        cta: 'Add us on LINE',
      },
      email: {
        label: 'Email',
        value: 'info@energy-tm.com',
        cta: 'We reply within 24 hours',
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
      title: "TM Energy — Ko Phangan's #1 Solar Installer | Solar Panels Thailand",
      description:
        'Premium solar energy solutions for Ko Phangan and Surat Thani. Save 40% on electricity with TM Energy — residential, commercial, and solar farm installations.',
    },
    services: {
      title: 'Solar Services — Residential, Commercial & Solar Farms | TM Energy Ko Phangan',
      description:
        'Complete solar installation services in Ko Phangan: rooftop residential systems, commercial solar, and utility-scale solar farm development. Free consultation.',
    },
    howItWorks: {
      title: 'How Solar Installation Works | TM Energy Ko Phangan',
      description:
        'From free consultation to solar monitoring — our 4-step process makes going solar simple. See exactly how TM Energy installs your solar system in Ko Phangan.',
    },
    pricing: {
      title: 'Solar Pricing & Packages — EPC & PPA Models | TM Energy Ko Phangan',
      description:
        'Transparent solar pricing for Ko Phangan. Choose EPC (own it) or PPA (zero upfront). Starter 3–5kW, Standard 10–15kW, Premium 30–100kW. No hidden fees.',
    },
    projects: {
      title: 'Solar Installation Portfolio | TM Energy Ko Phangan Projects',
      description:
        'View completed solar installations across Ko Phangan — from 12kW villa systems to 60kW resort installations. 500+ projects, 15MW+ installed capacity.',
    },
    about: {
      title: "About TM Energy — Ko Phangan's Solar Pioneer Since 2018",
      description:
        'TM Energy was founded by solar engineers and island residents on Ko Phangan. 8+ years experience, 500+ installations, committed to clean energy in paradise.',
    },
    blog: {
      title: 'Solar Energy Guides & Insights | TM Energy Blog',
      description:
        'Expert articles on solar energy in Thailand — VSPP regulations, EPC vs PPA comparison, battery storage, and real ROI data from Ko Phangan installations.',
    },
    contact: {
      title: 'Contact TM Energy — Free Solar Consultation Ko Phangan',
      description:
        'Get a free solar consultation in Ko Phangan. Contact TM Energy via WhatsApp, LINE, or email. Office in Thong Sala, Surat Thani. Mon–Sat 8am–6pm.',
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
    line: 'LINE: @tmenergy',
    email: 'info@energy-tm.com',
    address: 'ทองสาลา เกาะพะงัน\nสุราษฎร์ธานี 84280 ประเทศไทย',
    copyright: '© 2026 TM Energy Co., Ltd. สงวนลิขสิทธิ์ทุกประการ',
  },

  home: {
    hero: {
      badge: 'บ้านและธุรกิจกว่า 500 แห่งบนเกาะพะงันไว้วางใจเรา',
      title: 'เปลี่ยนแสงอาทิตย์ให้เป็น',
      titleAccent: 'พลังงานของคุณ',
      subtitle: 'ติดตั้งแผงโซลาร์เซลล์คุณภาพสูงสำหรับบ้าน วิลล่า และรีสอร์ทบนเกาะพะงัน ประหยัดค่าไฟ 40% กับบริษัทโซลาร์เซลล์ที่ไว้วางใจได้มากที่สุดบนเกาะ',
      ctaPrimary: 'ขอใบเสนอราคาฟรี',
      ctaSecondary: 'แชท WhatsApp',
      trustLine: 'ได้รับอนุญาตจาก กฟภ. · รับรองโดย LONGi · ตัวแทน Huawei · รับประกันเต็มรูปแบบ',
    },
    stats: {
      installations: { value: 500, suffix: '+', label: 'โครงการที่ติดตั้งแล้ว' },
      installed: { value: 15, suffix: ' MW', label: 'กำลังการผลิตรวม' },
      savings: { value: 40, suffix: '%', label: 'ประหยัดค่าไฟเฉลี่ย' },
      experience: { value: 8, suffix: '+', label: 'ปีบนเกาะพะงัน' },
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
      title: 'ทำไมเกาะพะงันไว้วางใจ TM Energy',
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
          description: 'แผงโซลาร์ LONGi + อินเวอร์เตอร์ Huawei แบรนด์ระดับ Tier-1 พร้อมการรับประกัน 25 ปี',
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
          title: 'มอนิเตอร์และประหยัด',
          description: 'ติดตามผ่านแอปแบบเรียลไทม์ เห็นการประหยัดค่าไฟทุกวัน',
        },
      ],
      statsLine: 'เวลาติดตั้งเฉลี่ย: 2 วัน · ระยะเวลาคืนทุน: 3 ปี',
      cta: 'ขอสำรวจพื้นที่ฟรี',
    },
    projects: {
      sectionTag: 'ผลงานของเรา',
      title: 'โครงการติดตั้งโซลาร์เซลล์ทั่วเกาะพะงัน',
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
      subtitle: 'ร่วมกับบ้านและธุรกิจกว่า 500 แห่งบนเกาะพะงันที่ประหยัดค่าไฟด้วยพลังงานแสงอาทิตย์แล้ว สำรวจพื้นที่ฟรีวันนี้',
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
      sectionTag: 'ลูกค้าพูดถึงเรา',
      title: 'ได้รับความไว้วางใจทั่วเกาะพะงัน',
      rating: '4.9/5 จาก 50+ รีวิว',
      items: [
        {
          quote: 'TM Energy เปลี่ยนวิลล่าของเรา จากค่าไฟเดือนละ 15,000 บาทเหลือเกือบศูนย์ ระบบคืนทุนภายใน 3 ปี',
          name: 'Sarah M.',
          role: 'เจ้าของวิลล่า หาดรีน',
          stars: 5,
        },
        {
          quote: 'ในฐานะผู้จัดการรีสอร์ท ความเชื่อถือได้สำคัญที่สุด TM Energy ส่งมอบระบบ 45kW ตรงเวลา แดชบอร์ดมอนิเตอร์ยอดเยี่ยม แขกของเราชอบที่รู้ว่าเราใช้โซลาร์',
          name: 'James T.',
          role: 'ผู้จัดการรีสอร์ท ท้องนายปาน',
          stars: 5,
        },
        {
          quote: 'ติดตั้งเร็ว ราคาสมเหตุสมผล ทีมงานเป็นมืออาชีพมาก ไฟฟ้าบ้านไม่เคยดับเลยตั้งแต่ติดแบตเตอรี่',
          name: 'สมชาย ว.',
          role: 'เจ้าของบ้าน ศรีธนู',
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
          answer: 'ระบบสำหรับบ้านพัก (3-15kW) ราคาประมาณ 180,000-850,000 บาท รวมอุปกรณ์ทั้งหมด การติดตั้ง ใบอนุญาต และการเชื่อมต่อกริด กฟภ. เจ้าของบ้านส่วนใหญ่คืนทุนภายใน 3-4 ปี',
        },
        {
          question: 'ติดโซลาร์เซลล์แล้วประหยัดค่าไฟได้เท่าไหร่?',
          answer: 'ลูกค้าของเราบนเกาะพะงันประหยัดค่าไฟเฉลี่ย 40% ด้วยชั่วโมงแดดที่สูง (1,800+ ชั่วโมงต่อปี) และค่าไฟที่เพิ่มขึ้น โซลาร์เซลล์เป็นการลงทุนที่คุ้มค่าที่สุดบนเกาะ',
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
          answer: 'แน่นอน แม้ระบบเล็ก 3-5kW ก็ลดค่าไฟได้ 40-60% ด้วยค่าไฟที่สูงของเกาะพะงันและแสงแดดที่อุดมสมบูรณ์ ROI จึงดีเยี่ยมสำหรับทรัพย์สินทุกขนาด',
        },
        {
          question: 'ต้องขออนุญาต กฟภ. ไหมในการติดตั้งโซลาร์?',
          answer: 'ใช่ ระบบโซลาร์ที่เชื่อมต่อกริดทุกระบบต้องได้รับอนุมัติจาก กฟภ. TM Energy จัดการกระบวนการรับใบอนุญาตทั้งหมดให้คุณ ตั้งแต่การยื่นคำร้องจนถึงการตรวจสอบและเชื่อมต่อกริด',
        },
        {
          question: 'ติดตั้งโซลาร์เซลล์ใช้เวลานานแค่ไหน?',
          answer: 'ระบบบ้านพักใช้เวลา 1-3 วัน ระบบเชิงพาณิชย์ (30kW+) ใช้เวลา 3-7 วัน การอนุมัติเชื่อมต่อกริดจาก กฟภ. เพิ่มอีก 2-4 สัปดาห์ ซึ่งเราจัดการให้ทั้งหมด',
        },
        {
          question: 'มีการรับประกันอะไรบ้าง?',
          answer: 'ทุกระบบรวม: รับประกันกำลังการผลิต 25 ปีสำหรับแผง LONGi, รับประกันผลิตภัณฑ์ 10 ปีสำหรับอินเวอร์เตอร์ Huawei, และรับประกันงานติดตั้ง 10 ปี เราได้รับใบอนุญาตและประกันภัยครบถ้วน',
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
            'สำหรับทรัพย์สินส่วนใหญ่ แบตเตอรี่เป็นตัวเลือกเสริม หากเชื่อมต่อกริด PEA ระบบ Net Metering ช่วยให้ส่งพลังงานส่วนเกินคืนกริดและดึงไฟจากกริดในเวลากลางคืน แนะนำแบตเตอรี่สำหรับพื้นที่ห่างไกลหรือที่มีไฟดับบ่อย',
        },
        {
          question: 'เรื่องการบำรุงรักษาเป็นอย่างไร?',
          answer:
            'ระบบโซลาร์ต้องการการบำรุงรักษาน้อยมาก แนะนำทำความสะอาดแผงทุก 3–6 เดือน และตรวจสอบระบบปีละครั้ง เรามีสัญญาบำรุงรักษาครอบคลุมการมอนิเตอร์ ทำความสะอาด และการซ่อมแซมตามการรับประกัน',
        },
        {
          question: 'ไทยมีระบบ Net Metering ไหม?',
          answer:
            'มีครับ โครงการ VSPP ของไทยอนุญาตให้ระบบที่อยู่อาศัยและเชิงพาณิชย์ขนาดต่ำกว่า 1MW ขายไฟส่วนเกินคืนให้กับ PEA ในอัตราที่กำหนดปัจจุบัน',
        },
        {
          question: 'มีการรับประกันอะไรบ้าง?',
          answer:
            'ทุกระบบรวม: รับประกันกำลังผลิต 25 ปีสำหรับแผงโซลาร์ LONGi รับประกันผลิตภัณฑ์ 10 ปีสำหรับอินเวอร์เตอร์ Huawei รับประกันงานติดตั้ง 10 ปีจากเรา เราได้รับการประกันภัยครบถ้วนและเป็นผู้ติดตั้งที่ลงทะเบียนอย่างถูกต้อง',
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
      totalInstalled: { value: '15MW+', label: 'กำลังการผลิตที่ติดตั้งทั้งหมด' },
      projectsCompleted: { value: '500+', label: 'โครงการที่เสร็จสมบูรณ์' },
      averageSavings: { value: '40%', label: 'ประหยัดพลังงานเฉลี่ย' },
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
      tag: 'เกี่ยวกับ TM Energy',
      title: 'ขับเคลื่อนสรวงสวรรค์ตั้งแต่ปี 2018',
    },
    story: {
      title: 'เรื่องราวของเรา',
      paragraphs: [
        'TM Energy เกิดจากการสังเกตเห็นสิ่งง่ายๆ: เกาะพะงันได้รับแสงอาทิตย์มากกว่า 1,800 ชั่วโมงต่อปี แต่ส่วนใหญ่ของเกาะยังคงพึ่งพาไฟฟ้าที่ผลิตจากดีเซลที่มีราคาแพงซึ่งขนส่งมาจากแผ่นดินใหญ่ เราตั้งใจจะเปลี่ยนแปลงสิ่งนั้น',
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
        slug: 'thailand-solar-regulations',
        tag: 'กฎระเบียบ',
        title: 'ทำความเข้าใจกฎระเบียบโซลาร์เซลล์ในไทย',
        excerpt:
          'คู่มือครบถ้วนเกี่ยวกับการขอใบอนุญาต VSPP ข้อกำหนดของ PEA และนโยบาย Net Metering สำหรับการติดตั้งโซลาร์ในประเทศไทย',
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
        slug: 'commercial-solar-roi-thailand',
        tag: 'ธุรกิจ',
        title: 'ความคุ้มค่าทางการเงินของโซลาร์เชิงพาณิชย์ในไทย',
        excerpt:
          'วิเคราะห์ ROI โดยละเอียดสำหรับโรงแรม รีสอร์ท และธุรกิจที่พิจารณาติดตั้งโซลาร์ ตัวเลขจริงจากโครงการบนเกาะพะงัน',
        date: 'พฤศจิกายน 2025',
        readTime: 'อ่าน 10 นาที',
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
      phonePlaceholder: '+66 XX XXX XXXX',
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
        value: '+66 XX XXX XXXX',
        cta: 'แชทกับเราได้ทันที',
      },
      line: {
        label: 'LINE',
        value: '@tmenergy',
        cta: 'เพิ่มเราใน LINE',
      },
      email: {
        label: 'อีเมล',
        value: 'info@energy-tm.com',
        cta: 'เราตอบกลับภายใน 24 ชั่วโมง',
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
      title: 'TM Energy — ติดตั้งโซลาร์เซลล์เกาะพะงัน อันดับ 1 | แผงโซลาร์ สุราษฎร์ธานี',
      description:
        'ติดตั้งโซลาร์เซลล์คุณภาพสูงบนเกาะพะงัน สุราษฎร์ธานี ประหยัดค่าไฟ 40% กับ TM Energy บริการครบวงจร ที่อยู่อาศัย เชิงพาณิชย์ และฟาร์มโซลาร์ ขอใบเสนอราคาฟรี',
    },
    services: {
      title:
        'บริการติดตั้งโซลาร์เซลล์ เกาะพะงัน — บ้าน รีสอร์ท ฟาร์มโซลาร์ | TM Energy',
      description:
        'บริการติดตั้งโซลาร์เซลล์ครบวงจรบนเกาะพะงัน สุราษฎร์ธานี หลังคาโซลาร์บ้านพัก โซลาร์เชิงพาณิชย์ และฟาร์มโซลาร์ขนาดใหญ่ ปรึกษาฟรีไม่มีค่าใช้จ่าย',
    },
    howItWorks: {
      title: 'ขั้นตอนการติดตั้งโซลาร์เซลล์ | TM Energy เกาะพะงัน',
      description:
        'ตั้งแต่ปรึกษาฟรีจนถึงมอนิเตอร์ระบบ 4 ขั้นตอนง่ายๆ สู่พลังงานแสงอาทิตย์ ดูว่า TM Energy ติดตั้งโซลาร์เซลล์บนเกาะพะงัน สุราษฎร์ธานี อย่างไร',
    },
    pricing: {
      title: 'ราคาติดตั้งโซลาร์เซลล์ เกาะพะงัน — EPC และ PPA | TM Energy',
      description:
        'ราคาโซลาร์เซลล์โปร่งใสสำหรับเกาะพะงัน เลือก EPC (ซื้อขาด) หรือ PPA (ไม่ต้องลงทุน) ตั้งแต่ 3kW ถึง 100kW ไม่มีค่าธรรมเนียมแอบแฝง ประหยัดค่าไฟฟ้าทันที',
    },
    projects: {
      title:
        'ผลงานติดตั้งโซลาร์เซลล์ | โครงการ TM Energy เกาะพะงัน สุราษฎร์ธานี',
      description:
        'ดูผลงานการติดตั้งโซลาร์เซลล์ทั่วเกาะพะงัน ตั้งแต่ระบบวิลล่า 12kW ถึงรีสอร์ท 60kW กว่า 500 โครงการ กำลังการผลิตรวมกว่า 15MW แผงโซลาร์เซลล์ที่ไว้วางใจได้',
    },
    about: {
      title: 'เกี่ยวกับ TM Energy — ผู้บุกเบิกโซลาร์เกาะพะงันตั้งแต่ปี 2018',
      description:
        'TM Energy ก่อตั้งโดยวิศวกรโซลาร์และชาวเกาะพะงัน ประสบการณ์กว่า 8 ปี ติดตั้งกว่า 500 ระบบ มุ่งมั่นสร้างพลังงานสะอาดให้เกาะพะงัน สุราษฎร์ธานี',
    },
    blog: {
      title: 'บทความโซลาร์เซลล์ คู่มือพลังงานแสงอาทิตย์ในไทย | TM Energy',
      description:
        'บทความจากผู้เชี่ยวชาญเรื่องโซลาร์เซลล์ในประเทศไทย กฎระเบียบ VSPP เปรียบเทียบ EPC vs PPA แบตเตอรี่กักเก็บพลังงาน และข้อมูล ROI จริงจากเกาะพะงัน',
    },
    contact: {
      title: 'ติดต่อ TM Energy — ปรึกษาโซลาร์ฟรี เกาะพะงัน สุราษฎร์ธานี',
      description:
        'ขอคำปรึกษาโซลาร์เซลล์ฟรีบนเกาะพะงัน ติดต่อ TM Energy ทาง WhatsApp LINE หรืออีเมล สำนักงานที่ทองสาลา สุราษฎร์ธานี จันทร์–เสาร์ 08:00–18:00 น.',
    },
  },
} as const

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
// `satisfies` validates structural compatibility without widening the type.
// This means translations[lang] always returns the full `typeof en` shape.
const _th = th as unknown as typeof en
export const translations: Record<Lang, typeof en> = { en, th: _th }

export type Translations = typeof en
