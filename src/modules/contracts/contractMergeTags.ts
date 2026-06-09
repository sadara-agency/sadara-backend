import { fmtDate, escHtml } from "@shared/utils/pdf";

// ── Arabic date format matching the legacy PDF (e.g. "01 / 06 / 2026م") ──
function arDate(s: string | null | undefined): string {
  if (!s) return "";
  return fmtDate(s, { fallback: "", suffix: "م", separator: " / " });
}

// ── Contract duration in Arabic (mirrors the legacy calcDur) ──
function arDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return "";
  try {
    const s = new Date(start);
    const e = new Date(end);
    const m =
      (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth();
    if (m === 24) return "سنتان (24 شهرًا)";
    if (m === 12) return "سنة واحدة (12 شهرًا)";
    return m > 0 ? `${m} شهرًا` : "";
  } catch {
    return "";
  }
}

export interface TagContextInput {
  player: {
    firstName?: string | null;
    lastName?: string | null;
    firstNameAr?: string | null;
    lastNameAr?: string | null;
    nationality?: string | null;
    nationalId?: string | null;
    phone?: string | null;
  };
  contract: {
    startDate?: string | null;
    endDate?: string | null;
    commissionPct?: number | string | null;
    displayId?: string | null;
    agentName?: string | null;
    agentLicense?: string | null;
  };
  today?: string | null;
}

export const MERGE_TAGS: ReadonlyArray<{
  key: string;
  labelAr: string;
  resolve: (c: TagContextInput) => string;
}> = [
  {
    key: "player.name",
    labelAr: "اسم اللاعب",
    resolve: (c) => {
      const ar =
        c.player.firstNameAr && c.player.lastNameAr
          ? `${c.player.firstNameAr} ${c.player.lastNameAr}`
          : "";
      const en =
        c.player.firstName && c.player.lastName
          ? `${c.player.firstName} ${c.player.lastName}`
          : "";
      return ar || en || "";
    },
  },
  {
    key: "player.nameEn",
    labelAr: "اسم اللاعب (إنجليزي)",
    resolve: (c) =>
      c.player.firstName && c.player.lastName
        ? `${c.player.firstName} ${c.player.lastName}`
        : "",
  },
  {
    key: "player.nationalId",
    labelAr: "رقم الهوية",
    resolve: (c) => c.player.nationalId ?? "",
  },
  {
    key: "player.nationality",
    labelAr: "الجنسية",
    resolve: (c) => c.player.nationality ?? "",
  },
  {
    key: "player.phone",
    labelAr: "الجوال",
    resolve: (c) => c.player.phone ?? "",
  },
  {
    key: "contract.startDate",
    labelAr: "تاريخ البداية",
    resolve: (c) => arDate(c.contract.startDate),
  },
  {
    key: "contract.endDate",
    labelAr: "تاريخ النهاية",
    resolve: (c) => arDate(c.contract.endDate),
  },
  {
    key: "contract.duration",
    labelAr: "مدة العقد",
    resolve: (c) => arDuration(c.contract.startDate, c.contract.endDate),
  },
  {
    key: "commission.pct",
    labelAr: "نسبة العمولة",
    resolve: (c) =>
      c.contract.commissionPct === null ||
      c.contract.commissionPct === undefined
        ? ""
        : String(c.contract.commissionPct),
  },
  {
    key: "contract.displayId",
    labelAr: "رقم العقد",
    resolve: (c) => c.contract.displayId ?? "",
  },
  {
    key: "agent.name",
    labelAr: "اسم الوكيل",
    resolve: (c) => c.contract.agentName ?? "",
  },
  {
    key: "agent.license",
    labelAr: "رخصة فيفا",
    resolve: (c) => c.contract.agentLicense ?? "",
  },
  {
    key: "today",
    labelAr: "تاريخ التحرير",
    resolve: (c) => arDate(c.today ?? null),
  },
] as const;

export function buildTagContext(
  input: TagContextInput,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tag of MERGE_TAGS) {
    out[tag.key] = tag.resolve(input);
  }
  return out;
}

export function resolveMergeTags(
  html: string,
  data: Record<string, string>,
): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    const val = data[key];
    if (val === undefined) return match;
    return val === "" ? '<span class="blank"></span>' : escHtml(val);
  });
}

/**
 * Full Exclusive Representation Agreement body (11 clauses) as semantic HTML
 * with {{merge-tags}}. Agency/agent details are fixed text; player + contract
 * data are tags. Reused by the seed and the prod SQL so they never drift.
 */
export const REPRESENTATION_BODY_HTML = `
<h1 class="contract-title">عقد تمثيل رياضي حصري</h1>

<h2 class="clause">التمهيد</h2>
<p>حيث إن شركة صدارة المواهب الرياضية المحدودة (الطرف الأول) تعمل في المجال الرياضي وفي أنشطة إدارة وتمثيل لاعبي كرة القدم والتفاوض بشأن عقودهم الرياضية والتجارية داخل المملكة العربية السعودية وخارجها، وفق الأنظمة واللوائح المعمول بها؛</p>
<p>وحيث إن الطرف الأول يمارس نشاطه من خلال وكيل معتمد ومرخّص من الاتحاد الدولي لكرة القدم (فيفا) يعمل تحت مظلة الشركة؛</p>
<p>وحيث إن الطرف الثاني (اللاعب) يرغب في الاستعانة بخدمات الطرف الأول لتمثيله تمثيلاً حصرياً؛</p>
<p>فقد اتفق الطرفين وهما بكامل أهليتهما الشرعية والنظامية على ما يلي، ويعدّ التمهيد جزءاً لا يتجزأ من العقد:</p>

<h2 class="clause">المادة (1): بيانات الأطراف</h2>
<p><strong>الطرف الأول/</strong> شركة صدارة المواهب الرياضية المحدودة<br/>
<strong>المقر/</strong> السعودية، الرياض، حي عرقة، طريق الأمير مشعل ص.ب 12534<br/>
<strong>الرقم الموحد/</strong> 7052143646<br/>
<strong>يمثلها/</strong> خالد بن علي الشهري<br/>
<strong>جوال رقم/</strong> 0533919155<br/>
<strong>البريد الإلكتروني/</strong> khaled@sadarasport.sa</p>
<table class="party">
  <tr><th colspan="2">الطرف الثاني: اللاعب</th></tr>
  <tr><td>الاسم</td><td class="value">{{player.name}}</td></tr>
  <tr><td>هوية رقم</td><td class="value">{{player.nationalId}}</td></tr>
  <tr><td>الجنسية</td><td class="value">{{player.nationality}}</td></tr>
  <tr><td>جوال رقم</td><td class="value">{{player.phone}}</td></tr>
</table>

<h2 class="clause">المادة (2): نطاق التمثيل (موضوع العقد)</h2>
<p>يمنح اللاعب الشركة حق التمثيل الحصري الكامل داخل المملكة وخارجها في الآتي:</p>
<ol>
  <li>التفاوض مع الأندية بشأن توقيع أو تجديد أو فسخ أو إعارة أو تعديل أي عقد رياضي يخص اللاعب</li>
  <li>التفاوض بشأن أي عقود تجارية أو رعائية أو دعائية تتعلق باللاعب، بعد موافقته</li>
  <li>متابعة الإجراءات القانونية والإدارية المتعلقة بالعقود</li>
  <li>توثيق العقود في الأنظمة الرسمية (TMS أو ما يستحدث)</li>
  <li>يقر اللاعب بأن هذه الحصرية سارية طوال مدة العقد ولا يجوز له تفويض أي جهة أخرى في هذه الأعمال</li>
</ol>

<h2 class="clause">المادة (3): وجود وكيل مرخّص</h2>
<p>يقر الطرف الأول بأن جميع أعمال التمثيل المنصوص عليها في العقد تُدار من خلال وكيل معتمد ومرخّص من الاتحاد الدولي لكرة القدم (فيفا)، وفق البيانات التالية:</p>
<p>الاسم: Ahmed Osman Hadoug<br/>
رقم رخصة فيفا: FIFA AGENT LICENSE No (202411-8478)<br/>
جهة الترخيص: الاتحاد الدولي لكرة القدم - (FIFA)</p>
<p>ويعمل الوكيل تحت مظلة شركة صدارة، وتبقى العلاقة التعاقدية في هذا العقد بين اللاعب والشركة مباشرة.</p>

<h2 class="clause">المادة (4): مدة العقد</h2>
<p>مدة هذا العقد {{contract.duration}} تبدأ من تاريخ {{contract.startDate}} وتنتهي في تاريخ {{contract.endDate}}.</p>

<h2 class="clause">المادة (5): التزامات الطرف الأول (الشركة)</h2>
<ol>
  <li>بذل العناية اللازمة للحصول على أفضل العروض الرياضية والتجارية</li>
  <li>التفاوض نيابة عن اللاعب وفق الأنظمة واللوائح المعمول بها</li>
  <li>مراجعة وصياغة العقود وتوضيح آثارها للاعب قبل توقيعها</li>
  <li>عدم توقيع أي اتفاق نيابة عن اللاعب دون موافقته الخطية</li>
  <li>إبلاغ اللاعب بأي عرض رسمي يصل للشركة فور استلامه</li>
  <li>تمثيل اللاعب أمام الأندية والجهات المختصة</li>
  <li>الحفاظ على سرية جميع البيانات والمعلومات</li>
</ol>

<h2 class="clause">المادة (6): التزامات الطرف الثاني (اللاعب)</h2>
<ol>
  <li>الالتزام بالحصرية وعدم التعامل أو التفاوض مع أي وسيط آخر</li>
  <li>إبلاغ الشركة فوراً بأي عرض أو تواصل من أي نادٍ أو جهة تجارية</li>
  <li>تقديم المعلومات الصحيحة المتعلقة بوضعه التعاقدي</li>
  <li>التعاون مع الشركة فيما يخص المقابلات أو العروض</li>
  <li>دفع العمولة المستحقة للطرف الأول في وقتها المحدد</li>
</ol>

<h2 class="clause">المادة (7): العمولة</h2>
<p><strong>أولاً: العقود الرياضية</strong></p>
<p>يستحق الطرف الأول عمولة بنسبة ({{commission.pct}}٪) من إجمالي قيمة العقد الرياضي الذي يتم إبرامه أو تجديده من خلال الشركة.</p>
<p><strong>ثانياً: العقود التجارية والإعلانية</strong></p>
<p><strong>السداد:</strong> تفويض النادي بالسداد مباشرة للشركة إن أمكن، أو يقوم اللاعب بالسداد خلال (14) يوماً من استلام المبالغ من الجهة المتعاقدة.</p>

<h2 class="clause">المادة (8): السرية</h2>
<p>يلتزم الطرفان بسرية جميع البيانات والمعلومات والمراسلات ولا يجوز الإفصاح عنها إلا بما يتطلبه النظام أو الاتفاق.</p>

<h2 class="clause">المادة (9): إنهاء العقد</h2>
<p>يجوز إنهاء العقد في الحالات التالية:</p>
<ol>
  <li>الإخلال الجوهري بأي بند من بنوده وعدم معالجته خلال (30) يوماً</li>
  <li>فقدان الشركة حق مزاولة النشاط دون تعيين وكيل مرخص بديل</li>
  <li>صدور قرار رسمي يمنع اللاعب من ممارسة كرة القدم لأكثر من (6) أشهر</li>
</ol>
<p>ولا يؤثر الإنهاء على حقوق الشركة في العمولات المستحقة عن العقود التي تمت خلال مدة السريان.</p>

<h2 class="clause">المادة (10): تسوية المنازعات</h2>
<ol>
  <li>تُحل النزاعات ودياً أولاً خلال (30) يوماً</li>
  <li>عند التعذر، تُحال المنازعات إلى الجهة المختصة في الاتحاد السعودي لكرة القدم</li>
</ol>
<p>وفي حال النزاعات المتعلقة بلوائح فيفا يتم الرجوع إلى اللجان الدولية المختصة مثل غرفة وكلاء فيفا أو محكمة CAS.</p>

<h2 class="clause">المادة (11): أحكام عامة</h2>
<ol>
  <li>أي تعديل على العقد يجب أن يكون مكتوباً وموقعاً من الطرفين</li>
  <li>إذا أصبح أي بند غير قابل للتطبيق يتم استبداله بما يحقق الغرض دون إبطال العقد</li>
  <li>يُحرّر العقد من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها</li>
</ol>

<h2 class="clause">التوقيعات</h2>
<table class="sign-grid">
  <tr>
    <td>
      <p><strong>الطرف الأول / شركة صدارة المواهب الرياضية</strong></p>
      <p>يمثلها/ خالد بن علي الشهري</p>
      <p>الصفة/ المدير العام</p>
      <p>التوقيع: <span class="sign-line"></span></p>
      <p style="direction:ltr;text-align:left">Ahmed Osman Hadoug</p>
    </td>
    <td>
      <p><strong>الطرف الثاني / اللاعب</strong></p>
      <p>{{player.name}}</p>
      <p>التوقيع: <span class="sign-line"></span></p>
      <p style="direction:ltr;text-align:left">{{player.nameEn}}</p>
    </td>
  </tr>
</table>

<p><strong>توقيع ولي أمر اللاعب (إن كان اللاعب قاصراً)</strong></p>
<p>أقر بموافقتي على هذا العقد والتزام اللاعب بجميع بنوده:</p>
<table class="party">
  <tr><td>الاسم</td><td></td></tr>
  <tr><td>صلة القرابة</td><td></td></tr>
  <tr><td>التاريخ</td><td></td></tr>
  <tr><td>التوقيع</td><td></td></tr>
</table>
`;
