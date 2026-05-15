/**
 * Migration 226 — Upgrade package system to v2.0 framework.
 *
 * - Adds rich tier metadata columns to `packages` (tagline, fee band, commission,
 *   service tracks JSONB, max-player cap, display order).
 * - Reseeds `packages` with the four canonical tiers from the v2.0 PDF:
 *   B (Foundational), B+ (Ascent), A (Elite), A+ (World-Class Elite).
 * - Remaps player_package values: legacy C → B, legacy B → B+, A unchanged.
 * - Reseeds `package_configs` access matrix for the four new tiers.
 */

import { QueryInterface, DataTypes, QueryTypes } from "sequelize";
import {
  addColumnIfMissing,
  removeColumnIfPresent,
  tableExists,
} from "../migrationHelpers";

const TRACKS_B = {
  career: {
    en: [
      "Career roadmap and 2-year scenario planning",
      "FIFA-licensed professional representation",
      "Core contract review and preliminary negotiation",
      "Regulatory compliance (federations, leagues)",
      "Family and inner-circle stakeholder communication",
    ],
    ar: [
      "رسم خارطة المسار المهني وتخطيط السيناريوهات (أفق سنتان)",
      "التمثيل الاحترافي المرخّص والمتوافق مع أنظمة الفيفا",
      "مراجعة العقود الأساسية ودعم التفاوض التمهيدي",
      "إدارة الامتثال التنظيمي (الاتحادات والدوريات)",
      "التواصل مع أصحاب المصلحة: الأسرة والمحيط المباشر",
    ],
  },
  performance: {
    en: [
      "Annual physiological assessment to sport-science standards",
      "Quarterly Individual Development Plan (IDP) reports",
      "Technical and tactical development guidance",
      "Injury-risk awareness and training-load management",
      "Conditioning support and referral to specialist partners",
    ],
    ar: [
      "تقييم فسيولوجي وتشخيصي سنوي بمعايير علم الرياضة",
      "تقارير خطة التطوير الفردي (IDP) ربع سنوية",
      "توجيه التطوير الفني والتكتيكي",
      "توعية بمخاطر الإصابة وإدارة الأحمال التدريبية",
      "دعم التهيئة البدنية والإحالة إلى شركاء التخصص",
    ],
  },
  brand: {
    en: ["Digital presence and social-media review (guidance only)"],
    ar: [
      "مراجعة الحضور الرقمي ومنصات التواصل الاجتماعي (إرشاد فقط، بدون إدارة)",
    ],
  },
  wealth: {
    en: [
      "Foundational financial-literacy module (6 sessions)",
      "Basic guidance on professional governance and ethics",
      "Introduction to post-career transition framework",
      "Preliminary investment readiness — level 1 only",
    ],
    ar: [
      "وحدة التثقيف المالي الأساسي (٦ جلسات تدريبية)",
      "توجيه أساسي في الحوكمة المهنية والأخلاقيات",
      "مقدمة إطار التعريف بما بعد الاعتزال",
      "جاهزية استثمارية تمهيدية — المستوى الأول فقط",
    ],
  },
};

const TRACKS_BPLUS = {
  career: {
    en: [
      "Full professional representation across clubs and leagues",
      "Strategic career design with multi-scenario modelling (3-5 year horizon)",
      "Advanced contract negotiation including incentives and image rights",
      "Transfer strategy: domestic and top-tier external targets",
      "Active FIFA and league regulatory compliance monitoring",
      "Stakeholder management: clubs, family, advisors, commercial partners",
      "Regulatory documentation prep for transfer windows",
    ],
    ar: [
      "تمثيل احترافي كامل على مستوى جميع الأندية والدوريات",
      "تصميم مهني استراتيجي بنمذجة متعددة السيناريوهات (أفق ٣-٥ سنوات)",
      "التفاوض المتقدم على العقود — بما يشمل الهياكل التحفيزية وحقوق الصورة",
      "تطوير استراتيجية الانتقال: أهداف محلية وخارجية من الدرجة الأولى",
      "إدارة الامتثال التنظيمي مع الفيفا والدوريات — رصد استباقي مستمر",
      "إدارة أصحاب المصلحة: إدارة الأندية، الأسرة، المستشارون، الشركاء التجاريون",
      "إعداد المستندات التنظيمية وتحضيرات نوافذ الانتقال",
    ],
  },
  performance: {
    en: [
      "Semi-annual physiological assessments with sport-science partner",
      "Monthly Individual Development Plan (IDP) with defined KPIs",
      "Technical, tactical, mental and psychological performance coaching",
      "Injury prevention and training-load management protocols",
      "Coordination with club performance staff and external specialists",
      "Nutrition and recovery consultation via accredited partner network",
    ],
    ar: [
      "تقييمات فسيولوجية نصف سنوية مع شريك متخصص في علوم الرياضة",
      "خطة التطوير الفردي (IDP) الشهرية مع مؤشرات أداء محددة",
      "التدريب الفني والتكتيكي والذهني وتعزيز الأداء النفسي",
      "برامج الوقاية من الإصابات وبروتوكولات إدارة الأحمال التدريبية",
      "التنسيق مع جهاز الأداء في النادي والمتخصصين المستقلين",
      "الاستشارة في التغذية والتعافي عبر شبكة الشركاء المعتمدين",
    ],
  },
  brand: {
    en: [
      "Personal brand strategy and narrative architecture",
      "Media positioning and press relations support",
      "Social-media audit and growth strategy (player-managed, Sadara-guided)",
      "Sponsorship and endorsement opportunity sourcing",
      "Commercial partnership negotiation and image-rights framework",
    ],
    ar: [
      "استراتيجية العلامة الشخصية وبناء السرد التعريفي",
      "التموضع الإعلامي ودعم العلاقات الصحفية",
      "تدقيق منصات التواصل الاجتماعي واستراتيجية النمو (إدارة اللاعب بتوجيه صدارة)",
      "تحديد فرص الرعايات والعقود الترويجية",
      "دعم التفاوض على الشراكات التجارية وإطار إدارة حقوق الصورة",
    ],
  },
  wealth: {
    en: [
      "Advanced financial planning programme (12 sessions)",
      "Coordination with accredited financial advisors",
      "Introduction to investment asset classes and wealth structuring",
      "Post-career transition planning (10-year horizon)",
      "Ethical governance, professional conduct and family advisory framework",
    ],
    ar: [
      "برنامج التخطيط المالي المتقدم (١٢ جلسة تدريبية)",
      "التنسيق مع مستشارين ماليين معتمدين",
      "مقدمة في فئات الأصول الاستثمارية وهيكلة الثروة",
      "تخطيط مرحلة ما بعد الاعتزال (إطار زمني ١٠ سنوات)",
      "إطار الحوكمة الأخلاقية والسلوك المهني والإرشاد الأسري",
    ],
  },
};

const TRACKS_A = {
  career: {
    en: [
      "Senior dedicated agent as primary representative and point of reference",
      "Comprehensive multi-stage career architecture (5-10 year horizon)",
      "Full contractual negotiation: rights, image, incentives, exit clauses",
      "International transfer strategy: domestic, Gulf and top-tier European clubs",
      "Periodic transfer-market intelligence and competitive positioning",
      "Proactive club-relationship management and opportunity development",
      "Full compliance management with FIFA, SAFF and all relevant leagues",
      "Complete stakeholder management: clubs, federation, family, advisors",
      "Priority 24/7 contact and same-day response SLA",
    ],
    ar: [
      "وكيل أول متخصص بوصفه الممثل الرئيسي والمرجع الأساسي",
      "رسم الهيكل المهني الشامل متعدد المراحل (أفق ٥-١٠ سنوات)",
      "التفاوض التعاقدي الكامل: الحقوق والصورة والحوافز وشروط الإنهاء",
      "استراتيجية انتقال دولية: أندية محلية وخليجية وأوروبية من الدرجة الأولى",
      "تقارير استخباراتية دورية عن سوق الانتقالات والتموضع التنافسي",
      "إدارة علاقات الأندية بصورة استباقية وتطوير الفرص المستقبلية",
      "إدارة الامتثال الكاملة مع الفيفا والاتحاد السعودي وجميع الدوريات",
      "إدارة كاملة لجميع أصحاب المصلحة: الأندية والاتحاد والأسرة والمستشارون",
      "أولوية الاتصال على مدار الساعة واتفاقية استجابة في اليوم ذاته",
    ],
  },
  performance: {
    en: [
      "Continuous physiological monitoring with accredited sport-science specialists",
      "Real-time IDP — reviewed and updated monthly",
      "Dedicated mental-performance coach (minimum 2 sessions per month)",
      "Advanced injury-prevention, load-management and recovery programmes",
      "Full coordination with club medical and performance staff",
      "Sports-nutrition, sleep and lifestyle-performance consultation",
      "Advanced analytics: GPS data, biometric analysis, comparative benchmarking",
    ],
    ar: [
      "رصد فسيولوجي مستمر بالتعاون مع متخصصين معتمدين في علوم الرياضة",
      "خطة IDP الفعّالة في الوقت الفعلي — مُراجَعة ومُحدَّثة شهرياً",
      "مدرب أداء ذهني متخصص (جلستان كحد أدنى شهرياً)",
      "برامج متقدمة للوقاية من الإصابات وإدارة الأحمال والتعافي",
      "تنسيق كامل مع الجهاز الطبي وجهاز الأداء في النادي",
      "استشارات التغذية الرياضية وتحسين النوم والأداء الحياتي",
      "تحليلات متقدمة: بيانات GPS وتحليل بيومتري وقياسات أداء مقارنة",
    ],
  },
  brand: {
    en: [
      "Comprehensive personal-brand strategy and long-term architecture",
      "Professional media relations and press-office service",
      "Full digital and social-media platform management",
      "Sponsorship and endorsement deals — active sourcing, negotiation, portfolio management",
      "Image-rights management — contractual protection and domestic commercial maximisation",
      "Crisis-communications support — reputation protection",
    ],
    ar: [
      "استراتيجية علامة شخصية كاملة والهيكل المعماري طويل الأمد",
      "إدارة العلاقات الإعلامية الاحترافية وخدمة مكتب الصحافة",
      "إدارة الحضور الرقمي ومنصات التواصل الاجتماعي بالكامل",
      "الرعايات والعقود الترويجية — استقطاب نشط وتفاوض وإدارة محفظة تجارية",
      "إدارة حقوق الصورة — الحماية التعاقدية والتعظيم التجاري المحلي",
      "دعم الاتصالات في أوقات الأزمات — حماية السمعة",
    ],
  },
  wealth: {
    en: [
      "Institutional financial-governance framework — designed for high-income athletes",
      "Coordination with certified financial planner — active oversight of wealth structure",
      "Investment-portfolio guidance via vetted partner advisors",
      "Business-venture evaluation and supported due diligence",
      "Post-career transition strategy and legacy planning",
      "Comprehensive family advisory and stakeholder coordination",
    ],
    ar: [
      "إطار الحوكمة المالية المؤسسية — مُصمَّم لرياضيي الدخل المرتفع",
      "تنسيق مع مخطط مالي معتمد — إشراف فعّال على هيكل الثروة",
      "توجيه في محفظة الاستثمار عبر مستشارين شركاء مُتحقَّق منهم",
      "تقييم المشاريع التجارية وإجراء العناية الواجبة المدعومة",
      "استراتيجية الانتقال المهني بعد الاعتزال وتخطيط الإرث المهني",
      "الإرشاد الأسري الشامل وتنسيق جميع أصحاب المصلحة",
    ],
  },
};

const TRACKS_APLUS = {
  career: {
    en: [
      "Dedicated lead account manager + full agency team as primary point for player and family",
      "Long-term career architecture — strategic planning extending beyond retirement",
      "Specialised legal team for major contract negotiation and international rights protection",
      "Global transfer strategy: top-five European leagues, Gulf and Asian markets",
      "Real-time periodic intelligence reports on the international transfer market",
      "Direct relationship management with major-club directors and international federations",
      "International compliance: FIFA, UEFA and all relevant leagues",
      "Full stakeholder office: every professional and personal connection",
      "Immediate 24/7 response SLA on all material matters",
    ],
    ar: [
      "مدير حساب رئيسي مكرّس + فريق وكالة متكامل كمرجع أول للاعب وأسرته",
      "هيكل مهني طويل الأمد — تخطيط استراتيجي يمتد إلى ما بعد الاعتزال",
      "فريق قانوني متخصص للتفاوض على العقود الكبرى وحماية حقوق اللاعب دولياً",
      "استراتيجية انتقال عالمية: أندية من الدوريات الخمس الكبرى وأسواق الخليج والآسيا",
      "تقارير استخباراتية دورية في الوقت الفعلي عن سوق الانتقالات الدولي",
      "إدارة علاقات مباشرة مع مديري الأندية الكبرى والاتحادات الدولية",
      "إدارة امتثال دولية: الفيفا، الاتحاد الأوروبي (UEFA)، جميع الدوريات المعنية",
      "مكتب إدارة أصحاب المصلحة الكامل: كل من يمت للاعب بصلة مهنية أو شخصية",
      "استجابة فورية على مدار الساعة طوال أيام الأسبوع لجميع الأمور الجوهرية",
    ],
  },
  performance: {
    en: [
      "Continuous physiological monitoring: biometric, genomic and body-composition analysis",
      "Real-time IDP with advanced KPIs tied to international benchmarks",
      "Specialist mental and psychological performance staff: lead coach + on-demand crisis sessions",
      "Bespoke load-management and recovery programme with medical staff independent of the club",
      "Access to advanced performance-testing facilities via international partner-lab network",
      "GPS, motion and acceleration data analysis with detailed weekly performance reports",
      "Advanced tactical video analysis and competitor scouting at international level",
      "Personalised sports-nutrition optimisation with internationally accredited nutritionist",
    ],
    ar: [
      "بروتوكول رصد فسيولوجي مستمر: بيومتري وجينومي وتحليل تركيبة الجسم",
      "خطة IDP محدَّثة في الوقت الفعلي مع مؤشرات أداء متقدمة مرتبطة بأهداف دولية",
      "طاقم تخصصي للأداء الذهني والنفسي: مدرب رئيسي + جلسات أزمات فورية عند الحاجة",
      "برنامج إدارة أحمال مخصص وتعافٍ متقدم مع طاقم طبي مستقل عن النادي",
      "وصول إلى مرافق اختبار الأداء المتقدمة عبر شبكة مختبرات الشركاء الدوليين",
      "تحليل بيانات GPS والحركة والتسارع مع تقارير أداء أسبوعية تفصيلية",
      "تحليل الفيديو التكتيكي المتقدم ورصد المنافسين — مستوى دولي",
      "تحسين التغذية الرياضية المخصصة مع خبير تغذية معتمد دولياً",
    ],
  },
  brand: {
    en: [
      "Full personal-brand architecture — coherent strategy across athletic and commercial identity",
      "Embedded PR team: domestic, regional and international media management",
      "Dedicated content-production team: video, digital, planned seasonal campaigns",
      "End-to-end digital management: all platforms, audience growth, paid media",
      "International sponsorship sourcing: global brands, tech, entertainment sectors",
      "Multi-category image-rights licensing: video games, products, digital content",
      "International media-exposure strategy (interviews, documentaries, exclusive content)",
      "Reputation crisis management — specialist team and immediate response protocol",
    ],
    ar: [
      "معماريّة علامة شخصية كاملة — استراتيجية ترابط بين الهوية الرياضية والتجارية",
      "فريق علاقات عامة مدعوم: إدارة وسائل الإعلام المحلية والإقليمية والدولية",
      "فريق إنتاج محتوى مكرّس: فيديو، محتوى رقمي، حملات موسمية مخطّطة",
      "إدارة رقمية متكاملة: جميع المنصات، نمو الجمهور، الإعلانات المدفوعة",
      "استقطاب عقود رعاية دولية: علامات عالمية، شركات تقنية، قطاعات الترفيه",
      "ترخيص حقوق الصورة متعدد الفئات: ألعاب إلكترونية، منتجات، محتوى رقمي",
      "استراتيجية الاستثمار في الظهور الإعلامي الدولي (مقابلات، وثائقيات، محتوى حصري)",
      "إدارة أزمات السمعة — فريق متخصص وبروتوكول استجابة فورية",
    ],
  },
  wealth: {
    en: [
      "Comprehensive institutional governance — wealth management at investment-fund level",
      "Lead financial planner + advisory team: international tax, FX, diversified assets",
      "Actively managed investment portfolio via vetted, internationally certified asset advisor",
      "Expansion strategy into club, team or sports-property ownership stakes",
      "Major business-venture evaluation and board representation where appropriate",
      "Legacy strategy: prepare player for post-career life — media, coaching, ownership",
      "Domestic and international tax planning factoring cross-border contracts and transfers",
      "Emergency fund and financial risk management for unexpected career scenarios",
      "Legacy and philanthropic planning — building institutions or community programmes",
    ],
    ar: [
      "إطار حوكمة مؤسسية شامل — إدارة ثروة على مستوى صندوق الاستثمار",
      "مخطط مالي رئيسي متخصص + فريق استشاري: ضرائب دولية، عملات، أصول متنوعة",
      "محفظة استثمارية مُدارة فعلياً عبر مستشار أصول موثَّق ومُتحقَّق منه دولياً",
      "استراتيجية التوسع في امتلاك الأندية والفرق الرياضية أو الحصص الاستثمارية فيها",
      "تقييم المشاريع التجارية الكبرى وتمثيل اللاعب في مجالس الإدارة إذا اقتضى",
      "استراتيجية الإرث المهني: إعداد اللاعب لمرحلة ما بعد الاعتزال — إعلام، تدريب، ملكية",
      "التخطيط الضريبي المحلي والدولي مع مراعاة العقود والانتقالات العابرة للحدود",
      "صندوق طوارئ وإدارة مخاطر مالية للسيناريوهات المهنية غير المتوقعة",
      "تخطيط الإرث والعطاء الخيري — بناء مؤسسات بالاسم أو البرامج المجتمعية",
    ],
  },
};

interface TierSeed {
  code: string;
  nameEn: string;
  nameAr: string;
  taglineEn: string;
  taglineAr: string;
  feeMin: number;
  feeMax: number | null;
  commissionPct: number;
  tracks: unknown;
  maxPlayers: number | null;
  displayOrder: number;
}

const TIER_SEEDS: TierSeed[] = [
  {
    code: "B",
    nameEn: "Foundational",
    nameAr: "التأسيسية",
    taglineEn: "Development Player Representation",
    taglineAr: "تمثيل لاعب التطوير المهني",
    feeMin: 15000,
    feeMax: 25000,
    commissionPct: 10,
    tracks: TRACKS_B,
    maxPlayers: null,
    displayOrder: 10,
  },
  {
    code: "B+",
    nameEn: "Ascent — Emerging Professional",
    nameAr: "الصعود — المحترف الصاعد",
    taglineEn: "Emerging Professional Management",
    taglineAr: "إدارة المحترف الصاعد",
    feeMin: 35000,
    feeMax: 55000,
    commissionPct: 10,
    tracks: TRACKS_BPLUS,
    maxPlayers: null,
    displayOrder: 20,
  },
  {
    code: "A",
    nameEn: "Elite",
    nameAr: "النخبة",
    taglineEn: "End-to-End Comprehensive Management",
    taglineAr: "الإدارة الشاملة من البداية إلى النهاية",
    feeMin: 70000,
    feeMax: 120000,
    commissionPct: 10,
    tracks: TRACKS_A,
    maxPlayers: null,
    displayOrder: 30,
  },
  {
    code: "A+",
    nameEn: "World-Class Elite",
    nameAr: "النخبة العالمية",
    taglineEn: "Institutional Global Representation",
    taglineAr: "إدارة مؤسسية عالمية متكاملة",
    feeMin: 200000,
    feeMax: 400000,
    commissionPct: 10,
    tracks: TRACKS_APLUS,
    maxPlayers: 5,
    displayOrder: 40,
  },
];

interface ModuleAccess {
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const FULL = {
  canCreate: true,
  canRead: true,
  canUpdate: true,
  canDelete: true,
};
const READ = {
  canCreate: false,
  canRead: true,
  canUpdate: false,
  canDelete: false,
};
const CR = {
  canCreate: true,
  canRead: true,
  canUpdate: false,
  canDelete: false,
};
const NONE = {
  canCreate: false,
  canRead: false,
  canUpdate: false,
  canDelete: false,
};

function buildMatrix(perModule: Record<string, typeof FULL>): ModuleAccess[] {
  return Object.entries(perModule).map(([module, access]) => ({
    module,
    ...access,
  }));
}

const MATRIX_B = buildMatrix({
  players: FULL,
  contracts: READ,
  matches: READ,
  calendar: READ,
  documents: READ,
  tasks: READ,
  tickets: CR,
  messaging: FULL,
  notifications: FULL,
  sessions: FULL,
  referrals: FULL,
  wellness: NONE,
  injuries: NONE,
  scouting: NONE,
  finance: NONE,
  training: NONE,
  esignatures: NONE,
  reports: NONE,
  journey: NONE,
  gates: NONE,
  notes: NONE,
});

const MATRIX_BPLUS = buildMatrix({
  players: FULL,
  contracts: READ,
  matches: CR,
  calendar: FULL,
  documents: CR,
  tasks: FULL,
  tickets: FULL,
  messaging: FULL,
  notifications: FULL,
  sessions: CR,
  referrals: CR,
  wellness: CR,
  injuries: FULL,
  training: READ,
  notes: FULL,
  scouting: NONE,
  finance: NONE,
  esignatures: NONE,
  reports: NONE,
  journey: NONE,
  gates: NONE,
});

const FULL_MODULES = [
  "players",
  "contracts",
  "matches",
  "calendar",
  "documents",
  "tasks",
  "tickets",
  "messaging",
  "notifications",
  "sessions",
  "referrals",
  "wellness",
  "injuries",
  "training",
  "notes",
  "scouting",
  "finance",
  "esignatures",
  "reports",
  "journey",
  "gates",
  "approvals",
  "offers",
  "clubs",
  "competitions",
];

const MATRIX_A: ModuleAccess[] = FULL_MODULES.map((module) => ({
  module,
  ...FULL,
}));
const MATRIX_APLUS: ModuleAccess[] = MATRIX_A;

const TIER_MATRICES: Record<string, ModuleAccess[]> = {
  B: MATRIX_B,
  "B+": MATRIX_BPLUS,
  A: MATRIX_A,
  "A+": MATRIX_APLUS,
};

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  if (!(await tableExists(queryInterface, "packages"))) return;

  // 1. Add metadata columns (idempotent)
  await addColumnIfMissing(queryInterface, "packages", "tagline_en", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "packages", "tagline_ar", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "packages", "fee_min", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "packages", "fee_max", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "packages", "commission_pct", {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 10.0,
  });
  await addColumnIfMissing(queryInterface, "packages", "tracks", {
    type: DataTypes.JSONB,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "packages", "max_players", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "packages", "display_order", {
    type: DataTypes.SMALLINT,
    allowNull: false,
    defaultValue: 0,
  });

  const tx = await queryInterface.sequelize.transaction();
  try {
    // 2. Upsert the four canonical tier rows
    for (const seed of TIER_SEEDS) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO packages (
          id, code, name, name_ar, description, is_active,
          tagline_en, tagline_ar, fee_min, fee_max, commission_pct,
          tracks, max_players, display_order, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), :code, :nameEn, :nameAr, :taglineEn, true,
          :taglineEn, :taglineAr, :feeMin, :feeMax, :commissionPct,
          CAST(:tracks AS JSONB), :maxPlayers, :displayOrder, now(), now()
        )
        ON CONFLICT (code) DO UPDATE SET
          name           = EXCLUDED.name,
          name_ar        = EXCLUDED.name_ar,
          description    = EXCLUDED.description,
          is_active      = true,
          tagline_en     = EXCLUDED.tagline_en,
          tagline_ar     = EXCLUDED.tagline_ar,
          fee_min        = EXCLUDED.fee_min,
          fee_max        = EXCLUDED.fee_max,
          commission_pct = EXCLUDED.commission_pct,
          tracks         = EXCLUDED.tracks,
          max_players    = EXCLUDED.max_players,
          display_order  = EXCLUDED.display_order,
          updated_at     = now()
        `,
        {
          transaction: tx,
          replacements: {
            code: seed.code,
            nameEn: seed.nameEn,
            nameAr: seed.nameAr,
            taglineEn: seed.taglineEn,
            taglineAr: seed.taglineAr,
            feeMin: seed.feeMin,
            feeMax: seed.feeMax,
            commissionPct: seed.commissionPct,
            tracks: JSON.stringify(seed.tracks),
            maxPlayers: seed.maxPlayers,
            displayOrder: seed.displayOrder,
          },
        },
      );
    }

    // 3. Deactivate legacy code='C' row
    await queryInterface.sequelize.query(
      `UPDATE packages SET is_active = false, updated_at = now() WHERE code = 'C'`,
      { transaction: tx },
    );

    // 4. Remap player_package values: C → B, B → B+ (single-pass CASE so we
    //    don't double-shift). A unchanged. A+ retained if already present.
    if (await tableExists(queryInterface, "players")) {
      await queryInterface.sequelize.query(
        `
        UPDATE players SET player_package = CASE player_package
          WHEN 'C'  THEN 'B'
          WHEN 'B'  THEN 'B+'
          ELSE player_package
        END
        WHERE player_package IN ('C', 'B')
        `,
        { transaction: tx },
      );
    }

    // 5. Reseed package_configs matrix
    if (await tableExists(queryInterface, "package_configs")) {
      // Wipe legacy 'C' rows entirely and any rows for tiers we're rewriting
      await queryInterface.sequelize.query(
        `DELETE FROM package_configs WHERE package IN ('C', 'B', 'B+', 'A', 'A+')`,
        { transaction: tx },
      );

      for (const [tierCode, modules] of Object.entries(TIER_MATRICES)) {
        for (const m of modules) {
          await queryInterface.sequelize.query(
            `
            INSERT INTO package_configs (
              id, package, module, can_create, can_read, can_update, can_delete,
              created_at, updated_at
            ) VALUES (
              gen_random_uuid(), :pkg, :mod, :cc, :cr, :cu, :cd, now(), now()
            )
            `,
            {
              transaction: tx,
              replacements: {
                pkg: tierCode,
                mod: m.module,
                cc: m.canCreate,
                cr: m.canRead,
                cu: m.canUpdate,
                cd: m.canDelete,
              },
            },
          );
        }
      }
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  if (!(await tableExists(queryInterface, "packages"))) return;

  const tx = await queryInterface.sequelize.transaction();
  try {
    // Reverse player remap: B+ → B, B → C
    if (await tableExists(queryInterface, "players")) {
      await queryInterface.sequelize.query(
        `
        UPDATE players SET player_package = CASE player_package
          WHEN 'B+' THEN 'B'
          WHEN 'B'  THEN 'C'
          ELSE player_package
        END
        WHERE player_package IN ('B', 'B+')
        `,
        { transaction: tx },
      );
    }

    // Remove the new tier rows we added
    await queryInterface.sequelize.query(
      `DELETE FROM packages WHERE code IN ('A+', 'B+')`,
      { transaction: tx },
    );

    // Reactivate legacy C row if present
    await queryInterface.sequelize.query(
      `UPDATE packages SET is_active = true, updated_at = now() WHERE code = 'C'`,
      { transaction: tx },
    );

    // Drop reseeded package_configs rows
    if (await tableExists(queryInterface, "package_configs")) {
      await queryInterface.sequelize.query(
        `DELETE FROM package_configs WHERE package IN ('B+', 'A+')`,
        { transaction: tx },
      );
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  // Drop metadata columns
  await removeColumnIfPresent(queryInterface, "packages", "display_order");
  await removeColumnIfPresent(queryInterface, "packages", "max_players");
  await removeColumnIfPresent(queryInterface, "packages", "tracks");
  await removeColumnIfPresent(queryInterface, "packages", "commission_pct");
  await removeColumnIfPresent(queryInterface, "packages", "fee_max");
  await removeColumnIfPresent(queryInterface, "packages", "fee_min");
  await removeColumnIfPresent(queryInterface, "packages", "tagline_ar");
  await removeColumnIfPresent(queryInterface, "packages", "tagline_en");
}
