import { Response } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../../shared/types';
import { AppError } from '../../middleware/errorHandler';
import * as contractService from './contract.service';

const execFileAsync = promisify(execFile);

const PYTHON = process.platform === 'win32' ? 'python' : 'python3';
const SCRIPT_PATH = path.resolve(process.cwd(), 'src/modules/contracts/generate_contract_pdf.py');
const TEMPLATE_PATH = path.resolve(process.cwd(), 'templates/contract_template.pdf');
const OUTPUT_DIR = path.resolve(process.cwd(), 'tmp');

// Ensure tmp directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Build the JSON payload the Python script expects from a contract record.
 */
function buildPdfData(contract: any): Record<string, unknown> {
  const player = contract.player || {};
  const club = contract.club || {};

  // Build Arabic name, fallback to English
  const playerNameAr =
    player.firstNameAr && player.lastNameAr
      ? `${player.firstNameAr} ${player.lastNameAr}`
      : null;
  const playerNameEn =
    player.firstName && player.lastName
      ? `${player.firstName} ${player.lastName}`
      : '';

  return {
    playerName: playerNameAr || playerNameEn || 'غير محدد',
    playerNameEn,
    nationality: player.nationality || '',
    playerId: player.nationalId || player.idNumber || '',
    playerPhone: player.phone || '',
    clubName: club.nameAr || club.name || '',
    title: contract.title || 'عقد تمثيل رياضي حصري',
    startDate: contract.startDate
      ? new Date(contract.startDate).toISOString().split('T')[0]
      : '',
    endDate: contract.endDate
      ? new Date(contract.endDate).toISOString().split('T')[0]
      : '',
    baseSalary: Number(contract.baseSalary) || 0,
    currency: contract.salaryCurrency || 'SAR',
    commissionPct: Number(contract.commissionPct) || 10,
    commissionValue: Number(contract.totalCommission) || 0,
    signingBonus: Number(contract.signingBonus) || 0,
    releaseClause: Number(contract.releaseClause) || 0,
    performanceBonus: Number(contract.performanceBonus) || 0,
    notes: contract.notes || '',
    // Signature data (from digital signing)
    signatureImage: contract.signingMethod === 'digital' ? (contract.signedDocumentUrl || '') : '',
    signedDate: contract.signedAt
      ? new Date(contract.signedAt).toISOString().split('T')[0]
      : '',
  };
}

/**
 * GET /api/v1/contracts/:id/pdf
 * Generates and streams a Sadara representation contract PDF.
 */
export async function generatePdf(req: AuthRequest, res: Response) {
  const { id } = req.params;

  // 1. Fetch the contract with associations
  const contract = await contractService.getContractById(id);
  if (!contract) {
    throw new AppError('Contract not found', 404);
  }

  // 2. Build PDF data payload
  const pdfData = buildPdfData(contract);
  const jsonStr = JSON.stringify(pdfData);

  // 3. Generate unique output filename
  const timestamp = Date.now();
  const safeTitle = (pdfData.playerName as string).replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
  const outputFilename = `contract_${safeTitle}_${timestamp}.pdf`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  try {
    // 4. Execute Python script
    // Use env var to pass template path (avoids Arabic path encoding issues in args)
    await execFileAsync(PYTHON, [SCRIPT_PATH, jsonStr, outputPath, TEMPLATE_PATH], {
      timeout: 60000, // 60s timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      cwd: process.cwd(),
    });

    // 5. Verify file was created
    if (!fs.existsSync(outputPath)) {
      throw new AppError('PDF generation failed — output file not found', 500);
    }

    // 6. Stream PDF to client
    const stat = fs.statSync(outputPath);
    const downloadName = `عقد_تمثيل_${pdfData.playerName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    );

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);

    // 7. Cleanup after streaming
    stream.on('end', () => {
      fs.unlink(outputPath, () => { }); // fire-and-forget cleanup
    });

  } catch (err: any) {
    // Cleanup on error
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    if (err.stderr) {
      console.error('PDF generation stderr:', err.stderr);
    }

    throw new AppError(
      `PDF generation failed: ${err.message || 'Unknown error'}`,
      500,
    );
  }
}