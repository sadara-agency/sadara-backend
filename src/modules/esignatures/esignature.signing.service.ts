// ─────────────────────────────────────────────────────────────
// E-Signature PDF Generation
//
// Loads the original document PDF, appends a signature page
// with all signer signatures, names, and timestamps.
// ─────────────────────────────────────────────────────────────
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { UPLOAD_DIR_PATH } from "@middleware/upload";
import { AppError } from "@middleware/errorHandler";
import { SignatureRequest } from "./esignature.model";
import { resolveFileUrl, uploadFile } from "@shared/utils/storage";
import { assertSafeOutboundUrl } from "@shared/utils/safeOutboundUrl";

// Hosts allowed for the legacy `fileUrl.startsWith("http")` branch — only
// fully-qualified GCS URLs that pre-date the GCS-key migration. New uploads
// write a relative key and go through the resolveFileUrl signed-URL path.
const DOC_FETCH_ALLOWED_HOSTS = ["storage.googleapis.com"] as const;

const SIGNED_DIR = path.resolve(UPLOAD_DIR_PATH, "..", "signed-documents");
if (!fs.existsSync(SIGNED_DIR)) {
  fs.mkdirSync(SIGNED_DIR, { recursive: true });
}

/**
 * Generate a signed version of the document PDF with all signatures
 * embedded on an appended signature page.
 */
export async function generateSignedDocument(
  request: SignatureRequest,
): Promise<string> {
  const doc = (request as any).document;
  const signers = ((request as any).signers || []).filter(
    (s: any) => s.status === "Signed" && s.signatureData,
  );

  if (!doc?.fileUrl) throw new AppError("Document has no file URL", 400);

  // Load original PDF
  let originalPdfBytes: Buffer;
  const fileUrl: string = doc.fileUrl;

  if (fileUrl.startsWith("/uploads/")) {
    // Local file — resolve from uploads directory
    const localPath = path.resolve(
      UPLOAD_DIR_PATH,
      "..",
      fileUrl.replace("/uploads/", ""),
    );
    originalPdfBytes = await fs.promises.readFile(localPath);
  } else if (fileUrl.startsWith("http")) {
    // Remote URL (legacy full GCS URLs). New uploads write GCS keys instead,
    // so this branch should be vanishing — guard it with an SSRF check until
    // backfill removes the last legacy rows.
    const safe = assertSafeOutboundUrl(fileUrl, DOC_FETCH_ALLOWED_HOSTS);
    const res = await fetch(safe.toString());
    if (!res.ok)
      throw new AppError(`Failed to fetch document: ${res.statusText}`, 502);
    originalPdfBytes = Buffer.from(await res.arrayBuffer());
  } else {
    // GCS key (e.g. "documents/uuid.pdf") — resolve via signed URL then fetch
    const signedUrl = await resolveFileUrl(fileUrl, 5);
    const res = await fetch(signedUrl);
    if (!res.ok)
      throw new AppError(
        `Failed to fetch document from storage: ${res.statusText}`,
        502,
      );
    originalPdfBytes = Buffer.from(await res.arrayBuffer());
  }

  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Add signature page
  const sigPage = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = sigPage.getSize();

  // Header
  sigPage.drawText("SIGNATURES / التوقيعات", {
    x: 50,
    y: height - 60,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });

  // Document title
  sigPage.drawText(`Document: ${request.title}`, {
    x: 50,
    y: height - 90,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.4),
  });

  sigPage.drawText(
    `Completed: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    {
      x: 50,
      y: height - 106,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.4),
    },
  );

  // Divider
  sigPage.drawLine({
    start: { x: 50, y: height - 120 },
    end: { x: width - 50, y: height - 120 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.85),
  });

  // Layout: 2 columns, each signature block ~200px tall
  const colWidth = (width - 100) / 2;
  const blockHeight = 160;
  let currentY = height - 150;
  let col = 0;

  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    const x = 50 + col * colWidth;
    const y = currentY;

    // Signer name
    const name =
      signer.signerType === "internal"
        ? (signer as any).user?.fullName || "User"
        : signer.externalName || "External Signer";

    sigPage.drawText(`${i + 1}. ${name}`, {
      x,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.2),
    });

    // Signature image
    if (signer.signatureData) {
      try {
        const sigData = signer.signatureData;
        let imageBytes: Uint8Array;
        let image;

        if (sigData.startsWith("data:image/png")) {
          const base64 = sigData.split(",")[1];
          imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          image = await pdfDoc.embedPng(imageBytes);
        } else if (
          sigData.startsWith("data:image/jpeg") ||
          sigData.startsWith("data:image/jpg")
        ) {
          const base64 = sigData.split(",")[1];
          imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          image = await pdfDoc.embedJpg(imageBytes);
        } else {
          // Try as raw base64 PNG
          imageBytes = Uint8Array.from(atob(sigData), (c) => c.charCodeAt(0));
          image = await pdfDoc.embedPng(imageBytes);
        }

        const sigWidth = Math.min(colWidth - 20, 200);
        const aspect = image.width / image.height;
        const sigHeight = Math.min(sigWidth / aspect, 80);

        sigPage.drawImage(image, {
          x,
          y: y - 18 - sigHeight,
          width: sigWidth,
          height: sigHeight,
        });
      } catch {
        sigPage.drawText("[Signature image]", {
          x,
          y: y - 40,
          size: 10,
          font,
          color: rgb(0.5, 0.5, 0.6),
        });
      }
    }

    // Signed date
    const signedDate = signer.signedAt
      ? new Date(signer.signedAt).toLocaleString("en-US")
      : "—";
    sigPage.drawText(`Signed: ${signedDate}`, {
      x,
      y: y - 110,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.5),
    });

    // Method
    sigPage.drawText(`Method: ${signer.signingMethod || "digital"}`, {
      x,
      y: y - 124,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.5),
    });

    // Next column or row
    col++;
    if (col >= 2) {
      col = 0;
      currentY -= blockHeight;

      // New page if we run out of space
      if (currentY < 100 && i < signers.length - 1) {
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        currentY = newPage.getSize().height - 60;
      }
    }
  }

  // Save — upload to GCS (private) or local fallback
  const pdfBytes = await pdfDoc.save();
  const fileName = `signed-${request.id.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}.pdf`;

  const result = await uploadFile({
    folder: "signed-documents",
    originalName: fileName,
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
    generateThumbnail: false,
  });

  return result.url;
}
