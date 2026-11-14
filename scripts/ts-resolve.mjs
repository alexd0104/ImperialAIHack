// Lets plain Node (type stripping) run scripts that import app code written for
// Next's bundler: maps "@/x" to the repo root and adds the missing ".ts" /
// "/index.ts" to extensionless relative imports. Avoids adding tsx as a dependency.
// Use: node --import ./scripts/ts-resolve.mjs --conditions=react-server script.mts
import { existsSync, statSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

if (!globalThis.__mhTsResolveHook) {
  globalThis.__mhTsResolveHook = true;
  register(import.meta.url);
}

const root = pathToFileURL(`${fileURLToPath(new URL("..", import.meta.url))}`).href;
const CANDIDATES = ["", ".ts", ".tsx", "/index.ts"];

function isFile(url) {
  const p = fileURLToPath(url);
  return existsSync(p) && statSync(p).isFile();
}

export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith("@/")) base = new URL(specifier.slice(2), root).href;
  else if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:")
  )
    base = new URL(specifier, context.parentURL).href;
  if (base) {
    for (const suffix of CANDIDATES) {
      const url = base + suffix;
      if (isFile(url)) return next(url, context);
    }
  }
  return next(specifier, context);
}

// The bundler imports JSON without `with { type: "json" }`; Node requires it.
export async function load(url, context, next) {
  if (url.endsWith(".json") && !context.importAttributes?.type) {
    return next(url, {
      ...context,
      importAttributes: { ...context.importAttributes, type: "json" },
    });
  }
  return next(url, context);
}
