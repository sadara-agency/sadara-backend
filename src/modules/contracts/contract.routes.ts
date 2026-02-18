// ─────────────────────────────────────────────────────────────
// src/modules/contracts/contract.routes.ts
// RESTful routes for Contract CRUD.
//
// Replaces the old monolithic file. Same endpoints preserved,
// plus a new PATCH /:id for updating contracts (the old code
// only had create and delete — no update endpoint).
// ─────────────────────────────────────────────────────────────
import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createContractSchema,
  updateContractSchema,
  contractQuerySchema,
} from './contract.schema';
import * as contractController from './contract.controller';

const router = Router();
router.use(authenticate);

// ── Read ──
router.get('/', validate(contractQuerySchema, 'query'), asyncHandler(contractController.list));
router.get('/:id', asyncHandler(contractController.getById));

// ── Write (Admin / Manager) ──
router.post('/', authorize('Admin', 'Manager'), validate(createContractSchema), asyncHandler(contractController.create));
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateContractSchema), asyncHandler(contractController.update));

// ── Delete (Admin only) ──
router.delete('/:id', authorize('Admin'), asyncHandler(contractController.remove));

export default router;