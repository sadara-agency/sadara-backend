// API Response helpers
export {
  sendSuccess,
  sendPaginated,
  sendCreated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
} from "./apiResponse";

// App settings
export { getAppSetting, setAppSetting } from "./appSettings";

// Audit
export { logAudit, buildAuditContext, buildChanges } from "./audit";

// Auto-task helpers
export {
  dueDate,
  findUserByRole,
  findUsersByRole,
  cfg,
  createAutoTaskIfNotExists,
} from "./autoTaskHelpers";
export type {
  RuleConfig,
  AutoTaskInput,
  AutoTaskNotify,
} from "./autoTaskHelpers";

// Cache
export {
  CacheTTL,
  CachePrefix,
  cacheGet,
  cacheSet,
  cacheDel,
  invalidateByPrefix,
  invalidateMultiple,
  buildCacheKey,
  cacheOrFetch,
} from "./cache";

// Case transform
export { camelCaseKeys } from "./caseTransform";

// Common includes
export {
  USER_ATTRS,
  USER_ATTRS_BRIEF,
  USER_ATTRS_WITH_ROLE,
  PLAYER_ATTRS,
  CLUB_ATTRS,
} from "./commonIncludes";

// Cookie
export {
  COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
  CLEAR_REFRESH_COOKIE_OPTIONS,
} from "./cookie";

// CRUD controller factory
export { createCrudController } from "./crudController";

// Encryption
export {
  encrypt,
  decrypt,
  isEncrypted,
  encryptFields,
  decryptFields,
} from "./encryption";

// GCS (Google Cloud Storage)
export {
  generateResumableUploadUrl,
  generateSignedReadUrl,
  deleteObject,
  objectExists,
} from "./gcs";

// Mail
export {
  sendMail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendSignatureRequestEmail,
  sendSignatureCompletedEmail,
  sendSignatureDeclinedEmail,
  sendSignatureReminderEmail,
} from "./mail";

// Pagination
export { parsePagination, buildMeta, paginatedQuery } from "./pagination";
export type { ParsedPagination } from "./pagination";

// PDF
export {
  escHtml,
  fmtDate,
  calcAge,
  COVER_PDF_PATH,
  BACK_PDF_PATH,
  wrapHtml,
  makeSadaraHeader,
  renderPagesToBuffers,
  mergeWithBrandPages,
} from "./pdf";
export type { RenderOptions, MergeOptions } from "./pdf";
export { renderCoverPageBuffer } from "./pdfCover";
export type { CoverKind, CoverOpts } from "./pdfCover";

// Row scope
export { buildRowScope, mergeScope, checkRowAccess } from "./rowScope";

// Service helpers
export {
  findOrThrow,
  destroyById,
  bilingualSearch,
  playerNameSearch,
  pickDefined,
  buildDateRange,
  fireAndForget,
} from "./serviceHelpers";

// Storage
export {
  uploadFile,
  deleteFile,
  getSignedUrl,
  isPrivateKey,
  resolveFileUrl,
} from "./storage";
export type { UploadResult, UploadFolder, UploadOptions } from "./storage";

// Timeout
export { withTimeout } from "./timeout";
