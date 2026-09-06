import type { Lang } from './translations'

type PropertyCopy = { name: string; title: string; description: string; priorities: string[]; cta: string }
type SystemCopy = { name: string; title: string; description: string; note: string }
type HomeCopy = {
  location: string; title: string; accent: string; intro: string; primary: string; whatsapp: string; reassurance: string
  imageAlt: string; illustration: string; photoTitle: string; photoNote: string
  essentials: string[]
  propertyTag: string; propertyTitle: string; propertyIntro: string; propertyLegend: string; propertyFocus: string
  properties: PropertyCopy[]
  systemsTag: string; systemsTitle: string; systemsIntro: string; systems: SystemCopy[]; explore: string
  processTag: string; processTitle: string; processIntro: string; steps: { title: string; description: string }[]
  demoTag: string; demoTitle: string; demoIntro: string; demoOpen: string; demoClose: string; demoLoading: string
  faqTag: string; faqTitle: string; faqIntro: string; faqs: { question: string; answer: string }[]
  contactTag: string; contactTitle: string; contactIntro: string; checklist: string[]; call: string
  seoTitle: string; seoDescription: string
}

export const homepageCopy: Record<Lang, HomeCopy> = {
  en: {
    location: 'Koh Phangan · Solar + battery',
    title: 'Your island.', accent: 'Your energy.',
    intro: 'Solar that fits your property, and the way you use it. Thoughtful systems for villas, resorts and businesses — from the first bill review to ongoing care.',
    primary: 'Check my property', whatsapp: 'Talk on WhatsApp', reassurance: 'Start with your electricity bill. No obligation.',
    imageAlt: 'Illustration of island villas with rooftop solar beside the sea', illustration: 'Solar concept · illustrative image',
    photoTitle: 'Designed around your place.', photoNote: 'The roof. The shade. The power you need.',
    essentials: ['Your bill, understood', 'Your roof, surveyed', 'Your backup, planned', 'Your system, supported'],
    propertyTag: '01 / Start with your property', propertyTitle: 'Different places.\nDifferent energy needs.',
    propertyIntro: 'A pool pump, a busy kitchen, a fully booked resort. What happens inside your property shapes what belongs on its roof.',
    propertyLegend: 'Choose your property type', propertyFocus: 'What we look at',
    properties: [
      { name: 'Homes & villas', title: 'Comfort at home. Clarity on your bill.', description: 'A system planned around air conditioning, pool pumps and everyday living, with backup for the things you want to keep running.', priorities: ['Daytime use & occupancy', 'Roof layout & shade', 'Essential backup loads'], cta: 'Explore residential solar' },
      { name: 'Resorts & hospitality', title: 'Energy planning for the whole guest experience.', description: 'Kitchens, cooling, water and guest rooms work on different schedules. We bring those demands into one property-wide plan.', priorities: ['Seasonal guest occupancy', 'Pumps, kitchens & cooling', 'Guest services that need backup'], cta: 'Explore commercial solar' },
      { name: 'Businesses & factories', title: 'Put your working roof to work.', description: 'Start with the bill and operating hours. Compare a purchased system with available PPA options using clear, site-specific assumptions.', priorities: ['Load profile & operating hours', 'Roof area & electrical capacity', 'Ownership & financing options'], cta: 'Request a business assessment' },
    ],
    systemsTag: '02 / Solar, storage & care', systemsTitle: 'The right mix for your everyday.',
    systemsIntro: 'We help you decide what the property needs before choosing the equipment.',
    systems: [
      { name: 'Solar', title: 'Make use of the daylight.', description: 'Rooftop generation sized around when your property uses electricity, with roof conditions and shade built into the design.', note: 'Start with daytime consumption' },
      { name: 'Battery backup', title: 'Plan for what matters.', description: 'Choose the circuits you want to support during an outage. Battery capacity and backup duration are designed around those loads.', note: 'Start with essential loads' },
      { name: 'Ongoing care', title: 'Stay connected to your system.', description: 'Monitoring, handover guidance and a maintenance plan help you understand performance and keep the system looked after.', note: 'Plan beyond installation day' },
    ],
    explore: 'Explore all services',
    processTag: '03 / A clear way forward', processTitle: 'From a question\nto a considered plan.',
    processIntro: 'You should know what is being proposed, why it fits your property, and what happens next.',
    steps: [
      { title: 'Share the basics', description: 'An electricity bill, a roof photo or map pin, and a little about how you use the property.' },
      { title: 'Survey the site', description: 'Check the roof, shade, access, electrical setup and a suitable place for equipment.' },
      { title: 'Compare your options', description: 'Review the system design, scope, cost and assumptions before making a decision.' },
      { title: 'Install & stay supported', description: 'Coordinate installation and required paperwork, then hand over monitoring and a care plan.' },
    ],
    demoTag: 'A closer look', demoTitle: 'See how a system comes together.',
    demoIntro: 'Explore an illustrated installation, from the bare roof to the panels. Open the interactive walkthrough when you want the detail.',
    demoOpen: 'Explore the installation', demoClose: 'Close the walkthrough', demoLoading: 'Loading the illustrated walkthrough…',
    faqTag: 'Good questions', faqTitle: 'A little clarity, before we talk.', faqIntro: 'Every property is different. These are a few useful starting points.',
    faqs: [
      { question: 'What do you need for a first assessment?', answer: 'Start with a recent electricity bill and a roof photo or map pin. Tell us the property type, when it uses the most power, and whether backup matters. You can share these in our first conversation.' },
      { question: 'Do I need a battery as well as solar panels?', answer: 'It depends on your goals. We review daytime electricity use separately from backup needs, then compare solar and storage options. A battery is sized around the circuits and duration you want to support.' },
      { question: 'How will I know what the system could save?', answer: 'The proposal should show its assumptions: your electricity use, system size, estimated generation and how much of that energy the property can use. We review the site and bill before presenting a savings estimate.' },
      { question: 'Can we plan a system if I am not on the island?', answer: 'You can start remotely with bills, photos and a property pin. We can then discuss how to arrange site access with you or your property manager for the survey.' },
      { question: 'What happens after installation?', answer: 'Handover covers the system, monitoring and the agreed support scope. Equipment warranties and maintenance arrangements are set out in the proposal so you know what is included.' },
    ],
    contactTag: 'Your next step', contactTitle: 'Let’s start\nwith your place.',
    contactIntro: 'Send us the basics. We’ll help you understand which solar and battery options are worth exploring for your property.',
    checklist: ['A recent electricity bill', 'A roof photo or location pin', 'What you want your energy to do'], call: 'Or call',
    seoTitle: 'Solar & Battery Systems for Koh Phangan Properties',
    seoDescription: 'Solar and battery planning, installation and ongoing care for Koh Phangan homes, villas, resorts and businesses. Start with your electricity bill and a property review.',
  },
  th: {
    location: 'เกาะพะงัน · โซลาร์ + แบตเตอรี่', title: 'เกาะของคุณ', accent: 'พลังงานของคุณ',
    intro: 'โซลาร์ที่ออกแบบให้เหมาะกับอาคารและการใช้ไฟของคุณ สำหรับบ้าน วิลล่า รีสอร์ท และธุรกิจ ตั้งแต่ตรวจสอบบิลครั้งแรกจนถึงการดูแลระยะยาว',
    primary: 'ประเมินพื้นที่ของฉัน', whatsapp: 'คุยผ่าน WhatsApp', reassurance: 'เริ่มจากบิลค่าไฟ ไม่มีข้อผูกมัด',
    imageAlt: 'ภาพประกอบวิลล่าบนเกาะพร้อมโซลาร์บนหลังคาริมทะเล', illustration: 'แนวคิดระบบโซลาร์ · ภาพประกอบ',
    photoTitle: 'ออกแบบจากพื้นที่ของคุณ', photoNote: 'หลังคา เงาบัง และพลังงานที่คุณต้องการ',
    essentials: ['เข้าใจบิลค่าไฟ', 'สำรวจหลังคา', 'วางแผนไฟสำรอง', 'ดูแลระบบต่อเนื่อง'],
    propertyTag: '01 / เริ่มจากอาคารของคุณ', propertyTitle: 'พื้นที่ต่างกัน\nการใช้พลังงานก็ต่างกัน',
    propertyIntro: 'ปั๊มสระว่ายน้ำ ครัวที่ทำงานตลอดวัน หรือรีสอร์ทที่มีแขกเต็ม การใช้งานภายในอาคารเป็นจุดเริ่มต้นของการออกแบบบนหลังคา',
    propertyLegend: 'เลือกประเภทอาคาร', propertyFocus: 'สิ่งที่เราพิจารณา',
    properties: [
      { name: 'บ้านและวิลล่า', title: 'อยู่สบาย พร้อมเข้าใจค่าไฟ', description: 'วางแผนระบบตามการใช้แอร์ ปั๊มสระ และชีวิตประจำวัน พร้อมพิจารณาไฟสำรองสำหรับอุปกรณ์สำคัญ', priorities: ['การใช้ไฟกลางวันและการเข้าพัก', 'รูปแบบหลังคาและเงาบัง', 'อุปกรณ์ที่ต้องการไฟสำรอง'], cta: 'ดูโซลาร์สำหรับบ้าน' },
      { name: 'รีสอร์ทและโรงแรม', title: 'วางแผนพลังงานเพื่อการบริการ', description: 'ครัว ระบบทำความเย็น น้ำ และห้องพักใช้ไฟต่างช่วงเวลา เรานำความต้องการเหล่านี้มาวางแผนร่วมกัน', priorities: ['อัตราเข้าพักตามฤดูกาล', 'ปั๊มน้ำ ครัว และระบบทำความเย็น', 'บริการที่ต้องมีไฟสำรอง'], cta: 'ดูโซลาร์สำหรับธุรกิจ' },
      { name: 'ธุรกิจและโรงงาน', title: 'ให้หลังคามีส่วนช่วยธุรกิจ', description: 'เริ่มจากบิลและเวลาทำงาน เปรียบเทียบการซื้อระบบกับทางเลือก PPA ที่มี โดยใช้สมมติฐานตามหน้างานจริง', priorities: ['รูปแบบการใช้ไฟและเวลาทำงาน', 'พื้นที่หลังคาและระบบไฟฟ้า', 'การเป็นเจ้าของและทางเลือกเงินทุน'], cta: 'ขอประเมินธุรกิจ' },
    ],
    systemsTag: '02 / โซลาร์ แบตเตอรี่ และการดูแล', systemsTitle: 'ระบบที่เหมาะกับการใช้ชีวิต', systemsIntro: 'เราเริ่มจากความต้องการของอาคาร ก่อนเลือกอุปกรณ์',
    systems: [
      { name: 'โซลาร์', title: 'ใช้ประโยชน์จากแสงกลางวัน', description: 'ขนาดระบบสัมพันธ์กับช่วงเวลาที่อาคารใช้ไฟ โดยคำนึงถึงหลังคาและเงาบัง', note: 'เริ่มจากการใช้ไฟกลางวัน' },
      { name: 'แบตเตอรี่สำรอง', title: 'วางแผนเพื่อสิ่งสำคัญ', description: 'เลือกวงจรที่ต้องการสำรองเมื่อไฟดับ แล้วออกแบบความจุและระยะเวลาสำรองตามโหลดเหล่านั้น', note: 'เริ่มจากอุปกรณ์จำเป็น' },
      { name: 'การดูแลต่อเนื่อง', title: 'ติดตามระบบของคุณ', description: 'การติดตามผล คำแนะนำเมื่อส่งมอบ และแผนบำรุงรักษา ช่วยให้คุณเข้าใจประสิทธิภาพของระบบ', note: 'วางแผนถึงหลังวันติดตั้ง' },
    ],
    explore: 'ดูบริการทั้งหมด', processTag: '03 / ขั้นตอนที่ชัดเจน', processTitle: 'จากคำถาม\nสู่แผนที่เหมาะสม', processIntro: 'เข้าใจข้อเสนอ เหตุผลที่เหมาะกับอาคาร และขั้นตอนถัดไป',
    steps: [
      { title: 'ส่งข้อมูลเบื้องต้น', description: 'บิลค่าไฟ ภาพหลังคาหรือพิกัด และข้อมูลการใช้งานอาคาร' },
      { title: 'สำรวจหน้างาน', description: 'ตรวจหลังคา เงาบัง ทางเข้า ระบบไฟ และจุดติดตั้งอุปกรณ์' },
      { title: 'เปรียบเทียบทางเลือก', description: 'พิจารณาแบบระบบ ขอบเขตงาน ค่าใช้จ่าย และสมมติฐานก่อนตัดสินใจ' },
      { title: 'ติดตั้งและดูแล', description: 'ประสานงานติดตั้งและเอกสารที่จำเป็น พร้อมส่งมอบการติดตามระบบและแผนดูแล' },
    ],
    demoTag: 'ดูรายละเอียด', demoTitle: 'ดูว่าระบบประกอบขึ้นอย่างไร', demoIntro: 'สำรวจภาพประกอบขั้นตอนติดตั้ง ตั้งแต่หลังคาเปล่าจนถึงแผงโซลาร์ เปิดเมื่อคุณต้องการดูรายละเอียด', demoOpen: 'สำรวจขั้นตอนติดตั้ง', demoClose: 'ปิดการนำเสนอ', demoLoading: 'กำลังโหลดภาพประกอบการติดตั้ง…',
    faqTag: 'คำถามที่พบบ่อย', faqTitle: 'เข้าใจมากขึ้น ก่อนเริ่มคุย', faqIntro: 'แต่ละอาคารต่างกัน นี่คือข้อมูลเบื้องต้นที่เป็นประโยชน์',
    faqs: [
      { question: 'ต้องเตรียมอะไรเพื่อประเมินเบื้องต้น?', answer: 'เริ่มจากบิลค่าไฟล่าสุดและภาพหลังคาหรือพิกัด แจ้งประเภทอาคาร ช่วงเวลาที่ใช้ไฟมาก และความต้องการไฟสำรอง โดยส่งข้อมูลได้ในการพูดคุยครั้งแรก' },
      { question: 'ต้องใช้แบตเตอรี่ร่วมกับแผงโซลาร์ไหม?', answer: 'ขึ้นอยู่กับเป้าหมาย เราแยกพิจารณาการใช้ไฟกลางวันและความต้องการสำรอง แล้วเปรียบเทียบทางเลือก ขนาดแบตเตอรี่ขึ้นอยู่กับวงจรและระยะเวลาที่ต้องการสำรอง' },
      { question: 'จะทราบได้อย่างไรว่าประหยัดได้เท่าไร?', answer: 'ข้อเสนอควรระบุสมมติฐานเรื่องการใช้ไฟ ขนาดระบบ การผลิตที่ประมาณการ และสัดส่วนที่อาคารใช้ได้ เราตรวจบิลและหน้างานก่อนเสนอประมาณการประหยัด' },
      { question: 'เริ่มวางแผนได้ไหมหากไม่ได้อยู่บนเกาะ?', answer: 'เริ่มจากส่งบิล ภาพถ่าย และพิกัดจากระยะไกลได้ จากนั้นเราหารือเรื่องการเข้าพื้นที่กับคุณหรือผู้ดูแลอาคารเพื่อสำรวจหน้างาน' },
      { question: 'หลังติดตั้งแล้วเป็นอย่างไร?', answer: 'การส่งมอบครอบคลุมระบบ การติดตามผล และขอบเขตบริการที่ตกลง การรับประกันอุปกรณ์และการบำรุงรักษาจะระบุในข้อเสนอ' },
    ],
    contactTag: 'ขั้นตอนถัดไป', contactTitle: 'เริ่มจาก\nพื้นที่ของคุณ', contactIntro: 'ส่งข้อมูลเบื้องต้นให้เรา เราจะช่วยพิจารณาว่าทางเลือกโซลาร์และแบตเตอรี่ใดเหมาะจะศึกษาต่อ', checklist: ['บิลค่าไฟล่าสุด', 'ภาพหลังคาหรือพิกัด', 'สิ่งที่คุณต้องการจากระบบพลังงาน'], call: 'หรือโทร',
    seoTitle: 'ระบบโซลาร์และแบตเตอรี่สำหรับบ้านและธุรกิจบนเกาะพะงัน', seoDescription: 'วางแผน ติดตั้ง และดูแลระบบโซลาร์และแบตเตอรี่สำหรับบ้าน วิลล่า รีสอร์ท และธุรกิจบนเกาะพะงัน เริ่มจากบิลค่าไฟของคุณ',
  },
  he: {
    location: 'קופנגן · סולארי + אגירה', title: 'האי שלכם.', accent: 'האנרגיה שלכם.',
    intro: 'סולארי שמתאים לנכס שלכם ולאופן שבו אתם משתמשים בו. תכנון מדויק לווילות, ריזורטים ועסקים — מבדיקת חשבון החשמל ועד לתחזוקה השוטפת.',
    primary: 'בואו נבדוק את הנכס', whatsapp: 'נדבר ב־WhatsApp', reassurance: 'מתחילים מחשבון החשמל. ללא התחייבות.',
    imageAlt: 'הדמיה של וילות באי עם מערכות סולאריות על הגגות לצד הים', illustration: 'קונספט סולארי · תמונה להמחשה', photoTitle: 'מתוכנן סביב המקום שלכם.', photoNote: 'הגג. הצל. החשמל שאתם צריכים.',
    essentials: ['מבינים את החשבון', 'בודקים את הגג', 'מתכננים את הגיבוי', 'מלווים את המערכת'],
    propertyTag: '01 / מתחילים בנכס', propertyTitle: 'מקומות שונים.\nצרכי אנרגיה שונים.', propertyIntro: 'משאבת בריכה, מטבח שעובד כל היום או ריזורט בתפוסה מלאה. מה שקורה בתוך הנכס קובע מה מתאים לגג שלו.', propertyLegend: 'בחרו את סוג הנכס', propertyFocus: 'מה אנחנו בודקים',
    properties: [
      { name: 'בתים ווילות', title: 'נוחות בבית. בהירות בחשבון.', description: 'תכנון לפי המזגנים, משאבות הבריכה וחיי היום־יום, עם אפשרות לגיבוי המכשירים שחשוב לכם להפעיל גם בזמן הפסקת חשמל.', priorities: ['צריכת יום ותפוסה', 'מבנה הגג והצללות', 'עומסים חיוניים לגיבוי'], cta: 'סולארי לבתים ולווילות' },
      { name: 'ריזורטים ואירוח', title: 'תכנון אנרגיה לכל חוויית האירוח.', description: 'מטבחים, קירור, מים וחדרי אירוח פועלים בשעות שונות. אנחנו מחברים את הצרכים לתוכנית אחת עבור הנכס כולו.', priorities: ['תפוסה לאורך העונות', 'משאבות, מטבחים וקירור', 'שירותי אורחים שדורשים גיבוי'], cta: 'סולארי לעסקי אירוח' },
      { name: 'עסקים ומפעלים', title: 'תנו לגג שלכם לעבוד.', description: 'מתחילים בחשבון החשמל ובשעות הפעילות. משווים בין רכישת מערכת למסלולי PPA זמינים, עם הנחות ברורות שמבוססות על הנכס.', priorities: ['פרופיל צריכה ושעות פעילות', 'שטח גג ותשתית חשמל', 'מסלולי בעלות ומימון'], cta: 'בדיקת התאמה לעסק' },
    ],
    systemsTag: '02 / סולארי, אגירה ותחזוקה', systemsTitle: 'השילוב הנכון לשגרה שלכם.', systemsIntro: 'קודם מבינים מה הנכס צריך. אחר כך בוחרים ציוד.',
    systems: [
      { name: 'סולארי', title: 'להפיק יותר משעות השמש.', description: 'מערכת גג בגודל שמתאים לשעות צריכת החשמל בנכס, תוך התחשבות במצב הגג ובהצללות.', note: 'מתחילים מצריכת היום' },
      { name: 'אגירה וגיבוי', title: 'לתכנן עבור מה שחשוב.', description: 'בוחרים אילו מעגלים לגבות בהפסקת חשמל. קיבולת הסוללה וזמן הגיבוי מתוכננים לפי העומסים האלה.', note: 'מתחילים מהעומסים החיוניים' },
      { name: 'תחזוקה וליווי', title: 'להישאר מחוברים למערכת.', description: 'ניטור, הדרכה בעת המסירה ותוכנית תחזוקה עוזרים להבין את ביצועי המערכת ולדאוג לה לאורך זמן.', note: 'מתכננים גם אחרי ההתקנה' },
    ],
    explore: 'לכל השירותים', processTag: '03 / הדרך קדימה', processTitle: 'משאלה ראשונה\nלתוכנית מחושבת.', processIntro: 'חשוב שתבינו מה מציעים לכם, למה זה מתאים לנכס ומה הצעד הבא.',
    steps: [
      { title: 'משתפים את הבסיס', description: 'חשבון חשמל, תמונת גג או מיקום במפה, וקצת מידע על השימוש בנכס.' },
      { title: 'בודקים בשטח', description: 'בוחנים את הגג, הצל, הגישה, תשתית החשמל והמקום המתאים לציוד.' },
      { title: 'משווים אפשרויות', description: 'עוברים על התכנון, היקף העבודה, העלויות וההנחות לפני שמחליטים.' },
      { title: 'מתקינים וממשיכים ללוות', description: 'מתאמים התקנה והמסמכים הנדרשים, ומוסרים מערכת עם ניטור ותוכנית טיפול.' },
    ],
    demoTag: 'מבט מקרוב', demoTitle: 'כך המערכת מתחברת.', demoIntro: 'הדמיה של שלבי ההתקנה, מהגג הריק ועד לפאנלים. פתחו את הסיור האינטראקטיבי כשתרצו להעמיק.', demoOpen: 'לסיור בשלבי ההתקנה', demoClose: 'סגירת הסיור', demoLoading: 'טוענים את הדמיית ההתקנה…',
    faqTag: 'שאלות טובות', faqTitle: 'קצת בהירות, לפני שמדברים.', faqIntro: 'כל נכס שונה. אלה כמה נקודות טובות להתחיל מהן.',
    faqs: [
      { question: 'מה צריך להכין לבדיקה ראשונית?', answer: 'מתחילים מחשבון חשמל עדכני ותמונת גג או מיקום במפה. ספרו לנו מה סוג הנכס, מתי הוא צורך הכי הרבה חשמל והאם גיבוי חשוב לכם. אפשר לשתף את המידע בשיחה הראשונה.' },
      { question: 'האם חייבים סוללה בנוסף לפאנלים?', answer: 'זה תלוי במטרות. בוחנים בנפרד את צריכת החשמל ביום ואת צרכי הגיבוי, ואז משווים אפשרויות לסולארי ולאגירה. הסוללה מתוכננת לפי המעגלים וזמן הגיבוי הרצויים.' },
      { question: 'איך יודעים כמה המערכת עשויה לחסוך?', answer: 'ההצעה צריכה להציג את הנחות החישוב: צריכת החשמל, גודל המערכת, הייצור המשוער וכמה ממנו הנכס צפוי לצרוך. בודקים את הנכס ואת החשבון לפני שמציגים הערכת חיסכון.' },
      { question: 'אפשר להתחיל כשאני לא על האי?', answer: 'אפשר להתחיל מרחוק עם חשבונות, תמונות ומיקום הנכס. לאחר מכן נתאם איתכם או עם מנהל הנכס את הגישה לצורך סקר השטח.' },
      { question: 'מה קורה אחרי ההתקנה?', answer: 'המסירה כוללת הסבר על המערכת, הניטור והיקף התמיכה שסוכם. אחריות הציוד וסידורי התחזוקה מפורטים בהצעה, כך שברור מה כלול.' },
    ],
    contactTag: 'הצעד הבא שלכם', contactTitle: 'בואו נתחיל\nבמקום שלכם.', contactIntro: 'שלחו לנו את הפרטים הראשונים. נעזור להבין אילו אפשרויות לסולארי ולגיבוי כדאי לבחון עבור הנכס שלכם.', checklist: ['חשבון חשמל עדכני', 'תמונת גג או מיקום במפה', 'מה חשוב לכם שהמערכת תעשה'], call: 'או התקשרו',
    seoTitle: 'סולארי ואגירה לנכסים בקופנגן', seoDescription: 'תכנון, התקנה וליווי של מערכות סולאריות ואגירה לבתים, וילות, ריזורטים ועסקים בקופנגן. מתחילים מחשבון החשמל ומבדיקת התאמה לנכס.',
  },
}
