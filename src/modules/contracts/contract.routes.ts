import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { cacheRoute } from '../../middleware/cache.middleware';
import { CacheTTL } from '../../shared/utils/cache';
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

// ── Read (cached) ──
router.get('/', validate(contractQuerySchema, 'query'), cacheRoute('contracts', CacheTTL.MEDIUM), asyncHandler(contractController.list));

// ── Write ──
router.post('/', authorize('Admin', 'Manager'), validate(createContractSchema), asyncHandler(contractController.create));

// ── Sub-resource routes MUST come before /:id ──
router.get('/:id/pdf', asyncHandler(generatePdf));  // No cache — dynamic PDF
router.post('/:id/transition', authorize('Admin', 'Manager'), validate(transitionStatusSchema), asyncHandler(transitionContract));

// ── Single resource ──
router.get('/:id', cacheRoute('contracts', CacheTTL.MEDIUM), asyncHandler(contractController.getById));
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateContractSchema), asyncHandler(contractController.update));
router.delete('/:id', authorize('Admin'), asyncHandler(contractController.remove));

export default router;