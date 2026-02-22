// ─────────────────────────────────────────────────────────────
// src/modules/contracts/contract.routes.ts
// RESTful routes for Contract CRUD + PDF + Status Transitions.
// ─────────────────────────────────────────────────────────────
import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createContractSchema,
  updateContractSchema,
  contractQuerySchema,
  transitionStatusSchema,
} from './contract.schema';
import * as contractController from './contract.controller';
import * as pdfController from './contract.pdf.controller';
import * as transitionController from './contract.transition.controller';

const router = Router();
router.use(authenticate);

// ── Read ──
router.get('/', validate(contractQuerySchema, 'query'), asyncHandler(contractController.list));
router.get('/:id', asyncHandler(contractController.getById));

// ── PDF Generation ──
router.get('/:id/pdf', asyncHandler(pdfController.generatePdf));

// ── Status Transition (Draft→Review→Signing→Active) ──
router.post(
  '/:id/transition',
  authorize('Admin', 'Manager'),
  validate(transitionStatusSchema),
  asyncHandler(transitionController.transitionStatus),
);

// ── Write (Admin / Manager) ──
router.post('/', authorize('Admin', 'Manager'), validate(createContractSchema), asyncHandler(contractController.create));
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateContractSchema), asyncHandler(contractController.update));

// ── Delete (Admin only) ──
router.delete('/:id', authorize('Admin'), asyncHandler(contractController.remove));

export default router;