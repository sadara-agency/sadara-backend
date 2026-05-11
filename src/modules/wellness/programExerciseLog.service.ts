import { ProgramExerciseLog } from "./programExerciseLog.model";
import { ProgramExercise } from "./developmentProgram.model";
import { DevelopmentProgram } from "./developmentProgram.model";
import { getLinkedPlayer } from "@modules/portal/portal.service";
import { AppError } from "@middleware/errorHandler";
import type { LogSetDTO } from "./programExerciseLog.validation";

async function resolvePlayerAndValidateAccess(
  userId: string,
  programId: string,
  exerciseId: string,
): Promise<{ playerId: string; programExerciseId: string }> {
  const player = await getLinkedPlayer(userId);
  const playerId: string = player.getDataValue("id") ?? (player as any).id;

  // Verify the program belongs to this player (direct or via training block)
  const program = await DevelopmentProgram.findByPk(programId, {
    attributes: ["id", "playerId", "trainingBlockId"],
  });
  if (!program) throw new AppError("Program not found", 404);

  // Check ownership: direct assignment or training-block link
  const isOwn = program.playerId === playerId;
  if (!isOwn && !program.trainingBlockId) {
    throw new AppError("Program not found", 404);
  }

  // Find the program exercise
  const pe = await ProgramExercise.findOne({
    where: { id: exerciseId, programId },
    attributes: ["id"],
  });
  if (!pe) throw new AppError("Exercise not found in this program", 404);

  return { playerId, programExerciseId: pe.id };
}

export async function logSet(
  userId: string,
  programId: string,
  exerciseId: string,
  data: LogSetDTO,
): Promise<ProgramExerciseLog> {
  const { playerId, programExerciseId } = await resolvePlayerAndValidateAccess(
    userId,
    programId,
    exerciseId,
  );

  return ProgramExerciseLog.create({
    programExerciseId,
    programId,
    playerId,
    setNumber: data.setNumber,
    actualReps: data.actualReps ?? null,
    actualWeightKg: data.actualWeightKg ?? null,
    rpe: data.rpe ?? null,
  });
}

export async function getLogsForExercise(
  userId: string,
  programId: string,
  exerciseId: string,
  limit = 30,
): Promise<ProgramExerciseLog[]> {
  const { playerId, programExerciseId } = await resolvePlayerAndValidateAccess(
    userId,
    programId,
    exerciseId,
  );

  return ProgramExerciseLog.findAll({
    where: { programExerciseId, playerId },
    order: [["loggedAt", "DESC"]],
    limit,
  });
}

export async function getLogCountsForProgram(
  playerId: string,
  programId: string,
): Promise<Record<string, number>> {
  const logs = await ProgramExerciseLog.findAll({
    where: { programId, playerId },
    attributes: ["programExerciseId"],
  });

  const counts: Record<string, number> = {};
  for (const log of logs) {
    const key = log.programExerciseId;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
