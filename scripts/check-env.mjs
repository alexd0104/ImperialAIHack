#!/usr/bin/env node
// `pnpm env:check`: validates .env.local without ever printing a value, so humans and
// agents can share the output safely. Exit 1 if something required is missing or invalid.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const LOCAL = ".env.local";
const EXAMPLE = ".env.example";

// Rules for variables that code depends on today (TECHNICAL.md §11). Add a rule with the
// feature that starts reading a variable.
const RULES = {
  AI_MODE: { required: true, check: (v) => ["mock", "live"].includes(v), hint: "mock or live" },
  STUDIO_PASSWORD: { required: true, check: (v) => v.length > 0, hint: "any non-empty password" },
  SESSION_SECRET: {
    required: true,
    check: (v) => v.length >= 32,
    hint: "32+ chars, e.g. node -e \"console.log(crypto.randomBytes(32).toString('base64url'))\"",
  },
  // F4: Studio needs the DB; House demo mode does not, so these are not required.
  MONGODB_URI: {
    required: false,
    check: (v) => /^mongodb(\+srv)?:\/\//.test(v),
    hint: "mongodb+srv://… from Atlas (Connect → Drivers)",
  },
  MONGODB_DB: {
    required: false,
    check: (v) => /^mh_[a-z]+$/.test(v),
    hint: "your own DB: mh_timote | mh_alexandre | mh_yasir | mh_raphael | mh_demo",
  },
  OWNER_ZONE: {
    required: false,
    check: (v) => ["pipeline", "studio", "house", "design"].includes(v),
    hint: "pipeline | studio | house | design",
  },
  // F7 (contracts v2): optional, code falls back to "text" and lab off.
  SOUND_MODE_DEFAULT: {
    required: false,
    check: (v) => ["clip", "text"].includes(v),
    hint: "text (ambience from the sound prompt) or clip (keep the clip's own audio)",
  },
  ENABLE_LAB: {
    required: false,
    check: (v) => ["true", "false"].includes(v),
    hint: "true to show the creation-method lab in the Studio",
  },
};

function load(path) {
  return existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : null;
}

const local = load(LOCAL);
const example = load(EXAMPLE) ?? {};

if (!local) {
  console.error(`✗ ${LOCAL} not found. Run: cp ${EXAMPLE} ${LOCAL}, then fill in the values.`);
  process.exit(1);
}

let failed = false;
for (const [name, rule] of Object.entries(RULES)) {
  const value = local[name] ?? "";
  if (!value) {
    if (rule.required) failed = true;
    console.log(`${rule.required ? "✗" : "·"} ${name}: missing (${rule.hint})`);
  } else if (!rule.check(value)) {
    failed = true;
    console.log(`✗ ${name}: invalid (${rule.hint})`);
  } else {
    console.log(`✓ ${name}`);
  }
}

const notInLocal = Object.keys(example).filter((name) => !(name in local) && !(name in RULES));
if (notInLocal.length) console.log(`· in ${EXAMPLE} but not in ${LOCAL}: ${notInLocal.join(", ")}`);
const notInExample = Object.keys(RULES).filter((name) => !(name in example));
if (notInExample.length) console.log(`! missing from ${EXAMPLE}: ${notInExample.join(", ")}`);

process.exit(failed ? 1 : 0);
