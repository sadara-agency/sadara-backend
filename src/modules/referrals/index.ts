// Model
export { Referral } from "./referral.model";
export type {
  ReferralType,
  ReferralStatus,
  ReferralPriority,
  ReferralAttributes,
} from "./referral.model";

// Service
export * as referralService from "./referral.service";

// Routes
export { default as referralRoutes } from "./referral.routes";
