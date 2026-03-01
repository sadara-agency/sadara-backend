"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePdf = generatePdf;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const pdf_lib_1 = require("pdf-lib");
const errorHandler_1 = require("../../middleware/errorHandler");
const contractService = __importStar(require("./contract.service"));
// ── Asset paths (brand template pages) ──
const ASSETS_DIR = path_1.default.resolve(process.cwd(), 'src', 'assets', 'pdf');
const COVER_PDF = path_1.default.join(ASSETS_DIR, 'cover_page.pdf');
const BACK_PDF = path_1.default.join(ASSETS_DIR, 'back_page.pdf');
const TMP = path_1.default.resolve(process.cwd(), 'tmp');
if (!fs_1.default.existsSync(TMP))
    fs_1.default.mkdirSync(TMP, { recursive: true });
// ─── Helpers ────────────────────────────────────────────────
function fmtDate(s) {
    if (!s)
        return '';
    try {
        const d = new Date(s);
        return `${String(d.getDate()).padStart(2, '0')} / ${String(d.getMonth() + 1).padStart(2, '0')} / ${d.getFullYear()}م`;
    }
    catch {
        return s;
    }
}
function calcDur(a, b) {
    try {
        const s = new Date(a), e = new Date(b);
        const m = (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth();
        if (m === 24)
            return 'سنتان (24 شهرًا)';
        if (m === 12)
            return 'سنة واحدة (12 شهرًا)';
        return m > 0 ? `${m} شهرًا` : '';
    }
    catch {
        return '';
    }
}
function getData(c) {
    const p = c.player || {};
    const ar = p.firstNameAr && p.lastNameAr ? `${p.firstNameAr} ${p.lastNameAr}` : null;
    const en = p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : '';
    return {
        pn: ar || en || 'غير محدد',
        nat: p.nationality || '',
        pid: p.nationalId || p.idNumber || '',
        ph: p.phone || '',
        sd: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
        ed: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : '',
        cpct: Number(c.commissionPct) || 10,
        sigImg: c.signingMethod === 'digital' ? (c.signedDocumentUrl || '') : '',
        sigDt: c.signedAt ? new Date(c.signedAt).toISOString().split('T')[0] : '',
    };
}
// ─── CSS (system fonts only — zero network) ─────────────────
const CSS = `*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#000;background:#fff;width:595px;height:842px;overflow:hidden;font-size:8.8pt;line-height:1.5}
.pg{width:595px;height:842px;position:relative}
.hd{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 35px 12px;border-bottom:2px solid #000}
.hd-r{text-align:right}.lt{font-size:14pt;font-weight:700}.ls{font-size:7.5pt;font-weight:500;letter-spacing:1px}
.hd-l{text-align:left;direction:ltr;font-size:7.5pt;line-height:1.5}.nn{font-weight:700}
.ct{padding:10px 35px}.tt{text-align:center;font-size:22pt;font-weight:700;margin:12px 0 16px;letter-spacing:2px}
.st{font-weight:700;font-size:9pt;background:#000;color:#fff;display:inline-block;padding:1px 8px;margin:6px 0 3px}
.at{font-weight:700;font-size:9pt;text-decoration:underline;margin:8px 0 2px}
p{margin-bottom:2px}
.pts{display:flex;justify-content:space-between;gap:15px;margin-top:5px}
.pr{flex:1;text-align:right;font-size:8.5pt;line-height:1.6}.pl{width:170px}
.pl table{border-collapse:collapse;width:100%}.pl td{border:1px solid #000;padding:2px 6px;font-size:8pt}
.vl{color:#3C3CFA;font-weight:600}
.ni{display:flex;align-items:flex-start;gap:4px;font-size:8.5pt}
.nc{min-width:14px;height:14px;border-radius:50%;background:#3C3CFA;color:#fff;font-size:6.5pt;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:2px}
.db{display:flex;align-items:center;gap:6px;margin:3px 0}
.dx{border:1px solid #000;padding:2px 10px;font-size:8.5pt;text-align:center;direction:ltr}
.dl{font-weight:700;font-size:8.5pt;background:#3C3CFA;color:#fff;padding:2px 8px}
.ss{display:flex;justify-content:space-between;margin-top:10px;gap:20px}.sb{flex:1;font-size:8.5pt}
.sf{border-bottom:1px solid #000;display:inline-block;min-width:130px;height:14px}
.gu{margin-top:8px;padding-top:4px;border-top:1px solid #ccc;font-size:8pt}
.gt{border-collapse:collapse;width:170px;margin-top:3px}.gt td{border:1px solid #000;padding:2px 6px;font-size:8pt}`;
const HD = `<div class="hd"><div class="hd-r"><div class="lt">شـركــة صـــدارة الـريـاضـيـة</div><div class="ls">SADARA SPORTS COMPANY</div></div><div class="hd-l"><div class="nn">N.N/ 7052143646</div><div>Prince Meshaal Ibn Abd AlAziz, Irqah, Riyadh 12534</div><div style="border-top:1px solid #000;margin-top:3px;padding-top:3px">P - +966533919155 &nbsp; W - www.sadarasport.sa<br>M - info@sadarasport.sa</div></div></div>`;
// ─── Page Builders (pages 2 & 3 only — cover/back from assets) ──
const wrap = (body) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>${body}</body></html>`;
function pg2(d) {
    const sd = fmtDate(d.sd), ed = fmtDate(d.ed), dur = calcDur(d.sd, d.ed);
    return wrap(`<div class="pg">${HD}<div class="ct">
<div class="tt">عـقـد تـمـثـيـل ريـاضـي حـصـري</div>
<div class="st">التمهيــد</div>
<p style="font-size:9pt">حيث إن شركة صدارة المواهب الرياضية المحدودة (الطرف الأول) تعمل في المجال الرياضي وفي أنشطة إدارة وتمثيل لاعبي كرة القدم والتفاوض بشأن عقودهم الرياضية والتجارية داخل المملكة العربية السعودية وخارجها، وفق الأنظمة واللوائح المعمول بها؛</p>
<p style="font-size:9pt">وحيث إن الطرف الأول يمارس نشاطه من خلال وكيل معتمد ومرخّص من الاتحاد الدولي لكرة القدم (فيفا) يعمل تحت مظلة الشركة؛</p>
<p style="font-size:9pt">وحيث إن الطرف الثاني (اللاعب) يرغب في الاستعانة بخدمات الطرف الأول لتمثيله تمثيلاً حصرياً؛</p>
<p style="font-size:9pt">فقد اتفق الطرفين وهما بكامل أهليتهما الشرعية والنظامية على ما يلي، ويعدّ التمهيد جزءاً لا يتجزأ من العقد:</p>
<div class="at">المادة (1): بيانات الأطراف</div>
<div class="pts"><div class="pr"><strong>الطرف الأول/</strong> شركة صدارة المواهب الرياضية المحدودة<br><strong>المقر/</strong> السعودية، الرياض، حي عرقة، طريق الأمير مشعل ص.ب 12534<br><strong>الرقم الموحد/</strong>7052143646<br><strong>يمثلها/</strong> خالد بن علي الشهري<br><strong>جوال رقم/</strong> 0533919155<br><strong>البريد الإلكتروني</strong> khaled@sadarasport.sa</div>
<div class="pl"><table><tr><td colspan="2" style="font-weight:700;text-align:center;background:#f5f5f5">الطرف الثاني: اللاعب</td></tr><tr><td class="vl">${d.pn}</td><td></td></tr><tr><td class="vl">${d.pid}</td><td>هوية رقم</td></tr><tr><td class="vl">${d.nat}</td><td>الجنسية</td></tr><tr><td class="vl">${d.ph}</td><td>جوال رقم</td></tr></table></div></div>
<div class="at">المادة (2): نطاق التمثيل (موضوع العقد)</div>
<p>يمنح اللاعب الشركة حق التمثيل الحصري الكامل داخل المملكة وخارجها في الآتي:</p>
<div class="ni"><span class="nc">1</span><span>التفاوض مع الأندية بشأن توقيع أو تجديد أو فسخ أو إعارة أو تعديل أي عقد رياضي يخص اللاعب</span></div>
<div class="ni"><span class="nc">2</span><span>التفاوض بشأن أي عقود تجارية أو رعائية أو دعائية تتعلق باللاعب، بعد موافقته</span></div>
<div class="ni"><span class="nc">3</span><span>متابعة الإجراءات القانونية والإدارية المتعلقة بالعقود</span></div>
<div class="ni"><span class="nc">4</span><span>توثيق العقود في الأنظمة الرسمية (TMS أو ما يستحدث)</span></div>
<div class="ni"><span class="nc">5</span><span>يقر اللاعب بأن هذه الحصرية سارية طوال مدة العقد ولا يجوز له تفويض أي جهة أخرى في هذه الأعمال</span></div>
<div class="at">المادة (3): وجود وكيل مرخّص</div>
<p>يقر الطرف الأول بأن جميع أعمال التمثيل تُدار من خلال وكيل معتمد ومرخّص من فيفا:</p>
<p style="text-align:center">الاسم: Ahmed Osman Hadoug<br>رقم رخصة فيفا FIFA AGENT LICENSE No (202411-8478)<br>جهة الترخيص: الاتحاد الدولي لكرة القدم - (FIFA)</p>
<p>ويعمل الوكيل تحت مظلة شركة صدارة، وتبقى العلاقة التعاقدية بين اللاعب والشركة مباشرة</p>
<div class="at">المادة (4): مدة العقد</div>
<p>مدة هذا العقد ${dur} تبدأ من:</p>
<div class="db"><span class="dl">من تاريخ</span><span class="dx">${sd}</span></div>
<div class="db"><span class="dl" style="background:#000">إلى تاريخ:</span><span class="dx">${ed}</span></div>
<div class="at">المادة (5): التزامات الطرف الأول (الشركة)</div>
<div class="ni"><span class="nc">1</span><span>بذل العناية اللازمة للحصول على أفضل العروض الرياضية والتجارية</span></div>
<div class="ni"><span class="nc">2</span><span>التفاوض نيابة عن اللاعب وفق الأنظمة واللوائح المعمول بها</span></div>
<div class="ni"><span class="nc">3</span><span>مراجعة وصياغة العقود وتوضيح آثارها للاعب قبل توقيعها</span></div>
<div class="ni"><span class="nc">4</span><span>عدم توقيع أي اتفاق نيابة عن اللاعب دون موافقته الخطية</span></div>
<div class="ni"><span class="nc">5</span><span>إبلاغ اللاعب بأي عرض رسمي يصل للشركة فور استلامه</span></div>
<div class="ni"><span class="nc">6</span><span>تمثيل اللاعب أمام الأندية والجهات المختصة</span></div>
<div class="ni"><span class="nc">7</span><span>الحفاظ على سرية جميع البيانات والمعلومات</span></div>
</div></div>`);
}
function pg3(d) {
    const sd = fmtDate(d.sd);
    const sig = d.sigImg ? `<img src="${d.sigImg}" style="height:40px;margin-top:3px" />` : '<span class="sf"></span>';
    const sdt = d.sigDt ? `<span style="border:1px solid #000;padding:1px 8px;font-size:8.5pt">${fmtDate(d.sigDt)}</span>` : '<span class="sf"></span>';
    return wrap(`<div class="pg">${HD}<div class="ct">
<div class="st">المادة (6): التزامات الطرف الثاني (اللاعب)</div>
<div class="ni"><span class="nc">1</span><span>الالتزام بالحصرية وعدم التعامل أو التفاوض مع أي وسيط آخر</span></div>
<div class="ni"><span class="nc">2</span><span>إبلاغ الشركة فوراً بأي عرض أو تواصل من أي نادٍ أو جهة تجارية</span></div>
<div class="ni"><span class="nc">3</span><span>تقديم المعلومات الصحيحة المتعلقة بوضعه التعاقدي</span></div>
<div class="ni"><span class="nc">4</span><span>التعاون مع الشركة فيما يخص المقابلات أو العروض</span></div>
<div class="ni"><span class="nc">5</span><span>دفع العمولة المستحقة للطرف الأول في وقتها المحدد</span></div>
<div class="st">المادة (7): العمولة</div>
<p><strong>أولاً: العقود الرياضية</strong></p>
<p>يستحق الطرف الأول عمولة بنسبة (${d.cpct}٪) من إجمالي قيمة العقد الرياضي</p>
<p><strong>ثانياً: العقود التجارية والإعلانية</strong></p>
<p><strong>السداد:</strong> تفويض النادي بالسداد مباشرة للشركة إن أمكن، أو يقوم اللاعب بالسداد خلال (14) يوماً من استلام المبالغ</p>
<div class="st">المادة (8): السرية</div>
<p>يلتزم الطرفان بسرية جميع البيانات والمعلومات والمراسلات ولا يجوز الإفصاح عنها إلا بما يتطلبه النظام أو الاتفاق</p>
<div class="st">المادة (9): إنهاء العقد</div>
<p>يجوز إنهاء العقد في الحالات التالية:</p>
<div class="ni"><span class="nc">1</span><span>الإخلال الجوهري بأي بند وعدم معالجته خلال (30) يوماً</span></div>
<div class="ni"><span class="nc">2</span><span>فقدان الشركة حق مزاولة النشاط دون تعيين وكيل مرخص بديل</span></div>
<div class="ni"><span class="nc">3</span><span>صدور قرار رسمي يمنع اللاعب من ممارسة كرة القدم لأكثر من (6) أشهر</span></div>
<p>ولا يؤثر الإنهاء على حقوق الشركة في العمولات المستحقة عن العقود التي تمت خلال مدة السريان</p>
<div class="st">المادة (10): تسوية المنازعات</div>
<div class="ni"><span class="nc">1</span><span>تُحل النزاعات ودياً أولاً خلال (30) يوماً</span></div>
<div class="ni"><span class="nc">2</span><span>عند التعذر، تُحال إلى الجهة المختصة في الاتحاد السعودي لكرة القدم</span></div>
<p>وفي حال النزاعات المتعلقة بلوائح فيفا يتم الرجوع إلى غرفة وكلاء فيفا أو محكمة CAS</p>
<div class="st">المادة (11): أحكام عامة</div>
<div class="ni"><span class="nc">1</span><span>أي تعديل يجب أن يكون مكتوباً وموقعاً من الطرفين</span></div>
<div class="ni"><span class="nc">2</span><span>إذا أصبح أي بند غير قابل للتطبيق يتم استبداله بما يحقق الغرض دون إبطال العقد</span></div>
<div class="ni"><span class="nc">3</span><span>يُحرّر العقد من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها</span></div>
<div class="ss">
<div class="sb" style="text-align:right"><p style="font-size:9.5pt"><strong>التوقيعات</strong></p><p>الطرف الأول / شركة صدارة المواهب الرياضية</p><p>يمثلها/ خالد بن علي الشهري</p><p>الصفة/ المدير العام</p><p>من تاريخ: <span style="border:1px solid #000;padding:1px 8px;font-size:8.5pt">${sd}</span></p><p style="margin-top:5px">التوقيع:_________________________</p><p style="direction:ltr;text-align:left;font-size:9pt">Ahmed Osman Hadoug</p></div>
<div class="sb" style="text-align:right"><p>&nbsp;</p><p><strong>الطرف الثاني: اللاعب</strong></p><p style="color:#3C3CFA;font-weight:700">${d.pn}</p><p>التاريخ ${sdt}</p><p style="margin-top:5px">التوقيع ${sig}</p></div>
</div>
<div class="gu"><p><strong>توقيع ولي أمر اللاعب (إن كان اللاعب قاصراً)</strong></p><p style="font-size:8pt">أقر بموافقتي على هذا العقد والتزام اللاعب بجميع بنوده:</p><table class="gt"><tr><td>الاسم</td><td style="min-width:90px"></td></tr><tr><td>صلة القرابة</td><td></td></tr><tr><td>التاريخ</td><td></td></tr><tr><td>التوقيع</td><td></td></tr></table></div>
</div></div>`);
}
// ─── Render a single HTML page to PDF buffer ────────────────
async function renderHtmlPage(page, html) {
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
    return page.pdf({
        width: '595px', height: '842px',
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
        printBackground: true,
    });
}
// ─── Main Endpoint ──────────────────────────────────────────
async function generatePdf(req, res) {
    const contract = await contractService.getContractById(req.params.id);
    if (!contract)
        throw new errorHandler_1.AppError('Contract not found', 404);
    // Validate brand assets exist
    if (!fs_1.default.existsSync(COVER_PDF)) {
        throw new errorHandler_1.AppError(`Brand asset not found: ${COVER_PDF}. Place cover_page.pdf in src/assets/pdf/`, 500);
    }
    if (!fs_1.default.existsSync(BACK_PDF)) {
        throw new errorHandler_1.AppError(`Brand asset not found: ${BACK_PDF}. Place back_page.pdf in src/assets/pdf/`, 500);
    }
    const d = getData(contract);
    let browser = null;
    try {
        // ── 1. Load brand cover & back pages ──
        const coverBytes = fs_1.default.readFileSync(COVER_PDF);
        const backBytes = fs_1.default.readFileSync(BACK_PDF);
        // ── 2. Render content pages 2 & 3 with Puppeteer ──
        browser = await puppeteer_1.default.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
        });
        const page = await browser.newPage();
        const contentBuffers = [];
        for (const html of [pg2(d), pg3(d)]) {
            contentBuffers.push(await renderHtmlPage(page, html));
        }
        await page.close();
        await browser.close();
        browser = null;
        // ── 3. Merge: Cover + Page2 + Page3 + Back ──
        const merged = await pdf_lib_1.PDFDocument.create();
        // Cover (page 1) — from brand template
        const coverDoc = await pdf_lib_1.PDFDocument.load(coverBytes);
        const [coverPage] = await merged.copyPages(coverDoc, [0]);
        merged.addPage(coverPage);
        // Content pages (2 & 3) — from Puppeteer
        for (const buf of contentBuffers) {
            const doc = await pdf_lib_1.PDFDocument.load(buf);
            const pages = await merged.copyPages(doc, doc.getPageIndices());
            pages.forEach(p => merged.addPage(p));
        }
        // Back (page 4) — from brand template
        const backDoc = await pdf_lib_1.PDFDocument.load(backBytes);
        const [backPage] = await merged.copyPages(backDoc, [0]);
        merged.addPage(backPage);
        // ── 4. Finalize & send ──
        const final = await merged.save();
        const name = `عقد_تمثيل_${d.pn}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', final.length);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
        res.end(Buffer.from(final));
    }
    catch (err) {
        if (browser)
            try {
                await browser.close();
            }
            catch { }
        console.error('PDF generation error:', err.message);
        throw new errorHandler_1.AppError(`PDF generation failed: ${err.message}`, 500);
    }
}
//# sourceMappingURL=contract.pdf.controller.js.map