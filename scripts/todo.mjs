// Placeholder for scripts listed in AGENTS.md §5 that are built by later tasks.
// Exits 0 so the command exists and never breaks a teammate's workflow.
const owners = {
  demo: "Q2/Q3: build + seed demo + start in production mode",
  "demo:check": "Q3: House in demo mode with the network blocked",
  "seed:demo": "design zone: create the demo House from demo-assets/",
  "export:demo": "design zone: regenerate demo-assets/bundle.json",
};

const name = process.argv[2] ?? "unknown";
console.log(
  `TODO: \`pnpm ${name}\` is not implemented yet (${owners[name] ?? "see FEATURES.md"}).`,
);
process.exit(0);
