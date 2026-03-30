// Models
export { Competition, ClubCompetition } from "./competition.model";
export type {
  CompetitionType,
  CompetitionGender,
  CompetitionFormat,
  AgencyValue,
} from "./competition.model";

// Service
export * as competitionService from "./competition.service";

// Routes
export { default as competitionRoutes } from "./competition.routes";
