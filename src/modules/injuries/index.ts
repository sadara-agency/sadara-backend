// Models
export { Injury, InjuryUpdate } from "./injury.model";
export type { InjuryStatus, InjurySeverity, InjuryCause } from "./injury.model";

// Service
export * as injuryService from "./injury.service";

// Routes
export { default as injuryRoutes } from "./injury.routes";
