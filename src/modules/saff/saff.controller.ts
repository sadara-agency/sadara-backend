import { Request, Response } from 'express';
import * as saffService from './saff.service';

// ── Tournaments ──

export async function listTournaments(req: Request, res: Response) {
  const result = await saffService.listTournaments(req.query as any);
  res.json(result);
}

export async function seedTournaments(req: Request, res: Response) {
  const count = await saffService.seedTournaments();
  res.json({ message: `Seeded ${count} new tournaments`, count });
}

// ── Fetch (Scrape) ──

export async function fetchFromSaff(req: Request, res: Response) {
  const result = await saffService.fetchFromSaff(req.body);
  res.json({
    message: `Fetched data from ${result.results} tournaments`,
    ...result,
  });
}

// ── Standings ──

export async function listStandings(req: Request, res: Response) {
  const result = await saffService.listStandings(req.query as any);
  res.json(result);
}

// ── Fixtures ──

export async function listFixtures(req: Request, res: Response) {
  const result = await saffService.listFixtures(req.query as any);
  res.json(result);
}

// ── Team Maps ──

export async function listTeamMaps(req: Request, res: Response) {
  const result = await saffService.listTeamMaps(req.query as any);
  res.json(result);
}

export async function mapTeam(req: Request, res: Response) {
  const result = await saffService.mapTeamToClub(req.body);
  res.json({ message: 'Team mapped successfully', data: result });
}

// ── Import ──

export async function importToSadara(req: Request, res: Response) {
  const result = await saffService.importToSadara(req.body);
  res.json({
    message: 'Import completed',
    imported: result,
  });
}

// ── Stats ──

export async function getStats(req: Request, res: Response) {
  const stats = await saffService.getStats();
  res.json({ data: stats });
}
