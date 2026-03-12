import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import * as competitionService from "@modules/competitions/competition.service";

export async function list(req: AuthRequest, res: Response) {
  const result = await competitionService.listCompetitions(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const competition = await competitionService.getCompetitionById(
    req.params.id,
  );
  sendSuccess(res, competition);
}

export async function create(req: AuthRequest, res: Response) {
  const competition = await competitionService.createCompetition(req.body);
  sendCreated(res, competition);
}

export async function update(req: AuthRequest, res: Response) {
  const competition = await competitionService.updateCompetition(
    req.params.id,
    req.body,
  );
  sendSuccess(res, competition, "Competition updated");
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await competitionService.deleteCompetition(req.params.id);
  sendSuccess(res, result, "Competition deleted");
}

export async function getClubs(req: AuthRequest, res: Response) {
  const entries = await competitionService.getCompetitionClubs(
    req.params.id,
    req.query.season as string | undefined,
  );
  sendSuccess(res, entries);
}

export async function addClub(req: AuthRequest, res: Response) {
  const entry = await competitionService.addClubToCompetition(
    req.params.id,
    req.body,
  );
  sendCreated(res, entry);
}

export async function removeClub(req: AuthRequest, res: Response) {
  const result = await competitionService.removeClubFromCompetition(
    req.params.id,
    req.params.clubId,
    req.query.season as string | undefined,
  );
  sendSuccess(res, result, "Club removed from competition");
}

export async function getClubCompetitions(req: AuthRequest, res: Response) {
  const entries = await competitionService.getClubCompetitions(
    req.params.clubId,
    req.query.season as string | undefined,
  );
  sendSuccess(res, entries);
}
