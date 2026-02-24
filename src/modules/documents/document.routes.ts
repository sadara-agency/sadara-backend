import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createDocumentSchema, updateDocumentSchema, documentQuerySchema } from './document.schema';
import { uploadSingle } from '../../middleware/upload';
import * as ctrl from './document.controller';

const router = Router();
router.use(authenticate);

// List & detail
router.get('/', validate(documentQuerySchema, 'query'), asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));

// Upload real file (multipart/form-data) — metadata in form fields
router.post('/upload',
  authorize('Admin', 'Manager', 'Analyst'),
  (req, res, next) => {
    uploadSingle(req, res, (err: any) => {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large. Maximum size is 25MB.'
          : err.message || 'Upload failed';
        return res.status(400).json({ success: false, message: msg });
      }
      next();
    });
  },
  asyncHandler(ctrl.upload)
);

// Create via JSON (external URL, no file upload)
router.post('/',
  authorize('Admin', 'Manager', 'Analyst'),
  validate(createDocumentSchema),
  asyncHandler(ctrl.create)
);

// Update & delete
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateDocumentSchema), asyncHandler(ctrl.update));
router.delete('/:id', authorize('Admin'), asyncHandler(ctrl.remove));

export default router;