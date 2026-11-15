// pnpm demo:check (Q3): opens the demo House with every non-localhost request blocked and
// checks the stage path works offline: Choose a room → Room → Object open → first Memory.
// Uses the server on DEMO_CHECK_URL (default http://localhost:3000) if one is running in
// demo mode; otherwise starts `next dev` in demo mode for the check and stops it after.

import { type ChildProcess, spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const baseUrl = process.env.DEMO_CHECK_URL ?? "http://localhost:3000";
const token = process.env.DEMO_HOUSE_TOKEN || "demo-token";
const bundleUrl = `${baseUrl}/api/h/${token}/bundle`;

function log(ok: boolean, step: string): void {
  console.log(`${ok ? "✓" : "✗"} ${step}`);
}

async function bundleStatus(): Promise<number | null> {
  try {
    return (await fetch(bundleUrl)).status;
  } catch {
    return null;
  }
}

async function ensureServer(): Promise<ChildProcess | null> {
  const status = await bundleStatus();
  if (status === 200) return null;
  if (status !== null) {
    throw new Error(
      `A server is running on ${baseUrl} but ${bundleUrl} answers ${status}. ` +
        "Restart it with HOUSE_DEMO_MODE=true and DEMO_HOUSE_TOKEN set, and check demo-assets/bundle.json.",
    );
  }
  console.log(`No server on ${baseUrl}: starting next dev in demo mode…`);
  const child = spawn("pnpm", ["exec", "next", "dev", "-p", new URL(baseUrl).port || "3000"], {
    env: {
      ...process.env,
      HOUSE_DEMO_MODE: "true",
      DEMO_HOUSE_TOKEN: token,
      AI_MODE: "mock",
    },
    stdio: "ignore",
    detached: true,
  });
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const s = await bundleStatus();
    if (s === 200) return child;
    if (s !== null && s !== 200) {
      stop(child);
      throw new Error(
        `${bundleUrl} answers ${s}: is demo-assets/bundle.json present (or DEMO_ASSETS_DIR set)?`,
      );
    }
  }
  stop(child);
  throw new Error("Dev server did not start within 120 s");
}

function stop(child: ChildProcess | null): void {
  if (child?.pid) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
}

async function main(): Promise<number> {
  const server = await ensureServer();
  const browser = await chromium.launch();
  let failed = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1194, height: 834 } });
    // Stage Wi-Fi may be gone: anything not served by this laptop is refused.
    const blocked = new Set<string>();
    await page.route("**/*", (route) => {
      const host = new URL(route.request().url()).hostname;
      if (host === "localhost" || host === "127.0.0.1") return route.continue();
      blocked.add(host);
      return route.abort("internetdisconnected");
    });

    const step = async (name: string, run: () => Promise<unknown>) => {
      if (failed) return;
      try {
        await run();
        log(true, name);
      } catch {
        failed = true;
        log(false, name);
      }
    };

    await step("Choose a room", async () => {
      await page.goto(`${baseUrl}/house/${token}`);
      await page.getByTestId("room-card").first().waitFor({ timeout: 90_000 });
    });
    await step("Room", async () => {
      await page.getByTestId("room-card").first().click();
      await page.getByTestId("room-scene").waitFor({ timeout: 10_000 });
    });
    await step("Object open", async () => {
      await page.locator("[data-testid=room-object][data-available=true]").first().click();
      await page.getByTestId("polaroid").first().waitFor({ timeout: 10_000 });
    });
    await step("First Memory playing", async () => {
      // No tap: the first Memory starts by itself after 3 s.
      await page.getByTestId("memory-player").waitFor({ timeout: 10_000 });
    });
    if (blocked.size > 0) console.log(`  (blocked outside requests: ${[...blocked].join(", ")})`);
  } finally {
    await browser.close();
    stop(server);
  }
  console.log(failed ? "demo:check FAILED" : "demo:check passed: the House plays offline.");
  return failed ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  },
);
