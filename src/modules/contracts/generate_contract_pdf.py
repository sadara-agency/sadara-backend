#!/usr/bin/env python3
"""
generate_contract_pdf.py — Exact Sadara Contract PDF Replica

Replicates the original عقد تمثيل لاعب.pdf exactly:
  - Page 1: Blue cover (from original template)
  - Page 2: Articles 1-5 with header + player data filled
  - Page 3: Articles 6-11 + signatures with header
  - Page 4: Blue back page (from original template)

Usage:
    python3 generate_contract_pdf.py '<JSON>' output.pdf [template.pdf]
"""

import sys
import json
import os
from pathlib import Path
from datetime import datetime
from pypdf import PdfReader, PdfWriter
from playwright.sync_api import sync_playwright

TEMPLATE_PATH = str(Path(__file__).resolve().parent.parent.parent.parent / "templates" / "contract_template.pdf")


def format_date_ar(date_str):
    if not date_str:
        return ""
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        return f"{d.day:02d} / {d.month:02d} / {d.year}م"
    except Exception:
        return date_str


HEADER_HTML = """
<div class="header">
  <div class="header-right">
    <div style="text-align:right">
      <div class="logo-text">شـركــة صـــدارة الـريـاضـيـة</div>
      <div class="logo-sub">SADARA SPORTS COMPANY</div>
    </div>
  </div>
  <div class="header-left">
    <div class="nn">N.N/ 7052143646</div>
    <div>Prince Meshaal Ibn Abd AlAziz, 'Irqah, Riyadh 12534</div>
    <div style="border-top:1px solid #000;margin-top:3px;padding-top:3px;">
      P - +966533919155 &nbsp;&nbsp;&nbsp; W - www.sadarasport.sa<br>
      M - info@sadarasport.sa
    </div>
  </div>
</div>
"""

BASE_CSS = """
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');

* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: 'IBM Plex Sans Arabic', sans-serif;
  direction: rtl; color: #000; background: #fff;
  width: 595.3px; height: 841.9px; overflow: hidden;
  font-size: 8.8pt; line-height: 1.5;
}
.page { padding: 0; position: relative; width: 595.3px; height: 841.9px; }

.header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 18px 35px 12px 35px; border-bottom: 2px solid #000;
}
.header-right { display: flex; align-items: center; gap: 8px; }
.logo-text { font-size: 14pt; font-weight: 700; color: #000; }
.logo-sub { font-size: 7.5pt; color: #000; font-weight: 500; letter-spacing: 1px; }
.header-left { text-align: left; direction: ltr; font-size: 7.5pt; color: #000; line-height: 1.5; }
.header-left .nn { font-weight: 700; }

.content { padding: 10px 35px 10px 35px; }

.contract-title {
  text-align: center; font-size: 22pt; font-weight: 700; color: #000;
  margin: 12px 0 16px 0; letter-spacing: 2px;
}

.section-title {
  font-weight: 700; font-size: 9pt; background: #000; color: #fff;
  display: inline-block; padding: 1px 8px; margin: 6px 0 3px 0;
}

.article-title {
  font-weight: 700; font-size: 9pt; text-decoration: underline; margin: 8px 0 2px 0;
}

p { margin-bottom: 2px; }

.parties { display: flex; justify-content: space-between; align-items: flex-start; gap: 15px; margin-top: 5px; }
.party-right { flex: 1; text-align: right; font-size: 8.5pt; line-height: 1.6; }
.party-left { width: 170px; }
.party-left table { border-collapse: collapse; width: 100%; }
.party-left td { border: 1px solid #000; padding: 2px 6px; font-size: 8pt; }
.party-left .val { color: #3C3CFA; font-weight: 600; }

.num-item { display: flex; align-items: flex-start; gap: 4px; margin-bottom: 0px; font-size: 8.5pt; }
.num-circle {
  min-width: 14px; height: 14px; border-radius: 50%; background: #3C3CFA; color: #fff;
  font-size: 6.5pt; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 2px;
}

.date-boxes { display: flex; align-items: center; gap: 6px; margin: 3px 0; }
.date-box { border: 1px solid #000; padding: 2px 10px; font-size: 8.5pt; min-width: 40px; text-align: center; direction: ltr; }
.date-label { font-weight: 700; font-size: 8.5pt; background: #3C3CFA; color: #fff; padding: 2px 8px; }

.signatures { display: flex; justify-content: space-between; margin-top: 10px; gap: 20px; }
.sig-block { flex: 1; font-size: 8.5pt; }
.sig-field { border-bottom: 1px solid #000; display: inline-block; min-width: 130px; height: 14px; }

.guardian { margin-top: 8px; padding-top: 4px; border-top: 1px solid #ccc; font-size: 8pt; }
.guardian-table { border-collapse: collapse; width: 170px; margin-top: 3px; }
.guardian-table td { border: 1px solid #000; padding: 2px 6px; font-size: 8pt; }
"""


def build_page2_html(data):
    pn = data.get("playerName", "")
    pid = data.get("playerId", "")
    nat = data.get("nationality", "")
    phone = data.get("playerPhone", "")
    sd = format_date_ar(data.get("startDate", ""))
    ed = format_date_ar(data.get("endDate", ""))
    dur = ""
    try:
        s = datetime.strptime(data.get("startDate", ""), "%Y-%m-%d")
        e = datetime.strptime(data.get("endDate", ""), "%Y-%m-%d")
        m = (e.year - s.year) * 12 + e.month - s.month
        if m == 24: dur = "سنتان (24 شهرًا)"
        elif m == 12: dur = "سنة واحدة (12 شهرًا)"
        elif m > 0: dur = f"{m} شهرًا"
    except: pass

    return f"""<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><style>{BASE_CSS}</style></head><body>
<div class="page">
{HEADER_HTML}
<div class="content">
  <div class="contract-title">عـقـد تـمـثـيـل ريـاضـي حـصـري</div>

  <div class="section-title">التمهيــد</div>
  <p style="font-size:9pt;">حيث إن شركة صدارة المواهب الرياضية المحدودة (الطرف الأول) تعمل في المجال الرياضي وفي أنشطة إدارة وتمثيل لاعبي كرة القدم والتفاوض بشأن عقودهم الرياضية والتجارية داخل المملكة العربية السعودية وخارجها، وفق الأنظمة واللوائح المعمول بها؛</p>
  <p style="font-size:9pt;">وحيث إن الطرف الأول يمارس نشاطه من خلال وكيل معتمد ومرخّص من الاتحاد الدولي لكرة القدم (فيفا) يعمل تحت مظلة الشركة؛</p>
  <p style="font-size:9pt;">وحيث إن الطرف الثاني (اللاعب) يرغب في الاستعانة بخدمات الطرف الأول لتمثيله تمثيلاً حصرياً؛</p>
  <p style="font-size:9pt;">فقد اتفق الطرفين وهما بكامل أهليتهما الشرعية والنظامية على ما يلي، ويعدّ التمهيد جزءاً لا يتجزأ من العقد:</p>

  <div class="article-title">المادة (1): بيانات الأطراف</div>
  <div class="parties">
    <div class="party-right">
      <strong>الطرف الأول/</strong> شركة صدارة المواهب الرياضية المحدودة<br>
      <strong>المقر/</strong> السعودية، الرياض، حي عرقة، طريق الأمير مشعل ص.ب 12534<br>
      <strong>الرقم الموحد/</strong>7052143646<br>
      <strong>يمثلها/</strong> خالد بن علي الشهري<br>
      <strong>جوال رقم/</strong> 0533919155<br>
      <strong>البريد الإلكتروني</strong> khaled@sadarasport.sa
    </div>
    <div class="party-left">
      <table>
        <tr><td colspan="2" style="font-weight:700;text-align:center;background:#f5f5f5;">الطرف الثاني: اللاعب</td></tr>
        <tr><td class="val">{pn}</td><td></td></tr>
        <tr><td class="val">{pid}</td><td>هوية رقم</td></tr>
        <tr><td class="val">{nat}</td><td>الجنسية</td></tr>
        <tr><td class="val">{phone}</td><td>جوال رقم</td></tr>
      </table>
    </div>
  </div>

  <div class="article-title">المادة (2): نطاق التمثيل (موضوع العقد)</div>
  <p>يمنح اللاعب الشركة حق التمثيل الحصري الكامل داخل المملكة وخارجها في الآتي:</p>
  <div class="num-item"><span class="num-circle">1</span><span>التفاوض مع الأندية بشأن توقيع أو تجديد أو فسخ أو إعارة أو تعديل أي عقد رياضي يخص اللاعب</span></div>
  <div class="num-item"><span class="num-circle">2</span><span>التفاوض بشأن أي عقود تجارية أو رعائية أو دعائية تتعلق باللاعب، بعد موافقته</span></div>
  <div class="num-item"><span class="num-circle">3</span><span>متابعة الإجراءات القانونية والإدارية المتعلقة بالعقود</span></div>
  <div class="num-item"><span class="num-circle">4</span><span>توثيق العقود في الأنظمة الرسمية (TMS أو ما يستحدث)</span></div>
  <div class="num-item"><span class="num-circle">5</span><span>يقر اللاعب بأن هذه الحصرية سارية طوال مدة العقد ولا يجوز له تفويض أي جهة أخرى في هذه الأعمال</span></div>

  <div class="article-title">المادة (3): وجود وكيل مرخّص</div>
  <p>يقر الطرف الأول بأن جميع أعمال التمثيل المنصوص عليها في العقد تُدار من خلال وكيل معتمد ومرخّص من الاتحاد الدولي لكرة القدم (فيفا)، وفق البيانات التالية:</p>
  <p style="text-align:center;">الاسم :Ahmed Osman Hadoug<br>رقم رخصة فيفا FIFA AGENT LICENSE No (202411-8478)<br>جهة الترخيص: الاتحاد الدولي لكرة القدم - (FIFA)</p>
  <p>.ويعمل الوكيل تحت مظلة شركة صدارة، وتبقى العلاقة التعاقدية في هذا العقد بين اللاعب والشركة مباشرة</p>

  <div class="article-title">المادة (4): مدة العقد</div>
  <p>مدة هذا العقد {dur} تبدأ من:</p>
  <div class="date-boxes">
    <span class="date-label">من تاريخ</span><span class="date-box">{sd}</span>
  </div>
  <div class="date-boxes">
    <span class="date-label" style="background:#000;">إلى تاريخ:</span><span class="date-box">{ed}</span>
  </div>

  <div class="article-title">المادة (5): التزامات الطرف الأول (الشركة)</div>
  <div class="num-item"><span class="num-circle">1</span><span>بذل العناية اللازمة للحصول على أفضل العروض الرياضية والتجارية</span></div>
  <div class="num-item"><span class="num-circle">2</span><span>التفاوض نيابة عن اللاعب وفق الأنظمة واللوائح المعمول بها</span></div>
  <div class="num-item"><span class="num-circle">3</span><span>مراجعة وصياغة العقود وتوضيح آثارها للاعب قبل توقيعها</span></div>
  <div class="num-item"><span class="num-circle">4</span><span>عدم توقيع أي اتفاق نيابة عن اللاعب دون موافقته الخطية</span></div>
  <div class="num-item"><span class="num-circle">5</span><span>إبلاغ اللاعب بأي عرض رسمي يصل للشركة فور استلامه</span></div>
  <div class="num-item"><span class="num-circle">6</span><span>تمثيل اللاعب أمام الأندية والجهات المختصة</span></div>
  <div class="num-item"><span class="num-circle">7</span><span>الحفاظ على سرية جميع البيانات والمعلومات</span></div>
</div>
</div></body></html>"""


def build_page3_html(data):
    pn = data.get("playerName", "")
    cpct = data.get("commissionPct", 10)
    sd = format_date_ar(data.get("startDate", ""))

    # Build signature image HTML
    sig_img = data.get("signatureImage", "")
    sig_date = data.get("signedDate", "")
    if sig_img:
        player_sig_html = f'<img src="{sig_img}" style="height:40px;margin-top:3px;" />'
    else:
        player_sig_html = '<span class="sig-field"></span>'

    if sig_date:
        player_date_html = f'<span style="border:1px solid #000;padding:1px 8px;font-size:8.5pt;">{sig_date}</span>'
    else:
        player_date_html = '<span class="sig-field"></span>'

    return f"""<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><style>{BASE_CSS}</style></head><body>
<div class="page">
{HEADER_HTML}
<div class="content">
  <div class="section-title">المادة (6): التزامات الطرف الثاني (اللاعب)</div>
  <div class="num-item"><span class="num-circle">1</span><span>الالتزام بالحصرية وعدم التعامل أو التفاوض مع أي وسيط آخر</span></div>
  <div class="num-item"><span class="num-circle">2</span><span>إبلاغ الشركة فوراً بأي عرض أو تواصل من أي نادٍ أو جهة تجارية</span></div>
  <div class="num-item"><span class="num-circle">3</span><span>تقديم المعلومات الصحيحة المتعلقة بوضعه التعاقدي</span></div>
  <div class="num-item"><span class="num-circle">4</span><span>التعاون مع الشركة فيما يخص المقابلات أو العروض</span></div>
  <div class="num-item"><span class="num-circle">5</span><span>دفع العمولة المستحقة للطرف الأول في وقتها المحدد</span></div>

  <div class="section-title">المادة (7): العمولة</div>
  <p><strong>أولاً: العقود الرياضية</strong></p>
  <p>يستحق الطرف الأول عمولة بنسبة ({cpct}٪) من إجمالي قيمة العقد الرياضي الذي يتم إبرامه أو تجديده من خلال الشركة</p>
  <p><strong>ثانياً: العقود التجارية والإعلانية</strong></p>
  <p><strong>السداد:</strong></p>
  <p>تفويض النادي بالسداد مباشرة للشركة إن أمكن</p>
  <p>أو يقوم اللاعب بالسداد خلال (14) يوماً من استلام المبالغ من الجهة المتعاقدة</p>

  <div class="section-title">المادة (8): السرية</div>
  <p>يلتزم الطرفان بسرية جميع البيانات والمعلومات والمراسلات ولا يجوز الإفصاح عنها إلا بما يتطلبه النظام أو الاتفاق</p>

  <div class="section-title">المادة (9): إنهاء العقد</div>
  <p>يجوز إنهاء العقد في الحالات التالية:</p>
  <div class="num-item"><span class="num-circle">1</span><span>الإخلال الجوهري بأي بند من بنوده وعدم معالجته خلال (30) يوماً</span></div>
  <div class="num-item"><span class="num-circle">2</span><span>فقدان الشركة حق مزاولة النشاط دون تعيين وكيل مرخص بديل</span></div>
  <div class="num-item"><span class="num-circle">3</span><span>صدور قرار رسمي يمنع اللاعب من ممارسة كرة القدم لأكثر من (6) أشهر</span></div>
  <p>ولا يؤثر الإنهاء على حقوق الشركة في العمولات المستحقة عن العقود التي تمت خلال مدة السريان</p>

  <div class="section-title">المادة (10): تسوية المنازعات</div>
  <div class="num-item"><span class="num-circle">1</span><span>تُحل النزاعات ودياً أولاً خلال (30) يوماً</span></div>
  <div class="num-item"><span class="num-circle">2</span><span>عند التعذر، تُحال المنازعات إلى الجهة المختصة في الاتحاد السعودي لكرة القدم</span></div>
  <p>وفي حال النزاعات المتعلقة بلوائح فيفا يتم الرجوع إلى اللجان الدولية المختصة مثل غرفة وكلاء فيفا أو محكمة CAS</p>

  <div class="section-title">المادة (11): أحكام عامة</div>
  <div class="num-item"><span class="num-circle">1</span><span>أي تعديل على العقد يجب أن يكون مكتوباً وموقعاً من الطرفين</span></div>
  <div class="num-item"><span class="num-circle">2</span><span>إذا أصبح أي بند غير قابل للتطبيق يتم استبداله بما يحقق الغرض دون إبطال العقد</span></div>
  <div class="num-item"><span class="num-circle">3</span><span>يُحرّر العقد من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها</span></div>

  <div class="signatures">
    <div class="sig-block" style="text-align:right;">
      <p style="font-size:9.5pt;"><strong>التوقيعات</strong></p>
      <p>الطرف الأول / شركة صدارة المواهب الرياضية</p>
      <p>يمثلها/ خالد بن علي الشهري</p>
      <p>الصفة/ المدير العام</p>
      <p>من تاريخ: <span style="border:1px solid #000;padding:1px 8px;font-size:8.5pt;">{sd}</span></p>
      <p style="margin-top:5px;">التوقيع:_________________________</p>
      <p style="direction:ltr;text-align:left;font-size:9pt;">Ahmed Osman Hadoug</p>
    </div>
    <div class="sig-block" style="text-align:right;">
      <p>&nbsp;</p>
      <p><strong>الطرف الثاني: اللاعب</strong></p>
      <p style="color:#3C3CFA;font-weight:700;">{pn}</p>
      <p>التاريخ {player_date_html}</p>
      <p style="margin-top:5px;">التوقيع {player_sig_html}</p>
    </div>
  </div>

  <div class="guardian">
    <p><strong>توقيع ولي أمر اللاعب (إن كان اللاعب قاصراً)</strong></p>
    <p style="font-size:8pt;">أقر بموافقتي على هذا العقد والتزام اللاعب بجميع بنوده:</p>
    <table class="guardian-table">
      <tr><td>الاسم</td><td style="min-width:90px;"></td></tr>
      <tr><td>صلة القرابة</td><td></td></tr>
      <tr><td>التاريخ</td><td></td></tr>
      <tr><td>التوقيع</td><td></td></tr>
    </table>
  </div>
</div>
</div></body></html>"""


def generate_pdf(data, output_path, template_path=None):
    if template_path is None:
        template_path = TEMPLATE_PATH

    # Ensure paths are properly resolved for Windows Unicode support
    template_path = str(Path(template_path).resolve())
    output_path = str(Path(output_path).resolve())

    html2 = build_page2_html(data)
    html3 = build_page3_html(data)

    p2_path = output_path.replace(".pdf", "_p2.pdf")
    p3_path = output_path.replace(".pdf", "_p3.pdf")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(html2, wait_until="networkidle")
        page.pdf(path=p2_path, width="595.3px", height="841.9px",
                 margin={"top":"0","bottom":"0","left":"0","right":"0"}, print_background=True)
        page.set_content(html3, wait_until="networkidle")
        page.pdf(path=p3_path, width="595.3px", height="841.9px",
                 margin={"top":"0","bottom":"0","left":"0","right":"0"}, print_background=True)
        browser.close()

    writer = PdfWriter()
    tmpl = PdfReader(template_path)
    p2r = PdfReader(p2_path)
    p3r = PdfReader(p3_path)

    writer.add_page(tmpl.pages[0])   # Cover (blue)
    writer.add_page(p2r.pages[0])    # Articles 1-5
    writer.add_page(p3r.pages[0])    # Articles 6-11 + signatures
    writer.add_page(tmpl.pages[3])   # Back page (blue)

    with open(output_path, "wb") as f:
        writer.write(f)

    for tmp in [p2_path, p3_path]:
        if os.path.exists(tmp): os.remove(tmp)

    print(f"✅ Contract PDF: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_contract_pdf.py '<JSON>' output.pdf [template.pdf]")
        sys.exit(1)
    data = json.loads(sys.argv[1])
    output = sys.argv[2]
    tmpl = sys.argv[3] if len(sys.argv) > 3 else TEMPLATE_PATH

    # Debug: print resolved paths
    print(f"Template: {Path(tmpl).resolve()}")
    print(f"Output: {Path(output).resolve()}")
    print(f"Template exists: {Path(tmpl).resolve().exists()}")

    generate_pdf(data, output, tmpl)
