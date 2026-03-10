import { Response } from "express";
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import { AuthRequest } from "../../shared/types";
import { AppError } from "../../middleware/errorHandler";
import * as contractService from "./contract.service";

// ── Asset paths (brand template pages) ──
// In production the compiled JS runs from dist/, so __dirname is dist/modules/contracts.
// Assets are copied to dist/assets/pdf/ during build. Fall back to src/ for local dev.
const ASSETS_DIR_DIST = path.resolve(__dirname, "..", "..", "assets", "pdf");
const ASSETS_DIR_SRC = path.resolve(process.cwd(), "src", "assets", "pdf");
const ASSETS_DIR = fs.existsSync(ASSETS_DIR_DIST)
  ? ASSETS_DIR_DIST
  : ASSETS_DIR_SRC;
const COVER_PDF = path.join(ASSETS_DIR, "cover_page.pdf");
const BACK_PDF = path.join(ASSETS_DIR, "back_page.pdf");

const TMP = path.resolve(process.cwd(), "tmp");
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

// ─── Helpers ────────────────────────────────────────────────

function fmtDate(s: string): string {
  if (!s) return "";
  try {
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")} / ${String(d.getMonth() + 1).padStart(2, "0")} / ${d.getFullYear()}م`;
  } catch {
    return s;
  }
}

function calcDur(a: string, b: string): string {
  try {
    const s = new Date(a),
      e = new Date(b);
    const m =
      (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth();
    if (m === 24) return "سنتان (24 شهرًا)";
    if (m === 12) return "سنة واحدة (12 شهرًا)";
    return m > 0 ? `${m} شهرًا` : "";
  } catch {
    return "";
  }
}

/** Ensure a base64 value has the data URI prefix so <img src=""> works */
function ensureDataUri(val: string): string {
  if (!val) return "";
  if (val.startsWith("data:")) return val;
  return `data:image/png;base64,${val}`;
}

function getData(c: any) {
  const p = c.player || {};
  const ar =
    p.firstNameAr && p.lastNameAr ? `${p.firstNameAr} ${p.lastNameAr}` : null;
  const en = p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : "";

  // ── Player signature ──
  let sigImg = "";
  const rawPlayerSig = c.signedDocumentUrl;
  const playerMethod = c.signingMethod;

  console.log("[PDF getData] Player signature debug:", {
    hasSignedDocumentUrl: !!rawPlayerSig,
    signedDocumentUrlLength: rawPlayerSig ? rawPlayerSig.length : 0,
    signedDocumentUrlPrefix: rawPlayerSig
      ? rawPlayerSig.substring(0, 40)
      : "(empty)",
    signingMethod: playerMethod || "(empty)",
    signedAt: c.signedAt || "(empty)",
    status: c.status || "(unknown)",
  });

  if (rawPlayerSig && playerMethod === "digital") {
    sigImg = ensureDataUri(rawPlayerSig);
  }

  // ── Agent signature ──
  let agentSigImg = "";
  if (c.agentSignatureData && c.agentSigningMethod === "digital") {
    agentSigImg = ensureDataUri(c.agentSignatureData);
  }

  return {
    pn: ar || en || "غير محدد",
    pnEn: en || "",
    nat: p.nationality || "",
    pid: p.nationalId || "",
    ph: p.phone || "",
    sd: c.startDate ? new Date(c.startDate).toISOString().split("T")[0] : "",
    ed: c.endDate ? new Date(c.endDate).toISOString().split("T")[0] : "",
    cpct: Number(c.commissionPct) || 10,
    sigImg,
    sigDt: c.signedAt ? new Date(c.signedAt).toISOString().split("T")[0] : "",
    agentSigImg,
    agentSigDt: c.agentSignedAt
      ? new Date(c.agentSignedAt).toISOString().split("T")[0]
      : "",
  };
}

// ─── Brand logo (4-pointed star SVG inline) ─────────────────

const LOGO_SVG = `<svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M50 0C50 0 62 38 100 50C62 62 50 100 50 100C50 100 38 62 0 50C38 38 50 0 50 0Z" fill="#000"/></svg>`;

// ─── CSS — compact to fit all content on exactly 2 pages ────

const CSS = `*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#000;background:#fff;width:595px;height:842px;overflow:hidden;font-size:7.8pt;line-height:1.4}
.pg{width:595px;height:842px;position:relative}
.hd{display:flex;justify-content:space-between;align-items:flex-start;padding:14px 30px 10px;border-bottom:2px solid #000}
.hd-r{display:flex;align-items:center;gap:8px}.hd-r-txt{text-align:right}
.lt{font-size:13pt;font-weight:700}.ls{font-size:7pt;font-weight:500;letter-spacing:1px}
.hd-l{text-align:left;direction:ltr;font-size:7pt;line-height:1.5}.nn{font-weight:700}
.ct{padding:6px 30px 8px}
.tt{text-align:center;font-size:16pt;font-weight:700;margin:8px 0 6px;letter-spacing:2px}
.st{font-weight:700;font-size:8pt;background:#3C3CFA;color:#fff;display:inline-block;padding:1px 8px;margin:5px 0 2px}
.stb{font-weight:700;font-size:8pt;background:#000;color:#fff;display:inline-block;padding:1px 8px;margin:5px 0 2px}
.at{font-weight:700;font-size:8pt;text-decoration:underline;margin:5px 0 1px}
p{margin-bottom:1px}
.pts{display:flex;justify-content:space-between;gap:10px;margin-top:3px}
.pr{flex:1;text-align:right;font-size:7.5pt;line-height:1.5}
.pl{width:155px}
.pl table{border-collapse:collapse;width:100%}.pl td{border:1px solid #000;padding:1px 5px;font-size:7pt}
.vl{color:#3C3CFA;font-weight:600}
.ni{display:flex;align-items:flex-start;gap:3px;font-size:7.8pt;margin:0}
.nc{min-width:13px;height:13px;border-radius:50%;background:#3C3CFA;color:#fff;font-size:6pt;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:1px;flex-shrink:0}
.db{display:flex;align-items:center;gap:5px;margin:2px 0}
.dx{border:1px solid #000;padding:1px 8px;font-size:7.5pt;text-align:center;direction:ltr}
.dl{font-weight:700;font-size:7.5pt;background:#3C3CFA;color:#fff;padding:1px 8px}
.ss{display:flex;justify-content:space-between;margin-top:6px;gap:15px}
.sb{flex:1;font-size:7.5pt;line-height:1.4}
.sf{border-bottom:1px solid #000;display:inline-block;min-width:120px;height:12px}
.gu{margin-top:5px;padding-top:3px;border-top:1px solid #ccc;font-size:7pt}
.gt{border-collapse:collapse;margin-top:2px}.gt td{border:1px solid #000;padding:1px 5px;font-size:7pt}`;

// ─── Header (with logo) ─────────────────────────────────────

const HD = `<div class="hd">
<div class="hd-r">${LOGO_SVG}<div class="hd-r-txt"><div class="lt">شـركـة صــدارة الـريـاضـيـة</div><div class="ls">SADARA SPORTS COMPANY</div></div></div>
<div class="hd-l"><div class="nn">N.N/ 7052143646</div><div>Prince Meshaal Ibn Abd AlAziz, 'Irqah, Riyadh 12534</div><div style="margin-top:2px">P - +966533919155 &nbsp;&nbsp; W - www.sadarasport.sa<br>M - info@sadarasport.sa</div></div>
</div>`;

// ─── Page Builders ──────────────────────────────────────────

const wrap = (body: string) =>
  `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>${body}</body></html>`;

function pg2(d: any) {
  const sd = fmtDate(d.sd),
    ed = fmtDate(d.ed),
    dur = calcDur(d.sd, d.ed);
  return wrap(`<div class="pg">${HD}<div class="ct">
<div class="tt">عقد تمثيل رياضي حصري</div>
<div class="stb">التمهيــد</div>
<p>حيث إن شركة صدارة المواهب الرياضية المحدودة (الطرف الأول) تعمل في المجال الرياضي وفي أنشطة إدارة وتمثيل لاعبي كرة القدم والتفاوض بشأن عقودهم الرياضية والتجارية داخل المملكة العربية السعودية وخارجها، وفق الأنظمة واللوائح المعمول بها؛</p>
<p>وحيث إن الطرف الأول يمارس نشاطه من خلال وكيل معتمد ومرخّص من الاتحاد الدولي لكرة القدم (فيفا) يعمل تحت مظلة الشركة؛</p>
<p>وحيث إن الطرف الثاني (اللاعب) يرغب في الاستعانة بخدمات الطرف الأول لتمثيله تمثيلاً حصرياً؛</p>
<p>فقد اتفق الطرفين وهما بكامل أهليتهما الشرعية والنظامية على ما يلي، ويعدّ التمهيد جزءاً لا يتجزأ من العقد:</p>
<div class="st">المادة (1): بيانات الأطراف</div>
<div class="pts"><div class="pr"><strong>الطرف الأول/</strong> شركة صدارة المواهب الرياضية المحدودة<br><strong>المقر/</strong> السعودية، الرياض، حي عرقة، طريق الأمير مشعل ص.ب 12534<br><strong>الرقم الموحد/</strong>7052143646<br><strong>يمثلها/</strong> خالد بن علي الشهري<br><strong>جوال رقم/</strong> 0533919155<br><strong>البريد الإلكتروني</strong> khaled@sadarasport.sa</div>
<div class="pl"><table><tr><td colspan="2" style="font-weight:700;text-align:center;background:#f5f5f5">الطرف الثاني: اللاعب</td></tr><tr><td class="vl">${d.pn}</td><td></td></tr><tr><td class="vl">${d.pid}</td><td>هوية رقم</td></tr><tr><td class="vl">${d.nat}</td><td>الجنسية</td></tr><tr><td class="vl">${d.ph}</td><td>جوال رقم</td></tr></table></div></div>
<div class="st">المادة (2): نطاق التمثيل (موضوع العقد)</div>
<p>يمنح اللاعب الشركة حق التمثيل الحصري الكامل داخل المملكة وخارجها في الآتي:</p>
<div class="ni"><span class="nc">1</span><span>التفاوض مع الأندية بشأن توقيع أو تجديد أو فسخ أو إعارة أو تعديل أي عقد رياضي يخص اللاعب</span></div>
<div class="ni"><span class="nc">2</span><span>التفاوض بشأن أي عقود تجارية أو رعائية أو دعائية تتعلق باللاعب، بعد موافقته</span></div>
<div class="ni"><span class="nc">3</span><span>متابعة الإجراءات القانونية والإدارية المتعلقة بالعقود</span></div>
<div class="ni"><span class="nc">4</span><span>توثيق العقود في الأنظمة الرسمية (TMS أو ما يستحدث)</span></div>
<div class="ni"><span class="nc">5</span><span>يقر اللاعب بأن هذه الحصرية سارية طوال مدة العقد ولا يجوز له تفويض أي جهة أخرى في هذه الأعمال</span></div>
<div class="st">المادة (3): وجود وكيل مرخّص</div>
<p>يقر الطرف الأول بأن جميع أعمال التمثيل المنصوص عليها في العقد تُدار من خلال وكيل معتمد ومرخّص من الاتحاد الدولي لكرة القدم (فيفا)، وفق البيانات التالية:</p>
<p style="text-align:center">الاسم: Ahmed Osman Hadoug<br>رقم رخصة فيفا FIFA AGENT LICENSE No (202411-8478)<br>جهة الترخيص: الاتحاد الدولي لكرة القدم - (FIFA)</p>
<p>ويعمل الوكيل تحت مظلة شركة صدارة، وتبقى العلاقة التعاقدية في هذا العقد بين اللاعب والشركة مباشرة</p>
<div class="st">المادة (4): مدة العقد</div>
<p>مدة هذا العقد ${dur} تبدأ من:</p>
<div class="db"><span class="dl">من تاريخ</span><span class="dx">${sd}</span></div>
<div class="db"><span class="dl" style="background:#000">إلى تاريخ:</span><span class="dx">${ed}</span></div>
<div class="st">المادة (5): التزامات الطرف الأول (الشركة)</div>
<div class="ni"><span class="nc">1</span><span>بذل العناية اللازمة للحصول على أفضل العروض الرياضية والتجارية</span></div>
<div class="ni"><span class="nc">2</span><span>التفاوض نيابة عن اللاعب وفق الأنظمة واللوائح المعمول بها</span></div>
<div class="ni"><span class="nc">3</span><span>مراجعة وصياغة العقود وتوضيح آثارها للاعب قبل توقيعها</span></div>
<div class="ni"><span class="nc">4</span><span>عدم توقيع أي اتفاق نيابة عن اللاعب دون موافقته الخطية</span></div>
<div class="ni"><span class="nc">5</span><span>إبلاغ اللاعب بأي عرض رسمي يصل للشركة فور استلامه</span></div>
<div class="ni"><span class="nc">6</span><span>تمثيل اللاعب أمام الأندية والجهات المختصة</span></div>
<div class="ni"><span class="nc">7</span><span>الحفاظ على سرية جميع البيانات والمعلومات</span></div>
</div></div>`);
}

function pg3(d: any) {
  // Agent signature (First Party — right side in RTL)
  const agentSig = d.agentSigImg
    ? `<img src="${d.agentSigImg}" style="height:35px;margin-top:2px" />`
    : "_________________________";
  const agentSigDate = d.agentSigDt
    ? `<span class="dx">${fmtDate(d.agentSigDt)}</span>`
    : `<span class="dx">&nbsp; &nbsp; / &nbsp; &nbsp; / 202 &nbsp;</span>`;

  // Player signature (Second Party — left side in RTL)
  const playerSig = d.sigImg
    ? `<img src="${d.sigImg}" style="max-height:40px;max-width:120px;margin-top:2px;display:block" />`
    : "";
  const playerSigDate = d.sigDt
    ? `<span class="dx">${fmtDate(d.sigDt)}</span>`
    : "";

  return wrap(`<div class="pg">${HD}<div class="ct">
<div class="st">المادة (6): التزامات الطرف الثاني (اللاعب)</div>
<div class="ni"><span class="nc">1</span><span>الالتزام بالحصرية وعدم التعامل أو التفاوض مع أي وسيط آخر</span></div>
<div class="ni"><span class="nc">2</span><span>إبلاغ الشركة فوراً بأي عرض أو تواصل من أي نادٍ أو جهة تجارية</span></div>
<div class="ni"><span class="nc">3</span><span>تقديم المعلومات الصحيحة المتعلقة بوضعه التعاقدي</span></div>
<div class="ni"><span class="nc">4</span><span>التعاون مع الشركة فيما يخص المقابلات أو العروض</span></div>
<div class="ni"><span class="nc">5</span><span>دفع العمولة المستحقة للطرف الأول في وقتها المحدد</span></div>
<div class="st">المادة (7): العمولة</div>
<p><strong>أولاً: العقود الرياضية</strong></p>
<p>يستحق الطرف الأول عمولة بنسبة (${d.cpct}٪) من إجمالي قيمة العقد الرياضي الذي يتم إبرامه أو تجديده من خلال الشركة</p>
<p><strong>ثانياً: العقود التجارية والإعلانية</strong></p>
<p><strong>السداد:</strong></p>
<p>تفويض النادي بالسداد مباشرة للشركة إن أمكن</p>
<p>أو يقوم اللاعب بالسداد خلال (14) يوماً من استلام المبالغ من الجهة المتعاقدة</p>
<div class="st">المادة (8): السرية</div>
<p>يلتزم الطرفان بسرية جميع البيانات والمعلومات والمراسلات ولا يجوز الإفصاح عنها إلا بما يتطلبه النظام أو الاتفاق</p>
<div class="st">المادة (9): إنهاء العقد</div>
<p>يجوز إنهاء العقد في الحالات التالية:</p>
<div class="ni"><span class="nc">1</span><span>الإخلال الجوهري بأي بند من بنوده وعدم معالجته خلال (30) يوماً</span></div>
<div class="ni"><span class="nc">2</span><span>فقدان الشركة حق مزاولة النشاط دون تعيين وكيل مرخص بديل</span></div>
<div class="ni"><span class="nc">3</span><span>صدور قرار رسمي يمنع اللاعب من ممارسة كرة القدم لأكثر من (6) أشهر</span></div>
<p>ولا يؤثر الإنهاء على حقوق الشركة في العمولات المستحقة عن العقود التي تمت خلال مدة السريان</p>
<div class="st">المادة (10): تسوية المنازعات</div>
<div class="ni"><span class="nc">1</span><span>تُحل النزاعات ودياً أولاً خلال (30) يوماً</span></div>
<div class="ni"><span class="nc">2</span><span>عند التعذر، تُحال المنازعات إلى الجهة المختصة في الاتحاد السعودي لكرة القدم</span></div>
<p>وفي حال النزاعات المتعلقة بلوائح فيفا يتم الرجوع إلى اللجان الدولية المختصة مثل غرفة وكلاء فيفا أو محكمة CAS</p>
<div class="st">المادة (11): أحكام عامة</div>
<div class="ni"><span class="nc">1</span><span>أي تعديل على العقد يجب أن يكون مكتوباً وموقعاً من الطرفين</span></div>
<div class="ni"><span class="nc">2</span><span>إذا أصبح أي بند غير قابل للتطبيق يتم استبداله بما يحقق الغرض دون إبطال العقد</span></div>
<div class="ni"><span class="nc">3</span><span>يُحرّر العقد من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها</span></div>
<div class="ss">
<div class="sb" style="text-align:right">
<p style="font-size:8.5pt"><strong>التوقيعات</strong></p>
<p>الطرف الأول / شركة صدارة المواهب الرياضية</p>
<p>يمثلها/ خالد بن علي الشهري</p>
<p>الصفة/ المدير العام</p>
<p>من تاريخ &nbsp; ${agentSigDate}</p>
<p style="margin-top:3px">التوقيع:${agentSig}</p>
<p style="direction:ltr;text-align:left;font-size:8pt">Ahmed Osman Hadoug</p>
</div>
<div class="sb" style="text-align:right">
<p style="font-size:8.5pt;margin-top:16px"><strong>الطرف الثاني / اللاعب</strong></p>
<p>${d.pn}</p>
<p>من تاريخ &nbsp; ${playerSigDate}</p>
<p style="margin-top:3px">التوقيع:${playerSig || "_________________________"}</p>
${d.pnEn ? `<p style="direction:ltr;text-align:left;font-size:8pt">${d.pnEn}</p>` : ""}
</div>
</div>
<div class="gu">
<p><strong>توقيع ولي أمر اللاعب (إن كان اللاعب قاصراً)</strong></p>
<p>أقر بموافقتي على هذا العقد والتزام اللاعب بجميع بنوده:</p>
<table class="gt" style="width:160px"><tr><td>الاسم</td><td style="min-width:70px"></td></tr><tr><td>صلة القرابة</td><td></td></tr><tr><td>التاريخ</td><td></td></tr><tr><td>التوقيع</td><td></td></tr></table>
</div>
</div></div>`);
}

// ─── Render a single HTML page to PDF buffer ────────────────

async function renderHtmlPage(page: any, html: string): Promise<Uint8Array> {
  await page.setContent(html, {
    waitUntil: "networkidle0",
    timeout: 15000,
  });
  // Wait for all images (including base64 data-URI) to fully decode
  await page.evaluate(`
    Promise.all(
      Array.from(document.querySelectorAll('img')).map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise(r => { img.onload = r; img.onerror = r; })
      )
    )
  `);
  // Extra safety margin for rendering
  await page.evaluate(`new Promise(r => setTimeout(r, 300))`);
  return page.pdf({
    width: "595px",
    height: "842px",
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
    printBackground: true,
  });
}

// ─── Reusable: generate full contract PDF as Buffer ─────────

export async function generateContractPdfBuffer(
  contractOrId: any,
): Promise<{ buffer: Buffer; playerName: string }> {
  const contract =
    typeof contractOrId === "string"
      ? await contractService.getContractById(contractOrId)
      : contractOrId;
  if (!contract) throw new AppError("Contract not found", 404);

  if (!fs.existsSync(COVER_PDF)) {
    throw new AppError(
      "Brand asset cover_page.pdf not found. Place it in src/assets/pdf/",
      500,
    );
  }
  if (!fs.existsSync(BACK_PDF)) {
    throw new AppError(
      "Brand asset back_page.pdf not found. Place it in src/assets/pdf/",
      500,
    );
  }

  const d = getData(contract);
  let browser: any = null;

  try {
    const coverBytes = fs.readFileSync(COVER_PDF);
    const backBytes = fs.readFileSync(BACK_PDF);

    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
    });

    const page = await browser.newPage();
    const contentBuffers: Uint8Array[] = [];
    for (const html of [pg2(d), pg3(d)]) {
      contentBuffers.push(await renderHtmlPage(page, html));
    }

    await page.close();
    await browser.close();
    browser = null;

    const merged = await PDFDocument.create();

    const coverDoc = await PDFDocument.load(coverBytes);
    const [coverPage] = await merged.copyPages(coverDoc, [0]);
    merged.addPage(coverPage);

    for (const buf of contentBuffers) {
      const doc = await PDFDocument.load(buf);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }

    const backDoc = await PDFDocument.load(backBytes);
    const [backPage] = await merged.copyPages(backDoc, [0]);
    merged.addPage(backPage);

    const final = await merged.save();
    return { buffer: Buffer.from(final), playerName: d.pn };
  } catch (err: any) {
    if (browser)
      try {
        await browser.close();
      } catch {}
    console.error("PDF generation error:", err.message);
    throw new AppError(
      "PDF generation failed. Please try again or contact support.",
      500,
    );
  }
}

// ─── Main Endpoint ──────────────────────────────────────────

export async function generatePdf(req: AuthRequest, res: Response) {
  const { buffer, playerName } = await generateContractPdfBuffer(req.params.id);
  const name = `عقد_تمثيل_${playerName}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", buffer.length);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
  );
  res.end(buffer);
}
