import { closeIdleSessions } from "./staffMonitoring.service";

export async function runCloseIdleSessions(): Promise<{
  closedSessions: number;
}> {
  const closed = await closeIdleSessions();
  return { closedSessions: closed };
}
