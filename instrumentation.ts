/**
 * Runs once per server process (Next.js `register`). Starts the job ticker on
 * the Node.js runtime only; the ticker guards itself against hot reloads.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startTicker } = await import("./lib/jobs/ticker");
  startTicker();
}
