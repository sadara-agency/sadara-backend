// ─────────────────────────────────────────────────────────────
// src/modules/contracts/contract.routes.ts
// RESTful routes for Contract CRUD + Transition workflow + PDF.
//
// IMPORTANT: /:id/pdf and /:id/transition MUST come BEFORE
// the generic /:id route, otherwise Express matches /:id first.
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
import { transitionContract } from './contract.transition.controller';
import { generatePdf } from './contract.pdf.controller';

const router = Router();
router.use(authenticate);

// ── List ──
router.get('/', validate(contractQuerySchema, 'query'), asyncHandler(contractController.list));

// ── Create (Admin / Manager) ──
router.post('/', authorize('Admin', 'Manager'), validate(createContractSchema), asyncHandler(contractController.create));

// ── Sub-resource routes MUST come before /:id ──
router.get('/:id/pdf', asyncHandler(generatePdf));
router.post('/:id/transition', authorize('Admin', 'Manager'), validate(transitionStatusSchema), asyncHandler(transitionContract));

// ── Single resource (after sub-routes) ──
router.get('/:id', asyncHandler(contractController.getById));
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateContractSchema), asyncHandler(contractController.update));
router.delete('/:id', authorize('Admin'), asyncHandler(contractController.remove));

export default router;