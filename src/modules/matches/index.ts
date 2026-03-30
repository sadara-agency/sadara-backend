// Models
export { Match } from "./match.model";
export type { MatchAttributes } from "./match.model";
export { MatchAnalysis } from "./matchAnalysis.model";
export type { MatchAnalysisAttributes } from "./matchAnalysis.model";
export { MatchPlayer } from "./matchPlayer.model";
export type { MatchPlayerAttributes } from "./matchPlayer.model";
export { PlayerMatchStats } from "./playerMatchStats.model";
export type { PlayerMatchStatsAttributes } from "./playerMatchStats.model";

// Service
export * as matchService from "./match.service";

// Routes
export { default as matchRoutes } from "./match.routes";
