import {
  containsInBodyMarkers,
  extractInBodyValues,
  mergeExtracted,
} from "./inbodyExtract.service";

// Snapshots of realistic text shapes the extractor sees:
//
//   • ENGLISH_PDF_TEXT  — what pdf-parse returns for a clean text PDF
//     exported from the InBody desktop software.
//   • ARABIC_OCR_TEXT   — what tesseract.js produces from a phone photo of
//     an Arabic InBody printout. RTL ordering is mangled (label appears on
//     a different line from the value), numeric tokens often share a line
//     with reference-range numbers, and unrelated rows can leak in.

const ENGLISH_PDF_TEXT = `
InBody 270
Body Composition Analysis
Test Date / Time: 2023.10.04 04:53
Total Body Water       44.9 L     (37.4 ~ 45.8)
Protein                12.3 kg    (10.1 ~ 12.3)
Minerals                4.04 kg   (3.46 ~ 4.23)
Body Fat Mass          11.9 kg    (8.0 ~ 16.0)
Weight                 73.1 kg    (56.6 ~ 76.6)
Skeletal Muscle Mass   35.0 kg
Percent Body Fat       16.3 %
Visceral Fat Level     4
Waist-Hip Ratio        0.88
BMR                    1620 kcal
Metabolic Age          27
Right Arm Lean         3.67
Left Arm Lean          3.63
Trunk Lean             28.3
Right Leg Lean         9.27
Left Leg Lean          9.25
Right Arm Fat          0.4
Left Arm Fat           0.5
Trunk Fat              6.3
Right Leg Fat          1.8
Left Leg Fat           1.8
`.trim();

const ARABIC_OCR_TEXT = `
InBody 270
تاريخ الاختبار/الوقت
2023.10.04 04:53
الوزن
73.1 ( 56.6~76.6 )
كتلة الهيكل العضلي
35.0
النسبة المئوية للدهون بالجسم
16.3
إجمالي المياه بالجسم
44.9 L (37.4~45.8)
البروتين
12.3
المعادن
4.04
مستوى الدهون الحشوية
4
معدل حجم الخصر – الورك
0.88
معدل الأيض الأساسي للقياس (سعر حراري)
1620
العمر الأيضي (سنة)
27
`.trim();

const RANDOM_DOC_TEXT = `
INVOICE NO. 12345
Customer: Acme Corp
Date: 2024-01-15
Item              Qty   Price
Widget             10   $9.99
Gadget              2  $24.99
Subtotal: $149.88
`.trim();

describe("inbodyExtract — containsInBodyMarkers", () => {
  it("recognizes English InBody markers", () => {
    expect(containsInBodyMarkers(ENGLISH_PDF_TEXT)).toBe(true);
  });

  it("recognizes Arabic InBody markers", () => {
    expect(containsInBodyMarkers(ARABIC_OCR_TEXT)).toBe(true);
  });

  it("rejects unrelated documents", () => {
    expect(containsInBodyMarkers(RANDOM_DOC_TEXT)).toBe(false);
  });
});

describe("inbodyExtract — extractInBodyValues (English text PDF)", () => {
  const result = extractInBodyValues(ENGLISH_PDF_TEXT);

  it("extracts core body composition", () => {
    expect(result.weightKg).toBe(73.1);
    expect(result.bodyFatPct).toBe(16.3);
    expect(result.skeletalMuscleMassKg).toBe(35.0);
    expect(result.totalBodyWaterKg).toBe(44.9);
    expect(result.proteinKg).toBe(12.3);
    expect(result.mineralKg).toBe(4.04);
  });

  it("extracts metabolic fields", () => {
    expect(result.measuredBmrKcal).toBe(1620);
    expect(result.visceralFatLevel).toBe(4);
    expect(result.waistHipRatio).toBe(0.88);
    expect(result.metabolicAge).toBe(27);
  });

  it("extracts segmental lean masses", () => {
    expect(result.segLeanRightArmKg).toBe(3.67);
    expect(result.segLeanLeftArmKg).toBe(3.63);
    expect(result.segLeanTrunkKg).toBe(28.3);
    expect(result.segLeanRightLegKg).toBe(9.27);
    expect(result.segLeanLeftLegKg).toBe(9.25);
  });

  it("extracts segmental fat masses", () => {
    expect(result.segFatRightArmKg).toBe(0.4);
    expect(result.segFatLeftArmKg).toBe(0.5);
    expect(result.segFatTrunkKg).toBe(6.3);
    expect(result.segFatRightLegKg).toBe(1.8);
    expect(result.segFatLeftLegKg).toBe(1.8);
  });

  it("extracts scan date in YYYY-MM-DD form", () => {
    expect(result.scanDate).toBe("2023-10-04");
  });

  it("rounds integer-only fields", () => {
    expect(Number.isInteger(result.measuredBmrKcal!)).toBe(true);
    expect(Number.isInteger(result.visceralFatLevel!)).toBe(true);
    expect(Number.isInteger(result.metabolicAge!)).toBe(true);
  });
});

describe("inbodyExtract — extractInBodyValues (Arabic OCR text)", () => {
  const result = extractInBodyValues(ARABIC_OCR_TEXT);

  it("extracts the core fields a coach cares about most", () => {
    // These are the ones the coach can least afford to type wrong: the
    // five pillars of the InBody printout. We don't require the segmental
    // ten — those are typically OCR-mangled and the coach will correct.
    expect(result.weightKg).toBe(73.1);
    expect(result.skeletalMuscleMassKg).toBe(35.0);
    expect(result.bodyFatPct).toBe(16.3);
    expect(result.totalBodyWaterKg).toBe(44.9);
  });

  it("extracts metabolic markers", () => {
    expect(result.visceralFatLevel).toBe(4);
    expect(result.waistHipRatio).toBe(0.88);
    expect(result.metabolicAge).toBe(27);
    expect(result.measuredBmrKcal).toBe(1620);
  });

  it("extracts protein and minerals", () => {
    expect(result.proteinKg).toBe(12.3);
    expect(result.mineralKg).toBe(4.04);
  });

  it("extracts the test date", () => {
    expect(result.scanDate).toBe("2023-10-04");
  });
});

describe("inbodyExtract — extractInBodyValues (non-InBody document)", () => {
  it("does not invent values from a random invoice", () => {
    const result = extractInBodyValues(RANDOM_DOC_TEXT);
    // No InBody labels present → all numeric fields should be unset.
    expect(result.weightKg).toBeUndefined();
    expect(result.bodyFatPct).toBeUndefined();
    expect(result.skeletalMuscleMassKg).toBeUndefined();
    expect(result.measuredBmrKcal).toBeUndefined();
    expect(result.visceralFatLevel).toBeUndefined();
  });
});

describe("inbodyExtract — magnitude guards", () => {
  it("ignores reference-range numbers and only picks the in-range value", () => {
    // "Weight 73.1 kg (56.6 ~ 76.6)" — the parens contain numbers in the
    // weight range too, but the first match (73.1) wins because we scan
    // left-to-right and 73.1 is in [25, 250].
    const text = "Weight 73.1 kg (56.6 ~ 76.6)";
    const result = extractInBodyValues(text);
    expect(result.weightKg).toBe(73.1);
  });

  it("rejects out-of-range candidates rather than guess", () => {
    // BMR range is [600, 4000]; a stray "27" on a BMR line should not
    // populate the field.
    const text = "BMR\nMetabolic Age\n27";
    const result = extractInBodyValues(text);
    expect(result.measuredBmrKcal).toBeUndefined();
    expect(result.metabolicAge).toBe(27);
  });
});

// Realistic Arabic InBody270 OCR shape: value-then-reference-range rows,
// an InBody score "83/100", a BMI "24.1", height "174cm" and age "30" — all
// of which contain numbers that fall inside a stored field's range and would
// poison extraction without the parens/score/negative-label guards.
const ARABIC_INBODY270_REFRANGE_TEXT = `
InBody 270
تاريخ الاختبار/الوقت
2023.10.04 04:53
درجة اختبار InBody
83/100
الوزن
73.1 ( 56.6~76.6 )
كتلة الهيكل العضلي
35.0 ( 30.6~37.4 )
النسبة المئوية للدهون بالجسم
16.3
إجمالي المياه بالجسم
44.9 L (37.4~45.8)
البروتين
12.3 ( 10.1~12.3 )
المعادن
4.04 ( 3.46~4.23 )
مؤشر كتلة الجسم
24.1
الطول
174cm
العمر
30
مستوى الدهون الحشوية
4
معدل حجم الخصر – الورك
0.88
معدل الأيض الأساسي للقياس
1620
العمر الأيضي (سنة)
27
`.trim();

describe("inbodyExtract — extractInBodyValues (Arabic InBody270 ref-range shape)", () => {
  const result = extractInBodyValues(ARABIC_INBODY270_REFRANGE_TEXT);

  it("picks the measured value outside the reference-range parentheses", () => {
    expect(result.weightKg).toBe(73.1);
    expect(result.skeletalMuscleMassKg).toBe(35.0);
    expect(result.totalBodyWaterKg).toBe(44.9);
    expect(result.proteinKg).toBe(12.3);
    expect(result.mineralKg).toBe(4.04);
    expect(result.bodyFatPct).toBe(16.3);
  });

  it("extracts metabolic markers and date", () => {
    expect(result.measuredBmrKcal).toBe(1620);
    expect(result.visceralFatLevel).toBe(4);
    expect(result.waistHipRatio).toBe(0.88);
    expect(result.metabolicAge).toBe(27);
    expect(result.scanDate).toBe("2023-10-04");
  });

  it("does NOT mistake BMI, score, or height for weight", () => {
    expect(result.weightKg).not.toBe(24.1); // BMI
    expect(result.weightKg).not.toBe(83); // score numerator
    expect(result.weightKg).not.toBe(174); // height cm
  });

  it("does NOT let the '/100' score pollute BMR", () => {
    // 100 is well below the BMR range [600,4000] so it could never be picked,
    // but the score line must not be selected as any field's source either.
    expect(result.measuredBmrKcal).toBe(1620);
  });
});

describe("inbodyExtract — score line before the weight value", () => {
  it("still extracts weight when '83/100' precedes it", () => {
    const text = [
      "درجة اختبار InBody",
      "83/100",
      "الوزن",
      "73.1 ( 56.6~76.6 )",
    ].join("\n");
    const result = extractInBodyValues(text);
    expect(result.weightKg).toBe(73.1);
  });
});

describe("inbodyExtract — prefer value outside parentheses", () => {
  it("returns the leftmost out-of-paren value, not a reference bound", () => {
    const text = "الوزن\n73.1 ( 56.6~76.6 )";
    const result = extractInBodyValues(text);
    expect(result.weightKg).toBe(73.1);
  });
});

describe("inbodyExtract — mergeExtracted", () => {
  it("fills a field the primary left undefined from the secondary", () => {
    const primary = { weightKg: 73.1 };
    const secondary = { weightKg: 72.0, bodyFatPct: 16.3 };
    const merged = mergeExtracted(primary, secondary);
    expect(merged.weightKg).toBe(73.1); // primary wins on conflict
    expect(merged.bodyFatPct).toBe(16.3); // secondary fills the gap
  });

  it("fills a null primary field from the secondary", () => {
    const primary = { weightKg: null };
    const secondary = { weightKg: 72.0 };
    const merged = mergeExtracted(primary, secondary);
    expect(merged.weightKg).toBe(72.0);
  });

  it("falls back to the secondary scanDate when primary lacks it", () => {
    const primary = { weightKg: 73.1 };
    const secondary = { scanDate: "2023-10-04" };
    const merged = mergeExtracted(primary, secondary);
    expect(merged.scanDate).toBe("2023-10-04");
    expect(merged.weightKg).toBe(73.1);
  });
});
